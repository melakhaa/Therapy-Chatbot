# PLAN — real chat sessions + LLM memory

Working implementation plan, tracked in-repo (root `AGENTS.md` stays the index; this is a
plan, not a convention doc). Written against `main` at `68d3920` (post PR #15) — every file
and line reference below was verified against that revision.

Goal: `session_id` becomes a real entity, Hana sees conversation history, and crisis
content never reaches the LLM.

## Status

| Phase | State |
|---|---|
| 0 — `sessions` table + FK | **done** |
| 1 — prompt memory | **done** |
| 2 — session pointer + `/chat/history` | **done** |
| 3 — real streaming | **done** — `llm.stream` in `core.chat_stream`, SSE read via `expo/fetch` |
| 4 — crisis text out of plaintext | **done** |
| 5 — fail loudly without Ollama | **done** — dead `MockEncoder` deleted; the existing crash is now documented |

Verified: `db/test_rls.sql` passes, 25 unit tests pass (`tests/test_chat_history.py` covers the
crisis filter in `load_history`), `scripts/api_smoke.py` ALL PASSED against a live stack, and a
manual two-turn check confirmed the follow-up "siapa namaku?" is answered from history.

Also verified through the real UI (Expo web on :8081 driven with betterwright): after a full page
reload the transcript is refetched from `GET /chat/history` and rendered instead of a fresh
greeting, and a second UI turn answered from history. Still unverified: the **native** path — the
web build takes the `localStorage` branch of `Platform.OS`, so `AsyncStorage` on device is untested,
as is the crisis alert modal in the UI.

Deviations from the plan below:

- **Phase 3 was worth doing**: `expo/fetch` streams on native and is `globalThis.fetch` on web, so the
  platform risk the plan worried about did not materialise.
- **Phase 5 needed no ENV flag.** The plan offered "delete the fallback, or gate it behind `ENV=dev`".
  The fallback turned out to be unreachable: `OllamaEncoder()` does not raise at construction, so the
  `except` never fired. What actually happens is that `SemanticRouter(...)` embeds route utterances at
  import, so a dead Ollama raises there and the backend refuses to start. The code already failed
  loudly — only the dead class and three lying doc claims needed removing.
- Generation has **one** code path: `core.chat_stream` yields tokens, `chat()` is it joined, and
  `/chat` + `/chat/stream` both route through it. `get_conversational_response` /
  `get_rag_response` are gone; prompt building is `build_messages()` in each module.

- `sessions` has no counselor/admin read policy — nothing reads session metadata yet. Add it when
  a dashboard endpoint actually lists sessions.
- `messages` carries a composite FK `(session_id, user_id) → sessions` and `user_id` is now
  `not null`, so a message cannot be attached to another student's session at all.
- The history loader lives in `services/chatbot/history.py`, not `core.py`: importing `core.py`
  builds the semantic router (needs Ollama + `ENCRYPTION_KEY`), which would have made the unit
  test violate the suite's "no DB/AI" contract.
- `/chat` writes session row + optional crisis log + both turns in one transaction (`_persist_turn`).

Migration story: the schema is the source of truth in `db/init/*.sql` and is applied by
`docker compose up` on an empty volume (`docs/project-conventions.md`, and the wipe procedure
is spelled out in `apps/backend/AGENTS.md`), so Phase 0 means **wiping the local dev DB**
(`down -v`). That also destroys the ingested `documents` vectors → re-run `scripts/embed.py`.
No production data exists, so no migration framework.

Order is dependency-driven: 0 → 1 → 2 → 3 → 4 → 5.

---

## Phase 0 — schema: make `sessions` real

**Files:** `db/init/01_schema.sql`, `db/test_rls.sql`

Today (`01_schema.sql:192`): *"chat: sessions are client-generated ids, so only messages are
stored"*. Replace that comment and add, above `messages`:

```sql
create table if not exists sessions (
  session_id  text primary key,
  user_id     uuid not null references users(user_id) on delete cascade,
  title       text,                                  -- first user message, truncated
  started_at  timestamptz default now(),
  ended_at    timestamptz
);

create index if not exists idx_sessions_user_id    on sessions(user_id);
create index if not exists idx_sessions_started_at on sessions(started_at desc);

alter table sessions enable row level security;

create policy "mahasiswa_own_sessions" on sessions
  for all using (app_user_id() = user_id);

create policy "konselor_admin_read_sessions" on sessions
  for select using (current_user_role() in ('konselor', 'admin', 'pemangku_jabatan'));
```

Then change `messages.session_id` to a real FK:

```sql
session_id text not null references sessions(session_id) on delete cascade,
```

**GRANTs are already covered** — `02_auth.sql:10` sets `alter default privileges ... to
sajiwa_app`, so the new table is granted automatically.

**Gotcha — FK vs existing rows.** Dev DBs already hold `messages` rows whose `session_id`
has no parent. Wiping the volume handles it. For any copy you can't wipe, backfill first:

```sql
insert into sessions (session_id, user_id)
select session_id, min(user_id) from messages group by session_id
on conflict do nothing;
```

**RLS self-check:** add to `db/test_rls.sql` — user A creates a session + message, user B
must see 0 rows from both.

**Verify:** `docker compose down -v && docker compose up -d` (`apps/backend/AGENTS.md`),
then the `db/test_rls.sql` run from `docs/development-conventions.md:59`, then re-seed users
(`scripts/seed_dev_users.py`) and re-embed (`scripts/embed.py`) — the volume wipe took
`documents` with it.

---

## Phase 1 — memory in the prompt (items 1 + 3 + 4 + 7)

The core change. Three files.

### 1a. Shared LLM client — new `services/chatbot/llm.py`

Item 7 and item 8's "two clients for the same model" collapse into one file:

```python
import os
from langchain_ollama import ChatOllama

# One client for every generation call. num_ctx caps prompt growth; timeout keeps a dead
# Ollama from parking a threadpool worker forever.
llm = ChatOllama(
    model="llama3.2:3b",
    temperature=0.6,
    num_ctx=int(os.getenv("OLLAMA_NUM_CTX", "4096")),
    keep_alive="10m",
    client_kwargs={"timeout": 60},
)
```

Delete the `llm = ChatOllama(...)` lines in `conversational.py:5` and `rag.py:30`.

### 1b. History loader — `services/chatbot/core.py`

```python
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from core.db import query
from core.security import decrypt_text

HISTORY_TURNS = 10          # messages (user+assistant), not exchanges
HISTORY_CHAR_CAP = 4000     # cheap token proxy; no tokenizer dependency

def load_history(session_id: str | None, user_id: str) -> list:
    """Last N non-crisis turns, oldest first. Never returns guardrail content."""
    if not session_id:
        return []
    rows = query(
        "select role, content from messages "
        "where session_id = %s and route_used is distinct from 'guardrail' "
        "order by created_at desc limit %s",
        (session_id, HISTORY_TURNS), user_id=user_id,
    )
    out, budget = [], HISTORY_CHAR_CAP
    for r in reversed(rows):                      # oldest first
        try:
            text = decrypt_text(r["content"])
        except Exception:
            continue                              # one bad row must not kill the request
        if len(text) > budget:
            break
        budget -= len(text)
        out.append(HumanMessage(text) if r["role"] == "user" else AIMessage(text))
    return out
```

**Two non-obvious requirements, both in the `where` clause:**
- `route_used is distinct from 'guardrail'` — `docs/ollama-conventions.md` says crisis
  content must never reach the LLM. Both rows of a crisis exchange carry that route, so
  this drops the user turn *and* the hardcoded response.
- `user_id=user_id` — RLS is the second line of defense; the id comes from the JWT, not
  the request body (`ChatRequest.user_id` is currently ignored and should stay ignored).

### 1c. `chat()` takes the route it already computed

`core.py:44` re-runs the router after `routes/chat.py:85` already ran it — 2× encoder work
per message. Signature becomes:

```python
def chat(user_message: str, session_id: str | None = None,
         user_id: str | None = None, route: str | None = None) -> str:
    route = route or (semantic_router(user_message).name or "conversational")
    if route == "guardrail":
        return HARDCODED_RESPONSE
    history = load_history(session_id, user_id)
    if route == "rag":
        return get_rag_response(user_message, history)
    return get_conversational_response(user_message, history)
```

### 1d. System prompts become `SystemMessage`

`conversational.py` — history goes between system and the new turn:

```python
def get_conversational_response(user_message: str, history: list | None = None) -> str:
    return llm.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        *(history or []),
        HumanMessage(content=user_message),
    ]).content
```

`rag.py` — same, with the retrieved context folded into the system message so retrieved
text is instructions-adjacent, not user-role:

```python
def get_rag_response(user_message: str, history: list | None = None) -> str:
    docs = retrieve_docs(user_message)
    if not docs:
        return "Maaf, saya tidak menemukan informasi terkait di dokumen."
    context = "\n---\n".join(d["content"] for d in docs)
    return llm.invoke([
        SystemMessage(content=(RAG_SYSTEM_PROMPT.format(context=context))),
        *(history or []),
        HumanMessage(content=user_message),
    ]).content
```

### 1e. Route handler passes what it already has

`routes/chat.py` `chat_unified` (`:99`) and `stream_chat_response` (`:55`) → `chat_fn(...,
session_id=request.session_id, user_id=user.id, route=route)`. Also delete
`POST /chat/history` (`:63`) — it's a duplicate of `/chat` that invokes the LLM a second
time, and nothing calls it.

**Verify:** `venv/bin/python -m unittest discover -s tests -v`, then a throwaway script that
posts three turns against a live backend and checks turn 3 answers a follow-up (the "berapa
lama?" case). Then `scripts/api_smoke.py`.

---

## Phase 2 — persist the session pointer + expose history

**Files:** `routes/chat.py`, `packages/api-client/src/{api,storage}.ts`,
`apps/mobile/hooks/useChat.ts`

### 2a. Ensure the session row exists

`POST /chat`, before inserting messages:

```python
with db(user.id) as conn:
    conn.execute(
        "insert into sessions (session_id, user_id, title) values (%s, %s, %s) "
        "on conflict (session_id) do nothing",
        (request.session_id, user.id, request.message[:80]),
    )
```

Title comes from the first message; `on conflict do nothing` makes later turns a no-op.

### 2b. Real read path — `GET /chat/history`

```python
@chat_router.get("/history")
def chat_history(session_id: str, limit: int = 50, user=Depends(get_current_user)):
    rows = query(
        "select role, content, route_used, created_at from messages "
        "where session_id = %s order by created_at asc limit %s",
        (session_id, min(limit, 200)), user_id=user.id,
    )
    ...  # decrypt_text each row, return [{role, text, created_at}]
```

Decrypt-and-return is the student's own transcript, so this is fine — but it must **not**
become an admin endpoint: `docs/project-conventions.md` requires admin operational endpoints
to never return raw chat or guardrail-trigger content. Keep the
`konselor_admin_read_sessions` policy to session metadata only.

### 2c. Device pointer

`packages/api-client/src/storage.ts` — follow the existing token pattern exactly
(`Platform.OS === 'web'` → `localStorage`, else `AsyncStorage`):

```ts
saveChatSessionId(id: string) / getChatSessionId(): Promise<string | null>
```

`useChat.ts:53` becomes an effect that loads/creates the id; start a **new** session only
when the user explicitly taps "new chat". Add `apiChatHistory` to `api-client/src/api.ts`
and load the transcript on mount instead of `pickGreeting()`.

**Verify:** reload the app mid-conversation — same `session_id` reused, transcript restored,
and the DB has exactly one `sessions` row.

---

## Phase 3 — real streaming (item 5)

`/chat/stream` (`chat.py:53`) currently computes the whole answer, then `split(" ")`s it —
no TTFT win. Replace with `llm.astream`:

```python
def generate():
    full = []
    for chunk in llm.astream([SystemMessage(...), *history, HumanMessage(msg)]):
        full.append(chunk.content)
        yield f"data: {json.dumps({'token': chunk.content})}\n\n"
    yield "data: [DONE]\n\n"
    # persist only after the stream completes, in one insert
```

Routing/guardrail stay pre-stream (crisis must not be generated, and its response is fixed
and short — send it as one token batch).

**Decision needed before this phase:** React Native's `fetch` does not expose a response
body stream. Expo SDK 54 ships `expo/fetch` with `ReadableStream` support — either use that,
or fall back to `XMLHttpRequest` progressive reads. **Recommendation: skip Phase 3** unless
TTFT is actually a complaint; it's the most code and the most platform risk for the least
correctness gain.

**Verify:** `curl -N` the endpoint and watch tokens arrive before the response ends.

---

## Phase 4 — stop storing crisis text in plaintext (item 6)

Root cause, not symptom: `assessment.py:111` never uses the `source` column
(`01_schema.sql:218` declares it) and instead smuggles `[ASSESSMENT]` into
`triggered_input`, which is why `admin_operations.py:53` has to `LIKE` against plaintext.

This violates the `docs/project-conventions.md` non-negotiable *"Never log or store raw chat
content — it is Fernet-encrypted"* (see also `docs/security-conventions.md`). Two changes:

1. `chat.py:94` → `encrypt_text(request.message)`; `assessment.py:111-112` → pass
   `source='assessment'` and replace the `[ASSESSMENT] ...` payload with something
   non-identifying (the score is also in `assessments`).
2. `admin_operations.py:53` classification → `case when g.assessment_id is not null or
   g.source = 'assessment' ...`, keeping the `triggered_input like '[ASSESSMENT]%'` clause
   **only** for legacy rows.

**Verify:** trigger a crisis via `/chat`, then confirm the stored column doesn't contain the
message text: `select triggered_input from guardrail_logs order by notified_at desc limit 1`.
Re-run the attention endpoint and confirm both signal types still classify correctly.

---

## Phase 5 — fail loudly instead of degrading (item 8)

`core.py:14` catches every exception and swaps in a `MockEncoder` returning a zero vector, so
"Ollama isn't running" silently becomes "everything routes the same way". Delete the
fallback; let import fail, or gate it behind an explicit `ENV=dev` flag. Ollama down is a
broken deployment, not a degraded one, and the mobile client already renders a fallback
message when the API errors.

**Verify:** stop Ollama, `uvicorn` should refuse to start (or `/chat` should 5xx) rather
than return confident nonsense.

---

## Summary

| Phase | Files touched | Why |
|---|---|---|
| 0 | `01_schema.sql`, `test_rls.sql` | session becomes a real row |
| 1 | `core.py`, `conversational.py`, `rag.py`, `llm.py` (new), `routes/chat.py` | the actual memory fix |
| 2 | `routes/chat.py`, `api-client/{api,storage}.ts`, `useChat.ts` | session survives reload, history is readable |
| 3 | `routes/chat.py`, `useChat.ts` | TTFT — **probably skip** |
| 4 | `routes/chat.py`, `assessment.py`, `admin_operations.py` | plaintext crisis text |
| 5 | `core.py` | silent degradation |

**Do 0 + 1 + 2 together** — they're one coherent change and 1 is useless alone without 0.
4 is small, independent, and a real privacy bug: worth doing immediately regardless.
3 and 5 are optional.

### Open questions

1. **`num_ctx`** — llama3.2:3b default context is small. 10 turns + RAG context may exceed
   it and Ollama truncates silently. Start at 4096, measure, then lower `HISTORY_TURNS`
   rather than raising `num_ctx` (memory cost on a local box).
2. **Session lifetime** — does a session end on app close, or persist until the user taps
   "new chat"? `ended_at` implies the latter. Needs a product decision, not a code one.
3. **Streaming** — is TTFT an actual complaint? Decides Phase 3.
4. **Counselor visibility** — sessions are RLS-scoped to the student, so the dashboard sees
   metadata only. Confirm that's the intended product behavior before Phase 2 ships.
