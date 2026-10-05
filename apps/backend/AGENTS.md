# Backend — local rules

FastAPI app + AI services. Run all commands from this directory — imports are top-level
(`from auth import ...`), not a package. Setup, tests, and gotchas:
[root development doc](../../docs/development-conventions.md).

- Venv `venv/` (Python 3.12 required; semantic-router has no 3.13+ wheels).
- Schema changes: add `db/migrations/NNN_*.sql` (additive; record the filename stem in
  `schema_migrations`); the one-shot `migrate` service applies the unapplied ones on
  `docker compose up` and skips the rest, so a file never has to be re-runnable. Editing the `db/init/*.sql` baseline needs
  `docker compose down -v && docker compose up -d` (wipes local data).
- Iteration 3/4 admin APIs: `routes/iteration3.py` (counseling, academic scopes, notifications),
  `routes/iteration4.py` (versioned instruments, comparison analytics, multi-counselor calendar).
  DASS-21 scoring rules live in `core/dass21.py` — change only with an approved clinical source.
- No linter/formatter configured; match existing style.
- Conventions: [python](../../docs/python-conventions.md), [fastapi](../../docs/fastapi-conventions.md),
  [pydantic](../../docs/pydantic-conventions.md), [postgresql](../../docs/postgresql-conventions.md).
- Chat/AI services (`services/chatbot/`): [langchain](../../docs/langchain-conventions.md),
  [ollama](../../docs/ollama-conventions.md), [semantic-router](../../docs/semantic-router-conventions.md).
