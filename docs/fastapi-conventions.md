# FastAPI conventions

Backend API in `apps/backend/`, Python 3.12. Entry point: `main.py`.

## Layout (FastAPI layer only)

```
apps/backend/
├── main.py            # FastAPI app, CORS, router registration, /health manifest
├── auth.py            # Depends-level auth guards (see security-conventions)
├── routes/            # One APIRouter per domain
│   ├── assessment.py  account.py  dashboard.py
│   ├── jadwal.py      journal.py  chat.py
└── core/              # Cross-cutting helpers
```

The chatbot logic itself is **not** FastAPI — it lives in `services/chatbot/` and is documented
under [semantic-router-conventions.md](semantic-router-conventions.md) and
[ollama-conventions.md](ollama-conventions.md). Routes only call into it.

## Conventions

- Each `routes/*.py` declares `router = APIRouter(prefix="/x", tags=["X"]),` defines Pydantic
  `BaseModel` request bodies, and is registered in `main.py` via `app.include_router(...)`.
- `routes/chat.py` exposes several routers from one file: `guardrail_router`, `router_router`,
  `rag_router`, `chat_router`.
- Request bodies are typed Pydantic models (`ChatRequest`, `AssessmentRequest`, ...); use
  `Literal[...]` for enums, `Field`/validators for constraints.
- Protect handlers with `user=Depends(get_current_user)`; restrict with
  `Depends(require_role("konselor", "admin", "pemangku_jabatan"))`.
- Errors: `raise HTTPException(status_code=..., detail="Bahasa Indonesia message")`.
- Responses: plain dicts, `snake_case` keys; insert endpoints return the created row or
  `{entity, message}`. Always cast IDs with `str(user.id)`.
- Streaming endpoint `POST /chat/stream` emits SSE frames `data: {"token": ...}\n\n`,
  ending with `data: [DONE]`.

## `/health` is the contract

`main.py`'s `/health` maps CB-01..CB-14 to endpoints. Add/rename an endpoint → update the manifest.

## Run

```bash
cd apps/backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Run from `apps/backend` (imports are top-level, e.g. `from auth import ...`). Swagger at
`http://localhost:8000/docs`. Env vars: [security-conventions.md](security-conventions.md).
