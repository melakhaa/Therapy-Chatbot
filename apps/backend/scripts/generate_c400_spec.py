import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
os.chdir(os.path.dirname(HERE))
import ast, json, re, datetime
import main

spec = main.app.openapi()

def router_prefixes(tree):
    pref = {}
    for n in ast.walk(tree):
        if isinstance(n, ast.Assign) and isinstance(n.value, ast.Call):
            f = n.value.func
            if isinstance(f, ast.Name) and f.id == 'APIRouter':
                p = ''
                for k in n.value.keywords:
                    if k.arg == 'prefix': p = ast.literal_eval(k.value)
                for t in n.targets:
                    if isinstance(t, ast.Name): pref[t.id] = p
    return pref

AUTH_ROLES = {
 'admin_access': 'admin',
 'operator_access': 'konselor, admin, or pemangku_jabatan',
 'directory_access': 'admin or pemangku_jabatan',
 'counselor_access': 'konselor',
 'student_access': 'mahasiswa',
}
ERROR_TEXT = {
 '400': 'Bad Request', '401': 'Unauthorized', '403': 'Forbidden', '404': 'Not Found',
 '409': 'Conflict', '410': 'Gone', '422': 'Unprocessable Entity', '429': 'Too Many Requests',
 '500': 'Internal Server Error', '503': 'Service Unavailable',
}

def sql_writes(node):
    tables = []
    for sub in ast.walk(node):
        if isinstance(sub, ast.Constant) and isinstance(sub.value, str):
            s = " ".join(sub.value.split())
            for m in re.finditer(r'\b(insert into|update|delete from)\s+([a-z_]+)', s, re.I):
                if m.group(2) not in tables: tables.append(m.group(2))
    return tables

astmap = {}
for fn in sorted(os.listdir('routes')):
    if not fn.endswith('.py') or fn == '__init__.py': continue
    tree = ast.parse(open('routes/'+fn).read())
    pref = router_prefixes(tree)
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)): continue
        for d in node.decorator_list:
            if not isinstance(d, ast.Call) or not isinstance(d.func, ast.Attribute): continue
            m = d.func.attr
            if m not in ('get','post','put','patch','delete'): continue
            recv = d.func.value
            base = pref.get(recv.id, '') if isinstance(recv, ast.Name) else ''
            path = base + ast.literal_eval(d.args[0])
            deps = []
            allargs = node.args.args
            nd = len(node.args.defaults)
            defaults = {a.arg: ast.unparse(v) for a, v in zip(allargs[len(allargs)-nd:], node.args.defaults)}
            for a in allargs:
                mm = re.match(r"Depends\((.*)\)$", defaults.get(a.arg, ''))
                if mm: deps.append(mm.group(1))
            errors = set()
            for sub in ast.walk(node):
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name) and sub.func.id == 'HTTPException':
                    v = sub.args[0] if sub.args else None
                    if isinstance(v, ast.Constant): errors.add(str(v.value))
                    for k in sub.keywords:
                        if k.arg == 'status_code':
                            errors.add(ast.unparse(k.value).replace('status.HTTP_', '').replace('_', ' '))
            astmap[(m.upper(), path)] = dict(
                deps=deps, errors=sorted(errors), doc=(ast.get_docstring(node) or ''),
                writes=sql_writes(node), streams='StreamingResponse' in ast.unparse(node),
                background='BackgroundTasks' in ast.unparse(node), file=fn)

for (m, p) in [('GET','/'),('GET','/health'),('GET','/guardrail/hotline')]:
    astmap.setdefault((m,p), dict(deps=[], errors=[], doc='', writes=[], streams=False, background=False, file='main.py'))

def auth_text(deps):
    if not deps: return "Public — no token required."
    parts = []
    for d in deps:
        if d == 'get_current_user': parts.append("Bearer JWT, any authenticated role (operates on the caller's own data)")
        elif d in AUTH_ROLES: parts.append(f"Bearer JWT, role {AUTH_ROLES[d]}")
        elif d.startswith("require_role("):
            roles = re.findall(r"'([^']+)'", d)
            parts.append("Bearer JWT, role " + " or ".join(roles))
        else: parts.append(f"Bearer JWT via `{d}`")
    return "; ".join(parts) + "."

def dep_errors(deps):
    if not deps: return []
    return ['401', '403'] if any(d != 'get_current_user' for d in deps) else ['401']

def type_text(schema, schemas):
    if not schema: return None
    ref = schema.get('$ref')
    if ref: return f"`{ref.split('/')[-1]}`"
    if 'anyOf' in schema:
        return " or ".join(t for t in (type_text(x, schemas) for x in schema['anyOf']) if t)
    t = schema.get('type')
    fmt = schema.get('format')
    if t == 'array':
        return f"array<{type_text(schema.get('items', {}), schemas)}>"
    if t == 'object': return 'object'
    if t: return f"{t} ({fmt})" if fmt else t
    return fmt or 'string'

SAMPLES = {'string': 'value', 'integer': '1', 'boolean': 'false', 'number': '1.0'}

def sample_value(schema, name):
    if 'enum' in schema: return str(schema['enum'][0]).lower() if isinstance(schema['enum'][0], bool) else str(schema['enum'][0])
    if schema.get('default') is not None:
        d = schema['default']
        return str(d).lower() if isinstance(d, bool) else str(d)
    fmt = schema.get('format')
    if fmt == 'uuid': return '11111111-1111-4111-8111-111111111111'
    if fmt == 'date': return '2026-01-31'
    if fmt == 'date-time': return '2026-01-31T09:00:00+07:00'
    if fmt == 'email': return 'student@example.test'
    t = schema.get('type', 'string')
    return {'string': name, 'integer': '1', 'boolean': 'false', 'number': '1.0'}.get(t, 'value')

def example_expr(schema, schemas, depth=0):
    if '$ref' in schema:
        ref = schema['$ref'].split('/')[-1]
        if depth > 2: return '{}'
        return example_object(schemas[ref], schemas, depth + 1)
    if 'anyOf' in schema:
        real = [x for x in schema['anyOf'] if x.get('type') != 'null'] or schema['anyOf']
        return example_expr(real[0], schemas, depth)
    t = schema.get('type')
    if t == 'array': return [example_expr(schema.get('items', {}), schemas, depth)]
    if t == 'object':
        return {k: example_expr(v, schemas, depth) for k, v in schema.get('properties', {}).items()}
    v = sample_value(schema, 'value')
    numeric = {'integer': int, 'number': float}
    if t in numeric:
        return numeric[t](v)
    if t == 'boolean':
        return v == 'true'
    return v

def example_object(schema, schemas, depth=0):
    return {k: example_expr(v, schemas, depth) for k, v in schema.get('properties', {}).items()}

def url_value(schema, name):
    """Placeholder or literal that belongs in a URL, so examples are honest."""
    if 'enum' in schema and schema['enum']:
        return str(schema['enum'][0])
    fmt = schema.get('format')
    if fmt == 'uuid': return '11111111-1111-4111-8111-111111111111'
    if fmt == 'date': return '2026-01-31'
    if fmt == 'date-time': return '2026-01-31T09:00:00+07:00'
    if schema.get('default') not in (None, '', [], {}):
        d = schema['default']
        return str(d).lower() if isinstance(d, bool) else str(d)
    if schema.get('type') == 'boolean': return 'false'
    if schema.get('type') in ('integer', 'number'): return '1'
    return f"<{name}>"

def example_url(op, schemas):
    path = op['path']
    for p in op['params']:
        if p['loc'] == 'path':
            path = path.replace('{' + p['name'] + '}', url_value(p['schema'], p['name']))
    qs = [p for p in op['params'] if p['loc'] == 'query']
    chosen = [p for p in qs if p['req']] or qs[:2]
    if chosen:
        path += '?' + '&'.join(f"{p['name']}={url_value(p['schema'], p['name'])}" for p in chosen)
    return path

def constraints(schema):
    bits = []
    if 'enum' in schema: bits.append("allowed: " + ", ".join(f"`{v}`" for v in schema['enum']))
    if schema.get('default') is not None: bits.append(f"default `{schema['default']}`")
    if 'minimum' in schema: bits.append(f"≥ {schema['minimum']}")
    if 'maximum' in schema: bits.append(f"≤ {schema['maximum']}")
    if 'maxLength' in schema: bits.append(f"≤ {schema['maxLength']} chars")
    if 'minLength' in schema: bits.append(f"≥ {schema['minLength']} chars")
    return "; ".join(bits)

schemas = spec['components']['schemas']
ops = []
for p, item in spec['paths'].items():
    for m, op in item.items():
        if m not in ('get','post','put','patch','delete'): continue
        a = astmap.get((m.upper(), p), {})
        body = None
        rb = op.get('requestBody', {}).get('content', {})
        for mt, meta in rb.items():
            body = (mt, meta.get('schema', {}))
        success = {c: r for c, r in op.get('responses', {}).items() if not c.startswith('4') and c != '422'}
        ops.append(dict(method=m.upper(), path=p, tag=op['tags'][0], summary=op.get('summary') or op.get('operationId'),
            params=[dict(name=x['name'], loc=x['in'], req=x.get('required', False), schema=x.get('schema', {}), desc=x.get('description','')) for x in op.get('parameters', [])],
            body=body, success=sorted(success), errors=a.get('errors', []), deps=a.get('deps', []),
            doc=a.get('doc',''), writes=a.get('writes', []), streams=a.get('streams'), background=a.get('background'), file=a.get('file','')))

METHOD_ORDER = {'GET':0,'POST':1,'PUT':2,'PATCH':3,'DELETE':4}
families = [(t['name'], t.get('description','')) for t in main.app.openapi_tags]
grouped = {name: [] for name, _ in families}
for op in ops: grouped[op['tag']].append(op)
for name in grouped: grouped[name].sort(key=lambda o: (o['path'], METHOD_ORDER[o['method']]))

def esc(s): return (s or '').replace('|', '\\|')

def first_sentence(text):
    text = " ".join((text or '').split())
    if not text: return ''
    m = re.match(r'(.+?[.!?])(\s|$)', text)
    return m.group(1) if m else text

lines = []
w = lines.append
today = datetime.date.today().isoformat()
w("# Sajiwa API Specification (C400)")
w("")
w(f"Generated from the application-generated OpenAPI contract on {today}. "
  "This document describes the API as it exists; it does not change routes, parameters, or behavior.")
w("")
w("**Status:** draft for C400 review. The report template, wording, and final section location are still to be confirmed by the lecturer.")
w("")
w("## 1. Scope and source")
w("")
w("The source of truth is the OpenAPI document produced by the FastAPI application registered in "
  "`apps/backend/main.py`. The WebSocket route is described from `apps/backend/routes/realtime.py`, "
  "because OpenAPI does not represent WebSockets as HTTP operations.")
w("")
w("Framework documentation routes (`/docs`, `/redoc`, `/openapi.json`) are not business operations and are excluded.")
w("")

counts = {}
for op in ops: counts[op['method']] = counts.get(op['method'], 0) + 1
w("## 2. Inventory summary")
w("")
w("| Measure | Count | Counting rule |")
w("|---|---:|---|")
w(f"| HTTP operations | {len(ops)} | One method + one path template. |")
w(f"| Distinct path templates | {len(spec['paths'])} | Shared paths with several methods counted once. |")
for m in ['GET','POST','PUT','PATCH','DELETE']:
    w(f"| {m} | {counts.get(m,0)} | {'Read operations.' if m=='GET' else 'Write or action operations.'} |")
w("| WebSocket routes | 1 | `/realtime`, outside the OpenAPI HTTP count. |")
w(f"| Total application operations | {len(ops)+1} | HTTP operations plus the WebSocket. |")
w(f"| Documentation groups | {len(families)} | Report/ReDoc navigation groups, not endpoints. |")
w("")
w("## 3. Reading the specification")
w("")
w("| Term | Meaning |")
w("|---|---|")
w("| HTTP method | The operation performed at a URL. Different methods at one path are different operations. |")
w("| Path parameter | A required value occupying a URL segment, written `{name}`. It is part of the address, not a query input. |")
w("| Query parameter | A named input after `?`, assigned with `=` and separated with `&`. Optional unless marked required. |")
w("| Request body | Structured JSON input sent in the body of a create/update request. |")
w("| Documentation group | A report/ReDoc heading collecting related operations. It is not necessarily a callable URL. |")
w("")
w("**Authentication.** Protected operations expect `Authorization: Bearer <token>`. The token is a JWT; the role is "
  "resolved from the database on every request, never from the token alone. Roles are `mahasiswa`, `konselor`, "
  "`admin`, and `pemangku_jabatan`.")
w("")
w("**Validation errors.** Any operation with a declared body or parameter can answer `422 Unprocessable Entity` "
  "from FastAPI's request validation, in addition to the statuses listed per operation.")
w("")
w("**Response bodies.** The handlers do not declare `response_model`s, so success responses are JSON objects produced "
  "by each handler rather than a fixed, documented schema. This specification records the status codes, inputs, and "
  "side effects; the response fields are part of the handler code.")
w("")
w("## 4. Resource families")
w("")
w("The overview keeps one row per resource family. Every method and subpath is expanded in section 5, so the overview "
  "stays short without hiding operations.")
w("")
w("| No. | Group | HTTP operations | Distinct paths | Purpose |")
w("|---:|---|---:|---:|---|")
for i, (name, desc) in enumerate(families, 1):
    items = grouped.get(name, [])
    if not items:
        continue
    w(f"| {i} | {name} | {len(items)} | {len({o['path'] for o in items})} | {esc(desc)} |")
w(f"| {len(families)} | Realtime (`/realtime`) | — (1 WebSocket) | — | Push notification of changed dashboard data. |")
w("")
w("### 4.1 Endpoint per family")
w("")
w("Each overview row above expands to these endpoints. A path with two methods counts as two operations. "
  "The function is the handler's declared summary.")
w("")
w("| Family | Endpoint | Fungsi |")
w("|---|---|---|")
for name, desc in families:
    items = grouped.get(name, [])
    if not items: continue
    for op in items:
        w(f"| {name} | `{op['method']} {op['path']}` | {esc(op['summary'])} |")
w("| Realtime | `WS /realtime` | Push notification of changed dashboard data. |")
w("")
w("## 5. Operations by family")
w("")
w("Each operation lists the fields the C400 template requires. `—` means the contract declares nothing for that "
  "field, not that the handler does no validation.")
w("")
number = 0
for name, desc in families:
    items = grouped.get(name, [])
    if not items: continue
    w(f"### {name}")
    w("")
    if desc: w(f"{desc}")
    w("")
    for op in items:
        number += 1
        w(f"#### {number}. {op['method']} `{op['path']}`")
        w("")
        w(f"**{esc(op['summary'])}**")
        w("")
        w("| Field | Detail |")
        w("|---|---|")
        w(f"| Authentication and authorization | {esc(auth_text(op['deps']))} |")
        pp = [f"`{p['name']}` ({type_text(p['schema'], schemas)}{', required' if p['req'] else ', optional'})" for p in op['params'] if p['loc'] == 'path']
        qp = []
        for p in op['params']:
            if p['loc'] != 'query': continue
            extra = constraints(p['schema'])
            qp.append(f"`{p['name']}` ({type_text(p['schema'], schemas)}{', required' if p['req'] else ', optional'}{'; '+extra if extra else ''})")
        w(f"| Path parameters | {'; '.join(pp) if pp else '—'} |")
        w(f"| Query parameters | {'; '.join(qp) if qp else '—'} |")
        if op['body']:
            mt, schema = op['body']
            w(f"| Request body | `{mt}` — schema {type_text(schema, schemas)} (fields and example in section 6) |")
        else:
            w("| Request body | — |")
        w(f"| Success response | {'; '.join(op['success']) or '—'} |")
        errs = sorted({e for e in op['errors'] if e.isdigit() and e not in op['success']})
        notes = []
        if errs:
            notes.append("Declared handler errors: " + ", ".join(f"{e} ({ERROR_TEXT.get(e, '')})".strip() for e in errs))
        de = dep_errors(op['deps'])
        if de: notes.append("dependency errors: " + ", ".join(de))
        w(f"| Error responses | {'; '.join(notes) if notes else '422 validation only'} |")
        if any(p['loc'] == 'query' for p in op['params']):
            w(f"| Example URL | `{op['method']} {example_url(op, schemas)}` |")
        side = []
        if op['writes']:
            side.append("Writes to " + ", ".join(f"`{t}`" for t in op['writes']) + ".")
        elif op['method'] == 'GET':
            side.append("Read-only.")
        docline = first_sentence(op['doc'])
        if docline: side.append(esc(docline))
        if op['streams']: side.append("Streams the response body.")
        if op['background']: side.append("Schedules background work after responding.")
        w(f"| Side effects and notes | {' '.join(side) if side else '—'} |")
        w("")

w("## 6. Request schemas")
w("")
w("Field tables for every schema referenced by a request body. Required fields are marked `yes`.")
w("")
NOISE = {'HTTPValidationError', 'ValidationError'}
for sname in sorted(schemas):
    sch = schemas[sname]
    if sname in NOISE or sname.startswith('Body_'): continue
    if sch.get('type') != 'object': continue
    props = sch.get('properties', {})
    if not props: continue
    required = set(sch.get('required', []))
    w(f"### `{sname}`")
    w("")
    w("| Field | Type | Required | Constraints |")
    w("|---|---|---|---|")
    for fname, fs in props.items():
        w(f"| `{fname}` | {type_text(fs, schemas)} | {'yes' if fname in required else 'no'} | {esc(constraints(fs)) or '—'} |")
    w("")
    w("```json")
    w(json.dumps(example_object(sch, schemas), indent=2, ensure_ascii=False))
    w("```")
    w("")

w("## 7. Realtime WebSocket")
w("")
w("| Field | Detail |")
w("|---|---|")
w("| Transport | WebSocket, not an HTTP operation; not shown in OpenAPI/ReDoc. |")
w("| Path | `/realtime` |")
w("| Authentication | Token is sent in the first message after connecting. |")
w("| Authorization | Listener roles only (`konselor`, `admin`, `pemangku_jabatan`). |")
w("| Payloads | Change notices that tell the dashboard which area to refetch over REST. |")
w("| Purpose | Keeps the dashboard current without polling; the REST routes remain the data source. |")
w("")
w("## 8. Legacy and internal endpoints")
w("")
w("`Jadwal (legacy)` and `Booking (legacy)` are superseded by the counseling request/appointment flow in "
  "`Counseling` and `Admin: Counseling`. They remain documented and callable for existing clients and should not be "
  "removed without a separately approved API change.")
w("")
w("## 9. Verification")
w("")
w("The operation set is guarded by `apps/backend/tests/unit/test_openapi_contract.py`: it pins every method/path pair "
  "and requires each operation to carry exactly its approved family tag. Documentation work must not change the "
  "inventory; an inventory change is an API change and needs its own approval and tests.")
w("")

open(os.path.join(HERE, '..', '..', '..', 'docs', 'c400-api-specification.md'), 'w').write("\n".join(lines) + "\n")
print("ops", len(ops), "families", len(families), "schemas", len(schemas))
print("counts", counts)
