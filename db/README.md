# Local PostgreSQL

PostgreSQL 17 + pgvector for local development, run by `docker-compose.yml` at the repo root.
`db/init/*.sql` is applied **once**, in filename order, only when the `pgdata` volume is empty.

```bash
docker compose up -d          # start db + pgAdmin
docker compose ps
docker compose down           # stop (keep data)
docker compose down -v        # stop and wipe data (re-runs db/init on next up)
```

- pgAdmin: http://localhost:5050 — `admin@example.com` / `admin`.
  Add a server with host `db`, user `sanctuary`, password `sanctuary`
  (from inside pgAdmin use host `db`, not `localhost`).
- Backend connects as the **non-superuser** role so RLS applies:

```
DATABASE_URL=postgresql://sanctuary_app:sanctuary_app@localhost:5432/sanctuary
JWT_SECRET=<python -c "import secrets; print(secrets.token_urlsafe(48))">
ENCRYPTION_KEY=<python -c "import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())">
```

## Files

| File | Contents |
|------|----------|
| `init/01_schema.sql` | tables, indexes, RLS policies, `match_documents()` |
| `init/02_auth.sql` | `sanctuary_app` role + grants, `password_hash`, `password_resets`, `auth_lookup()`, `set_password()` |
| `test_rls.sql` | RLS isolation + auth self-check; rolls back, leaves no data |

## Self-check

Run after any schema or policy change:

```bash
docker exec -i -e PGPASSWORD=sanctuary_app sanctuary-db \
  psql -v ON_ERROR_STOP=1 -U sanctuary_app -d sanctuary < db/test_rls.sql
```

Expect `NOTICE: all RLS/auth checks passed`.

## Notes

- `sanctuary` (the compose user) is a **superuser** and bypasses RLS — it is only for pgAdmin and
  admin `psql`. Never point the backend at it.
- There is no migration framework. Editing `init/*.sql` requires `docker compose down -v` to take
  effect, which destroys local data.
