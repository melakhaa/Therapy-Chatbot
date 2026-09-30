# FastAPI conventions

Backend API in `apps/backend/`, Python 3.12. Entry point: `main.py`.

## Layout (FastAPI layer only)

```
apps/backend/
├── main.py              # FastAPI app, CORS, router registration, /health manifest
├── auth.py              # Depends-level auth guards (see security-conventions)
├── routes/              # One APIRouter per domain
│   ├── assessment.py    account.py   dashboard.py
│   ├── jadwal.py        journal.py   chat.py
│   └── admin.py         admin_operations.py
├── tests/               # isolated unittest contracts (stub core.db, real JWTs)
└── core/                # Cross-cutting helpers
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
  - **Identity always comes from the JWT.** Never accept a `user_id` field in a request body —
    `ChatRequest` deliberately has none, because a body-supplied id is a client-chosen RLS identity.
    Scope queries with `user_id=user.id`.
  - `admin.py` exports reusable guards: `operator_access` (konselor/admin/pemangku_jabatan) for
    assessment review, `directory_access` (admin/pemangku_jabatan) for identity profiles.
  - `admin_operations.py` uses a single `admin_access = require_role("admin")` for schedules,
    hotlines, attention signals, and analytics. Attention signals are `assessment`, `safety`, or
    `request` (`request` = a student tapped "kabari tim" in the crisis sheet).
- `GET /accounts/konselor` returns the student-visible counselor directory via `list_konselor()`
  (public fields only: id, nama, role) — students cannot read other `users` rows under RLS.
- Validate path/query input with FastAPI types, not manual parsing: `user_id: UUID`,
  `Query(1, ge=1, le=2147483647)` for page, `Query(20, ge=1, le=100)` for page_size, `Literal[...]` for
  filters, `date`/`time` for schedules. Business rules (date range, `waktu_selesai > waktu_mulai`) raise
  `HTTPException(422, ...)` before querying.
- Paginated list endpoints return `{entity, total, page, page_size}`; create endpoints return `201` and
  the created row (`{"schedule": ...}` / `{"hotline": ...}`).
- `admin.py` / `admin_operations.py` keep responses to recorded fields only — never chat content,
  journals, assessment answers, or raw guardrail trigger input.
- Errors: `raise HTTPException(status_code=..., detail="Bahasa Indonesia message")`.
- Responses: plain dicts, `snake_case` keys; insert endpoints return the created row or
  `{entity, message}`. Always cast IDs with `str(user.id)`.
- Streaming endpoint `POST /chat/stream` is real SSE: a metadata frame (`{route, is_high_risk}`)
  first, then `{"token": ...}` frames as the model emits them, then `data: [DONE]`. The turn is
  persisted only after the stream completes, so a truncated answer never enters history.
- `POST /chat` returns `{response, route, is_high_risk}` and persists the turn when a `session_id`
  is supplied; `GET /chat/history?session_id=` returns the caller's own decrypted transcript.
  Both `/chat` and `/chat/stream` generate through `core.chat_stream`, so they cannot drift.
- `POST /chat/report` backs the crisis sheet's "kabari tim" button: it writes an unread
  `guardrail_logs` row (`[LAPORAN PENGGUNA]` prefix) surfaced by the dashboard as a `request`
  attention signal. It stores no message content.

## `/health` is the contract

`main.py`'s `/health` maps `CB-01..CB-14` and `ADMIN-01..ADMIN-04` to endpoints. Add/rename an
endpoint → update the manifest.

## Run

```bash
cd apps/backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Run from `apps/backend` (imports are top-level, e.g. `from auth import ...`). Swagger at
`http://localhost:8000/docs`. Env vars: [security-conventions.md](security-conventions.md).
