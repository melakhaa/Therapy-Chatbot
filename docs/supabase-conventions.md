# Supabase conventions

**Supabase** is the platform layer: local dev stack (Docker), Postgres, Auth, and the client SDKs.
`supabase/config.toml` (project `prototype`, API `:54321`, DB `:54322`).

- Postgres schema/naming/RLS/vectors → [postgresql-conventions.md](postgresql-conventions.md).
- Local container lifecycle → [docker-conventions.md](docker-conventions.md).
- Auth guards/encryption → [security-conventions.md](security-conventions.md).

## Clients

Both official clients are used:

- **Python** (`supabase>=2.4.0`) in `apps/backend` for all DB/auth work.
- **JS** (`@supabase/supabase-js`) in `apps/mobile` for `EXPO_PUBLIC_SUPABASE_*` access.

## Schema sources (read this first)

- **`apps/backend/docs/migration.sql`** — current reference. Creates `users`, `assessments`,
  `jadwal_konsultasi`, `booking_konsultasi`, `hotline`, `journals` + `match_documents()`.
- **`apps/backend/docs/schema.sql`** — an early draft using `profiles`, `operator`, `consultations`.
  Do **not** use it as the source of truth.

The running code also reads/writes `messages`, `guardrail_logs`, and `documents` (vector store),
which are absent from `migration.sql` — apply the matching DDL before relying on them locally.

## Tables used by the backend

| Table | Purpose |
|-------|---------|
| `users` | Profile mirror of `auth.users`; holds `role` |
| `assessments` | PHQ-9 / GAD-7 / SRQ results, `score`, `severity` |
| `guardrail_logs` | High-risk trigger log (chat + assessments) |
| `messages` | Encrypted chat turns (`route_used`) |
| `documents` | RAG chunks: `content`, `embedding vector`, `metadata` |
| `hotline` | Crisis contact list (read via `/guardrail/hotline`) |
| `journals` | Private student journal entries |
| `jadwal_konsultasi` | Counselor availability slots |
| `booking_konsultasi` | Student bookings |

## Client conventions

- One Python client per backend module (not injected):
  ```python
  supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))
  ```
- Queries are chained: `.table(x).select(...).eq(...).order(...).range(...).execute()`.
  Tables use `snake_case`; PKs like `assessment_id`, `journal_id`, `user_id`.
- Admin-only operations use a separate service-role client `supabase_admin`
  (`SUPABASE_SERVICE_KEY`) in `routes/account.py`.
- Auth verification uses `supabase.auth.get_user(token)` — see
  [security-conventions.md](security-conventions.md).

## Vector search

RPC `match_documents(query_embedding, match_threshold, match_count)` with threshold `0.3`,
`k=5` (`services/chatbot/rag.py`). Embeddings come from Ollama —
[semantic-router-conventions.md](semantic-router-conventions.md),
[ollama-conventions.md](ollama-conventions.md).

## RLS & roles

- Row Level Security is enabled on all tables; policies scope by `auth.uid()` and by role
  from the JWT (`konselor`/`admin` read broadly, `mahasiswa` only own rows).
- Roles: `mahasiswa | konselor | admin | pemangku_jabatan` on `users.role`. The draft's
  `operator` role does not exist in running code.
- `severity` is `minimal | mild | moderate | severe` (thresholds in `routes/assessment.py`).

## Commands

```bash
npx supabase start     # Docker required; prints API URL + keys for .env
npx supabase status
npx supabase stop
npx supabase db reset  # re-apply migrations + seed
```
