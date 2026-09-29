# Backend — local rules

FastAPI app + AI services. Run all commands from this directory — imports are top-level
(`from auth import ...`), not a package. Setup, tests, and gotchas:
[root development doc](../../docs/development-conventions.md).

- Venv `venv/` (Python 3.12 required; semantic-router has no 3.13+ wheels).
- Schema changes: edit `db/init/*.sql`, then `docker compose down -v && docker compose up -d`
  (no migration framework — wipes local data).
- No linter/formatter configured; match existing style.
- Conventions: [python](../../docs/python-conventions.md), [fastapi](../../docs/fastapi-conventions.md),
  [pydantic](../../docs/pydantic-conventions.md), [postgresql](../../docs/postgresql-conventions.md).
- Chat/AI services (`services/chatbot/`): [langchain](../../docs/langchain-conventions.md),
  [ollama](../../docs/ollama-conventions.md), [semantic-router](../../docs/semantic-router-conventions.md).
