# PostgreSQL conventions

Database is **PostgreSQL 17 + pgvector**, run locally by Docker (`docker-compose.yml`). Access is
through **psycopg 3 with hand-written SQL, no ORM**. Schema, RLS, and pgvector topics live here;
container lifecycle is in [docker-conventions.md](docker-conventions.md).

## Schema source of truth

- **`db/init/01_schema.sql`** — tables, indexes, RLS policies, `match_documents()`.
- **`db/init/02_auth.sql`** — `sanctuary_app` role, `password_hash`, `password_resets`,
  `auth_lookup()`, `set_password()`.
- Applied by `docker compose up` on an empty volume, in filename order. There is no migration
  framework: to change the schema, edit the file and `docker compose down -v && docker compose up -d`.

## Extensions

```sql
create extension if not exists vector;     -- pgvector, documents.embedding
create extension if not exists pgcrypto;   -- gen_random_uuid() etc.
```

## Tables

| Table | Purpose |
|-------|---------|
| `users` | Account + `role` + `password_hash` (oauth was removed with Supabase) |
| `assessments` | PHQ-9 / GAD-7 / SRQ results, `score`, `severity` |
| `guardrail_logs` | High-risk trigger log (chat + assessments) |
| `messages` | Encrypted chat turns (`route_used`); `session_id` is client-generated text |
| `documents` | RAG chunks: `content`, `embedding vector(768)`, `metadata` |
| `hotline` | Crisis contact list |
| `journals` | Private student journal entries |
| `jadwal_konsultasi` | Counselor availability slots |
| `booking_konsultasi` | Student bookings |
| `password_resets` | OTP reset codes (bcrypt hash, 15 min expiry) |

## Conventions

- `snake_case` for every table and column.
- Primary keys: surrogate UUIDs with table-prefixed names (`assessment_id`, `journal_id`,
  `booking_id`, `log_id`, `user_id`, `message_id`), `default gen_random_uuid()`.
- Timestamps: `timestamptz default now()`; mutable rows use `updated_at` maintained by a
  `set_updated_at()` trigger.
- Enumerated columns use `check` constraints, e.g. `role in (...)`, `severity in (...)`.
  Roles `mahasiswa | konselor | admin | pemangku_jabatan`; severity `minimal | mild | moderate | severe`.
- `users` is the root identity table; child tables reference `users(user_id)`. There is no
  `auth.users`.
- Booking side effects (`jadwal` → `dipesan` / back to `tersedia`) are `SECURITY DEFINER` triggers,
  because the student who books cannot update the counselor's slot row directly.
- Vector search: `documents.content`, `documents.embedding vector(768)`, `documents.metadata jsonb`;
  HNSW index; queries via `match_documents(query_embedding, match_threshold, match_count)`.

## Row Level Security

- RLS is enabled on every table. The backend connects as the **non-superuser** role
  `sanctuary_app`; `sanctuary` is a superuser and bypasses RLS entirely, so never point
  `DATABASE_URL` at it.
- Request identity is set per transaction by `core/db.py`:
  ```python
  with db(user.id) as conn:          # conn = one transaction, RLS identity set
      conn.execute("...", (...))
  ```
  which runs `select set_config('app.current_user_id', <uuid>, true)`.
- Policies read it through `app_user_id()`; policies that need a role call
  `current_user_role()`, which is `SECURITY DEFINER` to avoid infinite recursion on `users`.
- Anonymous requests have an empty setting, so `app_user_id()` is `NULL` and only `using (true)`
  policies (public `hotline`, `documents` reads, `password_resets`) match.
- **Never build SQL by string concatenation.** Pass parameters (`%s`); `ORDER BY`/column names must
  come from a fixed whitelist, never from request data.

## Query patterns (from Python)

```python
from core.db import query

query(
    "select assessment_id, instrument_type, score, severity, taken_at "
    "from assessments where user_id = %s order by taken_at desc",
    (user.id,),
    user_id=user.id,
)
```

- `query()` / `execute()` each open their own transaction. Use `with db(user_id) as conn:` when
  several statements must share one transaction (multi-row inserts).
- Wrap dict/list values for `jsonb` columns in `psycopg.types.json.Jsonb`.
- Vector parameters are passed as `str(embedding)` and cast in SQL: `%s::vector`.

## Self-check

`db/test_rls.sql` asserts RLS isolation, anonymous lockout, and the auth functions against the
running database. Run it after any schema or policy change:

```bash
docker exec -i -e PGPASSWORD=sanctuary_app sanctuary-db \
  psql -v ON_ERROR_STOP=1 -U sanctuary_app -d sanctuary < db/test_rls.sql
```
