# Backend — local rules

FastAPI app + AI services. Run all commands from this directory — imports are top-level
(`from auth import ...`), not a package.

```bash
venv/bin/uvicorn main:app --reload               # API :8000
venv/bin/python scripts/seed_dev_users.py        # dev accounts (once, DB up)
venv/bin/python -m unittest discover -s tests -v # API tests, no DB/AI
venv/bin/python scripts/api_smoke.py             # end-to-end check (full stack up)
```

Setup, tests, and gotchas: [root development doc](../../docs/development-conventions.md).

- Venv `venv/` (Python 3.12 required; semantic-router has no 3.13+ wheels).
- Schema changes: `db/migrations/NNN_*.sql` (additive, recorded in `schema_migrations`) —
  workflow and init/migration split: [db/AGENTS.md](../../db/AGENTS.md).
- Iteration 3/4 admin APIs: `routes/iteration3.py` (counseling, academic scopes, notifications),
  `routes/iteration4.py` (versioned instruments, comparison analytics, multi-counselor calendar).
  DASS-21 scoring rules live in `core/dass21.py` — change only with an approved clinical source.
- No linter/formatter configured; match existing style.
- Conventions: [python](../../docs/python-conventions.md), [fastapi](../../docs/fastapi-conventions.md),
  [pydantic](../../docs/pydantic-conventions.md), [postgresql](../../docs/postgresql-conventions.md).
- Chat/AI services (`services/chatbot/`): [langchain](../../docs/langchain-conventions.md),
  [ollama](../../docs/ollama-conventions.md), [semantic-router](../../docs/semantic-router-conventions.md).
