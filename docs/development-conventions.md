# Development conventions

Repo-wide setup, running, and shared coding conventions. Stack-specific docs are linked from
[AGENTS.md](../AGENTS.md).

## Install

```bash
npm install                    # root: all workspaces ([npm-workspaces-conventions.md](npm-workspaces-conventions.md))

cd apps/backend
# Python 3.12 is required — semantic-router publishes no 3.13/3.14 wheels.
uv venv --python 3.12 venv     # or: python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # then fill DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY
```

## Infrastructure

```bash
docker compose up -d     # PostgreSQL 17 + pgvector (db/init/*.sql run on first boot) + pgAdmin
docker compose ps
docker compose down      # keep data
docker compose down -v   # wipe data; re-applies db/init on next up
```

Backend at http://localhost:8000 (`/docs` for OpenAPI), pgAdmin at http://localhost:5050.
See [docker-conventions.md](docker-conventions.md) and [postgresql-conventions.md](postgresql-conventions.md).

## Run (three terminals)

```bash
docker compose up -d                                          # database
cd apps/backend   && venv/bin/uvicorn main:app --reload       # FastAPI :8000
cd apps/mobile    && npx expo start                           # Expo (mobile)
cd apps/dashboard && npx expo start --web                     # Expo web
```

Seed dev accounts once the DB is up (idempotent; the first admin can't be created via the API):

```bash
cd apps/backend && venv/bin/python scripts/seed_dev_users.py
```

Also start `ollama serve` for chat/embeddings ([ollama-conventions.md](ollama-conventions.md)).

## Tests

Both need the stack running and clean up after themselves (no test framework, no CI).

```bash
# RLS isolation + auth functions, against the live DB
docker exec -i -e PGPASSWORD=sanctuary_app sanctuary-db \
  psql -v ON_ERROR_STOP=1 -U sanctuary_app -d sanctuary < db/test_rls.sql

# end-to-end API check: auth, assessments, journals, jadwal/booking, dashboard,
# chat (real Ollama), RLS isolation. Exits non-zero on failure.
cd apps/backend && venv/bin/python scripts/api_smoke.py
```

## Repo-wide conventions

- TypeScript for all JS ([typescript-conventions.md](typescript-conventions.md)); Python 3.12 for the backend ([python-conventions.md](python-conventions.md)).
- Backend/DB identifiers `snake_case`; React components `PascalCase`; hooks `useX`.
- Barrels (`index.ts`) at package and component-folder roots.
- User-facing strings: Bahasa Indonesia.
- Deliberate shortcuts are tagged with `ponytail:` comments naming the ceiling + upgrade path.
- Lint (dashboard only): `npm run lint` → `expo lint` (`eslint-config-expo` flat config). No backend linter/formatter configured.

## Gotchas

- Run the backend from `apps/backend` — imports are top-level (`from auth import ...`), not a package.
- Schema lives in `db/init/*.sql`; edit it and `docker compose down -v && docker compose up -d` to
  re-apply. There is no migration framework, and wiping destroys local data.
- The backend connects as `sanctuary_app` (non-superuser) so RLS applies. Pointing `DATABASE_URL` at
  `sanctuary` silently disables every policy — see [security-conventions.md](security-conventions.md).
- `db/test_rls.sql` is the RLS/auth self-check; run it after schema or policy changes.
- No Ollama → zero-vector mock encoder, degraded chatbot answers.
