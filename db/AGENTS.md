# db — local PostgreSQL 17 + pgvector

`init/*.sql` runs **once** on an empty volume (filename order); `migrations/NNN_*.sql` are
additive-only and tracked in `schema_migrations` by filename stem. Editing `init/` needs
`docker compose down -v && docker compose up -d` (wipes local data).

- Schema change workflow: add `db/migrations/NNN_*.sql`, record its filename stem in
  `schema_migrations`; the one-shot `migrate` service applies unapplied files on
  `docker compose up` and skips the rest, so a file never has to be re-runnable.
- `test_rls.sql` checks RLS policies; run it after touching policies or grants.
- pgAdmin at :5050 — details in [README](README.md).

Conventions: [postgresql](../docs/postgresql-conventions.md),
[security/RLS](../docs/security-conventions.md),
[docker](../docs/docker-conventions.md).
