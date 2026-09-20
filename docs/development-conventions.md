# Development conventions

Repo-wide setup, running, and shared coding conventions. Stack-specific docs are linked from
[AGENTS.md](../AGENTS.md).

## Install

```bash
npm install                    # root: all workspaces ([npm-workspaces-conventions.md](npm-workspaces-conventions.md))

cd apps/backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Infrastructure

```bash
npx supabase start    # Docker required; prints API URL + keys for .env
npx supabase status
npx supabase stop
```

## Run (three terminals)

```bash
cd apps/backend   && uvicorn main:app --reload --port 8000   # FastAPI
cd apps/mobile    && npx expo start                           # Expo (mobile)
cd apps/dashboard && npm run dev                              # Expo web
```

Also start `ollama serve` for chat/embeddings ([ollama-conventions.md](ollama-conventions.md)).

## Repo-wide conventions

- TypeScript for all JS ([typescript-conventions.md](typescript-conventions.md)); Python 3.12 for the backend ([python-conventions.md](python-conventions.md)).
- Backend/DB identifiers `snake_case`; React components `PascalCase`; hooks `useX`.
- Barrels (`index.ts`) at package and component-folder roots.
- User-facing strings: Bahasa Indonesia.
- Deliberate shortcuts are tagged with `ponytail:` comments naming the ceiling + upgrade path.
- Lint (dashboard only): `npm run lint` → `expo lint` (`eslint-config-expo` flat config). No backend linter/formatter configured.

## Gotchas

- Run the backend from `apps/backend` — imports are top-level (`from auth import ...`), not a package.
- `apps/backend/docs/schema.sql` is stale; use `migration.sql` ([supabase-conventions.md](supabase-conventions.md)).
- `messages`, `guardrail_logs`, `documents` are used by code but absent from `migration.sql`; apply DDL before local use.
- Dashboard is Expo Router web, not Next.js, despite the README ([expo-conventions.md](expo-conventions.md)).
- No Ollama → zero-vector mock encoder, degraded chatbot answers.
