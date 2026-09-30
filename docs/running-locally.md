# Running Sajiwa locally

Complete runbook: database → backend → AI → dashboard → mobile. Run every command from the repo
root unless the step says otherwise. First time only: do **§1**; after that just do **§2**.

## 0. Prerequisites

| Tool | Notes |
|------|-------|
| Node.js 20+ | workspaces + both Expo apps |
| Python 3.12 | required — the AI stack has no 3.13/3.14 wheels |
| Docker Desktop | running, for PostgreSQL 17 + pgvector |
| Ollama | local LLM + embeddings; the backend refuses to start without it |

## 1. First-time setup

### 1.1 JavaScript workspaces

```bash
npm install          # from the repo root — NEVER inside an app
```

### 1.2 Database

```bash
docker compose up -d
docker compose ps    # wait until sajiwa-db is "healthy"
```

This starts `sajiwa-db` (PostgreSQL + pgvector), `sajiwa-pgadmin`, and the one-shot `sajiwa-migrate`
service, which applies `db/init/*.sql` on an empty volume and then `db/migrations/*.sql` (idempotent,
recorded in `schema_migrations`).

### 1.3 Ollama models

```bash
ollama serve                                              # if it is not already a service
ollama pull llama3.2:3b                                   # chat generation
ollama pull nomic-embed-text-v2-moe                       # router + RAG embeddings
```

### 1.4 Backend

```bash
cd apps/backend
uv venv --python 3.12 venv && source venv/bin/activate    # or: python3.12 -m venv venv
pip install -r requirements.txt
cp .env.example .env
```

Open `apps/backend/.env` and fill the two secrets (generation commands are in the file):

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"                                  # JWT_SECRET
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"     # ENCRYPTION_KEY
```

### 1.5 Dev accounts

```bash
cd apps/backend
venv/bin/python scripts/seed_dev_users.py
```

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `admin1234` |
| Counselor | `konselor@example.com` | `konselor1234` |
| Student | `mahasiswa@example.com` | `mahasiswa1234` |

### 1.6 RAG corpus (recommended)

Without it, factual ("what is depression?") questions return the no-context fallback.

```bash
cd apps/backend
venv/bin/python scripts/embed.py     # reads apps/backend/docs/*.docx, needs Ollama
```

## 2. Run (one terminal per line)

```bash
docker compose up -d                                       # database + pgAdmin + migrations
ollama serve                                               # AI (skip if already running)

cd apps/backend   && venv/bin/uvicorn main:app --reload    # API      → http://localhost:8000
cd apps/dashboard && npx expo start --web                  # dashboard → http://localhost:8081
cd apps/mobile    && npx expo start                        # Expo Go / a / i / w
```

If the dashboard already owns port 8081, give the mobile web build its own:

```bash
cd apps/mobile && npx expo start --web --port 8082         # → http://localhost:8082
```

## 3. Where to look

| What | URL | Credentials |
|------|-----|-------------|
| Dashboard (counselor/admin) | http://localhost:8081 | `admin@example.com` / `admin1234` |
| Student app (Expo Go / emulator) | `npx expo start` → `a` / `i`, or scan the QR | `mahasiswa@example.com` / `mahasiswa1234` |
| Student app (web) | http://localhost:8082 | same |
| API docs (Swagger) | http://localhost:8000/docs | log in via `/auth/login` |
| pgAdmin | http://localhost:5050 | `admin@example.com` / `admin` |
| PostgreSQL | `localhost:5432` | `sajiwa` / `sajiwa` (superuser), `sajiwa_app` / `sajiwa_app` (RLS) |
| Ollama | http://localhost:11434 | — |

pgAdmin auto-connects: the **Sajiwa local** server is pre-registered (`db/pgadmin/servers.json`).
Browse `Servers → Sajiwa local → Databases → sajiwa → Schemas → public → Tables`.

## 4. Verify the install

```bash
# 1. Isolated API contract tests — no DB, no AI
cd apps/backend && venv/bin/python -m unittest discover -s tests -v

# 2. Full end-to-end check — stack must be running (uses Ollama)
cd apps/backend && venv/bin/python scripts/api_smoke.py

# 3. RLS + auth functions against the live database
docker exec -i -e PGPASSWORD=sajiwa_app sajiwa-db \
  psql -v ON_ERROR_STOP=1 -U sajiwa_app -d sajiwa < db/test_rls.sql

# 4. Frontend
cd apps/dashboard && npm run lint
cd apps/mobile    && npx tsc --noEmit
```

`api_smoke.py` prints `ALL PASSED` when the whole stack is healthy.

## 5. Day-to-day

```bash
docker compose down           # stop db + pgAdmin, keep data
docker compose down -v        # stop and wipe data (re-runs init + migrations on next up)
docker compose logs db        # init/migration output
docker compose logs migrate   # migration output
```

- **Schema changes** go in `db/migrations/NNN_name.sql`, never by editing `db/init/01_schema.sql`.
  The `migrate` service applies them on the next `docker compose up`; they must be idempotent and
  record themselves in `schema_migrations`.
- **Port 5432 is taken** (native PostgreSQL): create a root `.env` with `SAJIWA_DB_PORT=5433`,
  then `docker compose up -d --force-recreate`.
- **Android emulator**: `localhost` is the emulator, not your machine. Point the app at
  `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000` in `apps/mobile/.env`.

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Cannot connect to the Docker daemon` | Start Docker Desktop (then `docker compose up -d`) |
| Backend exits at import | Ollama is down or a model is missing — run `ollama serve` + the two `ollama pull`s |
| Backend 500s on `/accounts`, `/admin/...` | Migrations not applied: `docker compose up -d`, check `docker compose logs migrate` |
| `venv/bin/uvicorn: No such file` | Create the venv in §1.4; on Windows use `venv\Scripts\activate` |
| App shows stale/empty data after a DB wipe | Re-run `seed_dev_users.py` and `embed.py`; if the token is stale, log out and back in |
| Dashboard blank / route errors after editing | Restart `npx expo start --web` (reloads are disabled when `CI=1`) |
| `relation ... does not exist` after `down -v` | Old volume: `docker compose down -v && docker compose up -d` |

Stack-specific details: [development-conventions.md](development-conventions.md),
[docker-conventions.md](docker-conventions.md), [ollama-conventions.md](ollama-conventions.md).
