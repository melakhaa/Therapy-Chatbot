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
```

Each migration records its filename stem in `schema_migrations`, takes an advisory transaction lock, and keeps its DDL additive. Never run migrations using the superuser URL as the application runtime URL.

Skipping already-applied files is the runner's job, not each file's: the `migrate` service in `docker-compose.yml` checks `schema_migrations` before applying one, and stops at the first failure. Individual files are **not** safe to re-run by hand — `003_iteration4_1.sql` aborts with `Canonical DASS-21 draft is not empty; refusing to overwrite existing content` rather than overwrite wording an admin may have edited. Applying manually with the `psql` commands above means checking first:

```powershell
psql $env:DATABASE_OWNER_URL -tAc "select version from schema_migrations order by 1"
```

`002_iteration4.sql` adds versioned assessment definitions, immutable published versions, category result storage, and multi-scope report audit metadata. It seeds a deliberately empty, non-publishable DASS-21 draft; `003_iteration4_1.sql` fills it in with the approved wording and scoring. Apply `001_iteration3c.sql` first. The application runtime must continue using the non-superuser `sajiwa_app` role so RLS remains effective.

`003_iteration4_1.sql` adds standard/custom instrument identity and provenance, records the owner-supplied DASS-21 mapping, response scores, multiplier, and category-specific severity bands, and seeds the exact 21 Indonesian items from the owner-provided Source A DOCX. The migration validates the complete standard draft before setting `authoritative_config=true`; it deliberately leaves the version in `draft` so publication still requires the existing admin confirmation flow. Apply it after `002_iteration4.sql`.
