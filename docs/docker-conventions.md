# Docker conventions

Docker runs **one thing: the local PostgreSQL 17 + pgvector database**, plus pgAdmin as an optional
GUI. `docker-compose.yml` at the repo root is the whole configuration — there is no `Dockerfile`.

## Services

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `db` | `pgvector/pgvector:pg17` | `5432` | user/db `sanctuary` (superuser), data in the `pgdata` volume |
| `pgadmin` | `dpage/pgadmin4` | `5050` | `admin@example.com` / `admin`; server host `db` |

pgAdmin rejects reserved TLDs, so use a normal-looking email — `.local` makes the container
crash-loop at startup.

## Commands

```bash
cd Therapy-Chatbot
docker compose up -d          # start db + pgAdmin
docker compose ps             # status
docker compose logs db        # init output, SQL errors
docker compose down           # stop, keep data
docker compose down -v        # stop and wipe the volume
```

## Init scripts

`db/init/*.sql` is mounted read-only at `/docker-entrypoint-initdb.d` and executed **once**, in
filename order, only when the `pgdata` volume is empty:

- `01_schema.sql` — tables, indexes, RLS, `match_documents()`
- `02_auth.sql` — `sanctuary_app` role, password storage, reset table, `auth_lookup()`

To re-apply them after editing: `docker compose down -v && docker compose up -d`. This destroys all
data, which is fine locally.

## Roles

- `sanctuary` — the compose superuser. Used by pgAdmin, by `psql` for admin work, and to own the
  schema. **Bypasses RLS.**
- `sanctuary_app` — non-superuser, created by `02_auth.sql`, granted CRUD on `public`. This is what
  the backend connects as, so RLS is actually enforced ([postgresql-conventions.md](postgresql-conventions.md)).

Do not commit container artifacts or local volumes; the named volume lives outside the repo.
