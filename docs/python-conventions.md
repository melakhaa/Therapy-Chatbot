# Python conventions

Backend language: **Python 3.12**, run from `apps/backend/`. No web framework code here —
see [fastapi-conventions.md](fastapi-conventions.md) and [pydantic-conventions.md](pydantic-conventions.md).

## Project layout

```
apps/backend/
├── main.py          # app entry
├── auth.py          # auth guards
├── core/            # cross-cutting (security.py)
├── routes/          # API routers
├── services/        # business/AI logic
└── scripts/         # one-off scripts (embed.py, test_rag_performance.py)
```

Modules are top-level, **not** a package: imports are `from auth import ...`, `from core.security import ...`,
`from services.chatbot.core import ...`. Always run from `apps/backend`.

## Dependencies

- Declared in `apps/backend/requirements.txt`, lower-bound pinned (`>=`): `fastapi`, `uvicorn[standard]`,
  `pydantic[email]`, `python-dotenv`, `supabase`, `semantic-router`, `langchain-ollama`,
  `langchain-core`, `cryptography`.
- `python-docx` (import `docx`) is used by `scripts/embed.py` but is **not** in `requirements.txt` —
  install it ad hoc if you run ingestion.
- No `pyproject.toml` / no formatter config; keep edits consistent with surrounding style.

## Conventions

- `snake_case` for functions, variables, modules, table/column names.
- Type hints on function signatures (`def chat(user_message: str) -> str:`); use `typing.Optional`/`List`
  as the code does.
- Env via `python-dotenv`: `load_dotenv()` at module top, then `os.getenv(...)`.
- User-facing messages and `HTTPException.detail` are Bahasa Indonesia.
- IDs written to Postgres are cast with `str(user.id)`.
- Every chatbot/AI module ends with an `if __name__ == "__main__":` smoke-test block of sample inputs —
  follow that pattern when adding one.
- Fail fast on missing critical config (`core/security.py` raises at import if `ENCRYPTION_KEY` is unset).

## Run

```bash
cd apps/backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
