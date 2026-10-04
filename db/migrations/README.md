# Sajiwa database migrations

These ordered SQL files upgrade an existing database without recreating its volume.

## Backup before any non-disposable migration

```powershell
$env:PGPASSWORD = "<database-owner-password>"
pg_dump --format=custom --no-owner --file="sajiwa-before-iteration3.dump" --dbname="postgresql://<owner>@<host>:5432/sajiwa"
pg_restore --list "sajiwa-before-iteration3.dump"
```

Apply as the database owner, after reviewing the backup:

```powershell
psql -v ON_ERROR_STOP=1 $env:DATABASE_OWNER_URL -f db/migrations/001_iteration3c.sql
psql -v ON_ERROR_STOP=1 $env:DATABASE_OWNER_URL -f db/migrations/002_iteration4.sql
psql -v ON_ERROR_STOP=1 $env:DATABASE_OWNER_URL -f db/migrations/003_iteration4_1.sql
psql -v ON_ERROR_STOP=1 $env:DATABASE_OWNER_URL -f db/migrations/004_backend_enablement.sql
```

Each migration uses `schema_migrations`, an advisory transaction lock, additive DDL, and idempotent inserts. Never run migrations using the superuser URL as the application runtime URL.

`002_iteration4.sql` adds versioned assessment definitions, immutable published versions, category result storage, and multi-scope report audit metadata. Its DASS-21 seed is deliberately an empty, non-publishable draft because the repository does not contain an approved clinical question/scoring configuration. Apply `001_iteration3c.sql` first. The application runtime must use the non-superuser `sajiwa_app` role so RLS remains effective.

`003_iteration4_1.sql` adds standard/custom instrument identity and provenance, records the owner-supplied DASS-21 mapping, response scores, multiplier, and category-specific severity bands, and seeds the exact 21 Indonesian items from the owner-provided Source A DOCX. The migration validates the complete standard draft before setting `authoritative_config=true`; it deliberately leaves the version in `draft` so publication still requires the existing admin confirmation flow. Apply it after `002_iteration4.sql`.

`004_backend_enablement.sql` adds custom dimensions and revision-bound counselor review, sensitive student support profiles, counseling resources and blocks, optional appointment-resource links, and the hotline verification lifecycle. Apply it after `003_iteration4_1.sql`.

`sajiwa_app` is the canonical runtime role. The `sanctuary_app` role is retained only as a `NOLOGIN` compatibility target for immutable historical grants in migrations 002 and 003; `sajiwa_app` inherits those grants. New migrations and runtime configuration must use `sajiwa_app`, never `sanctuary_app`.
