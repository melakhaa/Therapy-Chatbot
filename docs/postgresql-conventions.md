# PostgreSQL conventions

Database is **PostgreSQL 17** hosted by Supabase (local Docker). Access is through the Supabase
client / JS SDK, **no ORM** — see [supabase-conventions.md](supabase-conventions.md). Vector
similarity uses the **pgvector** extension.

## Schema sources

- **`apps/backend/docs/migration.sql`** — current reference DDL. Creates `users`, `assessments`,
  `jadwal_konsultasi`, `booking_konsultasi`, `hotline`, `journals` + `match_documents()`.
- **`apps/backend/docs/schema.sql`** — stale draft using `profiles`/`operator`/`consultations`.
  Do not treat as source of truth.
- `messages`, `guardrail_logs`, `documents` are used by code but absent from `migration.sql`.

## Extensions

```sql
create extension if not exists vector;     -- pgvector, documents.embedding
create extension if not exists pgcrypto;   -- gen_random_uuid() etc.
```

## Conventions

- `snake_case` for every table and column.
- Primary keys: Surrogate UUIDs with table-prefixed names (`assessment_id`, `journal_id`,
  `booking_id`, `log_id`, `user_id`).
- Timestamps: `timestamptz default now()`; mutable rows get an `updated_at` maintained by a
  `set_updated_at()` trigger (defined in the SQL file).
- Enumerated columns use `check` constraints, e.g. `role in (...)`, `severity in (...)`.
  Values: roles `mahasiswa | konselor | admin | pemangku_jabatan`, severity
  `minimal | mild | moderate | severe`.
- Auth linkage: `users` mirrors `auth.users`; a `handle_new_user()` trigger populates the profile
  on signup (pattern present in the draft SQL).
- Row Level Security is enabled per table with policies scoped by `auth.uid()` and role from the JWT.
- Vector search: `documents.content`, `documents.embedding vector`, `documents.metadata jsonb`;
  queries via the `match_documents(query_embedding, match_threshold, match_count)` function.

## Query patterns (from Python)

```python
supabase.table("assessments").select("assessment_id, score, severity") \
    .eq("user_id", str(user.id)).order("taken_at", desc=True).range(offset, offset + limit - 1).execute()
```

- Build filters with chained `.eq()/.gte()/.order()/.range()`; never string-concatenate SQL.
- Count with `.select("log_id", count="exact")` then `.count`.

## Migrations

No migration framework in use. Schema changes are hand-written SQL under `apps/backend/docs/` and
applied via `npx supabase db reset` (re-applies files) or the Supabase SQL editor.
