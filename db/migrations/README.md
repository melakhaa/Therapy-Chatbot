# Sajiwa database migrations

These ordered SQL files upgrade an existing database without recreating its volume.

## Backup before any non-disposable migration

```powershell
$env:PGPASSWORD = "<database-owner-password>"
pg_dump --format=custom --no-owner --file="sanctuary-before-iteration3.dump" --dbname="postgresql://<owner>@<host>:5432/sanctuary"
pg_restore --list "sanctuary-before-iteration3.dump"
```

Apply as the database owner, after reviewing the backup:

```powershell
psql -v ON_ERROR_STOP=1 $env:DATABASE_OWNER_URL -f db/migrations/001_iteration3c.sql
```

Each migration uses `schema_migrations`, an advisory transaction lock, additive DDL, and idempotent inserts. Never run migrations using the superuser URL as the application runtime URL.
