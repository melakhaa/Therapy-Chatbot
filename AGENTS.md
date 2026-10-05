# AGENTS.md

**Sajiwa** — AI mental health support for university students and counselors. Students use an
Expo app (AI chat, stress detection, PHQ-9/GAD-7/SRQ + the versioned DASS-21 instrument,
journaling); counselors/admins use a Next.js dashboard (risk monitoring, analytics, booking,
instrument authoring). An npm-workspace monorepo holds the frontend apps, the FastAPI backend
(Python 3.12), and the shared TypeScript packages; Docker runs PostgreSQL 17 + pgvector, Ollama
provides the local LLM/embeddings.

## Structure

```
Therapy-Chatbot/
├── apps/
│   ├── mobile/        Expo React Native app (expo-router) — student-facing
│   ├── dashboard/     Next.js app — counselor/admin
│   └── backend/       FastAPI (Python 3.12) API + routes/ + services/ + tests/
├── packages/
│   ├── api-client/    @prototype/api-client — fetch wrappers + cross-platform storage
│   ├── ui-shared/     @prototype/ui-shared — theme, context, auth hook, animation
│   └── utils/         @prototype/utils — stress detection, response parsers
├── db/                init/ SQL baseline + migrations/ + test_rls.sql + pgadmin config
├── docs/              Per-stack convention docs (linked below)
├── docker-compose.yml PostgreSQL 17 + pgvector + pgAdmin
├── package.json       Root workspace
└── AGENTS.md          This file (each app also has a local AGENTS.md)
```

## Commands

```bash
npm install                                             # all workspaces (run from root)
docker compose up -d                                    # PostgreSQL 17 + pgvector + pgAdmin (applies db/init + db/migrations)

cd apps/backend
venv/bin/uvicorn main:app --reload                      # API :8000 (always run from apps/backend)
venv/bin/python scripts/seed_dev_users.py               # dev accounts (once, DB up)
venv/bin/python -m unittest discover -s tests -v        # API tests, no DB/AI
venv/bin/python scripts/api_smoke.py                    # end-to-end check (full stack up)

cd apps/mobile    && npx expo start                     # student app
npm run dashboard:dev                                   # counselor/admin dashboard
npm run dashboard:typecheck && npm run dashboard:lint   # dashboard static checks
npm run dashboard:test && npm run dashboard:build       # dashboard tests + build
```

## Read when relevant

- Install, run, tests, gotchas → [docs/development-conventions.md](docs/development-conventions.md)
- Project-wide non-negotiables → [docs/project-conventions.md](docs/project-conventions.md)
- Python / FastAPI / Pydantic → [docs/python-conventions.md](docs/python-conventions.md), [docs/fastapi-conventions.md](docs/fastapi-conventions.md), [docs/pydantic-conventions.md](docs/pydantic-conventions.md)
- PostgreSQL, RLS, schema, pgvector → [docs/postgresql-conventions.md](docs/postgresql-conventions.md)
- AI: semantic-router / LangChain / Ollama → [docs/semantic-router-conventions.md](docs/semantic-router-conventions.md), [docs/langchain-conventions.md](docs/langchain-conventions.md), [docs/ollama-conventions.md](docs/ollama-conventions.md)
- TypeScript / React / React Native / Expo / routing / UI → [docs/typescript-conventions.md](docs/typescript-conventions.md), [docs/react-conventions.md](docs/react-conventions.md), [docs/react-native-conventions.md](docs/react-native-conventions.md), [docs/expo-conventions.md](docs/expo-conventions.md), [docs/expo-router-conventions.md](docs/expo-router-conventions.md), [docs/react-navigation-conventions.md](docs/react-navigation-conventions.md), [docs/react-native-ui-conventions.md](docs/react-native-ui-conventions.md)
- npm workspaces / shared packages → [docs/npm-workspaces-conventions.md](docs/npm-workspaces-conventions.md)
- Docker / local infra → [docs/docker-conventions.md](docs/docker-conventions.md)
- Git, commits, PRs → [docs/git-conventions.md](docs/git-conventions.md) — Conventional Commits, no AI co-author trailers.
- Security: JWT, RBAC, encryption, secrets → [docs/security-conventions.md](docs/security-conventions.md)
