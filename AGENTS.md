# AGENTS.md

## What this is

**Sanctuary** — an AI-powered mental health support system for university students and counselors.
Students use a mobile app for AI chat, stress detection, clinical assessments (PHQ-9, GAD-7, SRQ),
and journaling. Counselors/admins use a web dashboard for risk monitoring, analytics, and booking.

A single npm-workspace monorepo holds the Expo apps, the FastAPI backend, and three shared
TypeScript packages. Docker runs a local PostgreSQL 17 + pgvector database; Ollama provides
local embeddings and the LLM.

## Tech stack

**Languages / runtimes**: Python 3.12 · TypeScript 5.9 · Node.js 20+ · SQL (PostgreSQL 17)

**Backend**: FastAPI · Uvicorn · Pydantic v2 · python-dotenv · cryptography (Fernet) · psycopg 3 · PyJWT · bcrypt

**AI / ML**: semantic-router · Ollama (`llama3.2:3b`, `nomic-embed-text-v2-moe`) · langchain-core ·
langchain-ollama · RAG + pgvector · python-docx (ingestion)

**Data / platform**: Docker · PostgreSQL 17 · pgvector · Row Level Security

**Frontend**: React 19 · React Native 0.81 · Expo SDK 54 · expo-router 6 · react-native-web ·
React Navigation 7 · AsyncStorage · Reanimated 4 + worklets · gesture-handler · safe-area-context ·
react-native-screens · react-native-svg · react-native-chart-kit ·
Expo modules (font, splash, blur, linear-gradient, image, haptics, symbols, linking, constants,
system-ui, web-browser) · Plus Jakarta Sans / Inter / Poppins

**Monorepo / tooling**: npm workspaces · Metro bundler · ESLint (`eslint-config-expo`) · tsconfig ·
VS Code · Git + GitHub (PR flow) · Conventional Commits (enforced by `.githooks/commit-msg`)

## Structure

```
Therapy-Chatbot/
├── apps/
│   ├── mobile/        Expo React Native app (expo-router) — student-facing
│   ├── dashboard/     Expo Router web app (react-native-web) — counselor/admin
│   └── backend/       FastAPI (Python 3.12) API + services/chatbot
├── packages/
│   ├── api-client/    @prototype/api-client — fetch wrappers + cross-platform storage
│   ├── ui-shared/     @prototype/ui-shared — theme, context, auth hook, animation
│   └── utils/         @prototype/utils — stress detection, response parsers
├── db/                SQL init scripts (schema, auth) + RLS self-check
├── docker-compose.yml PostgreSQL 17 + pgvector + pgAdmin
├── package.json       Root workspace
└── AGENTS.md
```

## Conventions by technology — read the matching doc before editing

| Layer | Technology | Doc |
|-------|-----------|-----|
| Backend | Python 3.12 | [docs/python-conventions.md](docs/python-conventions.md) |
| Backend | FastAPI + Uvicorn | [docs/fastapi-conventions.md](docs/fastapi-conventions.md) |
| Backend | Pydantic v2 | [docs/pydantic-conventions.md](docs/pydantic-conventions.md) |
| Data | PostgreSQL 17 (schema, RLS, pgvector) | [docs/postgresql-conventions.md](docs/postgresql-conventions.md) |
| AI | semantic-router | [docs/semantic-router-conventions.md](docs/semantic-router-conventions.md) |
| AI | LangChain (core + Ollama adapter) | [docs/langchain-conventions.md](docs/langchain-conventions.md) |
| AI | Ollama (LLM + embeddings + RAG) | [docs/ollama-conventions.md](docs/ollama-conventions.md) |
| Frontend | TypeScript | [docs/typescript-conventions.md](docs/typescript-conventions.md) |
| Frontend | React 19 | [docs/react-conventions.md](docs/react-conventions.md) |
| Frontend | React Native 0.81 | [docs/react-native-conventions.md](docs/react-native-conventions.md) |
| Frontend | Expo SDK 54 + modules | [docs/expo-conventions.md](docs/expo-conventions.md) |
| Frontend | expo-router 6 | [docs/expo-router-conventions.md](docs/expo-router-conventions.md) |
| Frontend | React Navigation 7 | [docs/react-navigation-conventions.md](docs/react-navigation-conventions.md) |
| Frontend | Design system, Reanimated, SVG, charts | [docs/react-native-ui-conventions.md](docs/react-native-ui-conventions.md) |
| Monorepo | npm workspaces + `@prototype/*` | [docs/npm-workspaces-conventions.md](docs/npm-workspaces-conventions.md) |
| Infra | Docker (local PostgreSQL + pgAdmin) | [docs/docker-conventions.md](docs/docker-conventions.md) |
| Tooling | Git + GitHub | [docs/git-conventions.md](docs/git-conventions.md) |
| Security | JWT auth, RBAC, Fernet, secrets | [docs/security-conventions.md](docs/security-conventions.md) |
| Workflow | Install, run, shared conventions | [docs/development-conventions.md](docs/development-conventions.md) |

## Non-negotiables

- **Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)**
  (`<type>[(scope)][!]: <description>`), enforced by `.githooks/commit-msg`. See
  [docs/git-conventions.md](docs/git-conventions.md).
- Backend/DB identifiers are `snake_case`; user-facing messages are Bahasa Indonesia.
- Never log or store raw chat content — it is Fernet-encrypted (`core/security.py`).
- High-risk messages (`guardrail` route) always return the hardcoded crisis response; never let an LLM rewrite it.
- Run `apps/backend` from its own directory (`venv`, `uvicorn main:app`).
- The schema source of truth is `db/init/01_schema.sql` (+ `02_auth.sql`); it is applied by
  `docker compose up` on an empty volume. Backend connects as the non-superuser `sanctuary_app`
  so RLS applies; request identity is `set_config('app.current_user_id', ..., true)` per transaction.
- Roles are `mahasiswa | konselor | admin | pemangku_jabatan` on `users.role`.
