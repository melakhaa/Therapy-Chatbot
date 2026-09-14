"""
Sanctuary Backend — FastAPI Application Entry Point
Semua 14 endpoint CB-01..CB-14 terdaftar di sini.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from datetime import datetime
import os

load_dotenv()

# ── Import routers ────────────────────────────────────────────────────────────
from routes.assessment import router as assessment_router
from routes.account import router as account_router
from routes.dashboard import router as dashboard_router
from routes.jadwal import router as jadwal_router
from routes.journal import router as journal_router

# Chat sub-routers (CB-04..CB-08)
from routes.chat import (
    guardrail_router,   # /guardrail/check (CB-04)
    router_router,      # /router/intent   (CB-05)
    rag_router,         # /rag/context     (CB-06)
    chat_router,        # /chat/stream, /chat/history, /chat (CB-07,08)
)

# Guardrail hotline endpoint (CB-03) — mount langsung di app karena prefix beda
from fastapi import APIRouter
from services.chatbot.guardrail import get_hotlines_from_db

hotline_router = APIRouter(prefix="/guardrail", tags=["Guardrail"])

@hotline_router.get("/hotline")
def get_emergency_hotline():
    """CB-03 — Ambil daftar kontak layanan darurat (hotline) dari basis data."""
    return {"hotlines": get_hotlines_from_db()}


# ── App ───────────────────────────────────────────────────────────────────────
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from core.task_queue import init_task_queue, shutdown_task_queue, _register_default_handlers
    queue = await init_task_queue()
    _register_default_handlers(queue)
    yield
    # Shutdown
    await shutdown_task_queue()

app = FastAPI(
    title="Sanctuary — Mental Health Chatbot API",
    description=(
        "Backend API untuk aplikasi Sanctuary. Mencakup CB-01..CB-14: "
        "asesmen, chatbot, guardrail, auth, dashboard, dan manajemen akun."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Rate Limiting ─────────────────────────────────────────────────────────────
from core.rate_limit import RateLimitMiddleware, create_rate_limiter

rate_limiter = create_rate_limiter()
app.add_middleware(RateLimitMiddleware, rate_limiter=rate_limiter)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ──────────────────────────────────────────────────────────
app.include_router(assessment_router)   # /assessment/submit, /assessment/notify-risk
app.include_router(hotline_router)      # /guardrail/hotline (CB-03)
app.include_router(guardrail_router)    # /guardrail/check   (CB-04)
app.include_router(router_router)       # /router/intent     (CB-05)
app.include_router(rag_router)          # /rag/context       (CB-06)
app.include_router(chat_router)         # /chat/stream, /chat/history, /chat
app.include_router(account_router)      # /auth/login, /auth/me, /accounts
app.include_router(dashboard_router)    # /dashboard/data    (CB-10)
app.include_router(jadwal_router)       # /jadwal, /booking
app.include_router(journal_router)      # /journal (self-journaling)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": "Sanctuary Backend", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
def health():
    """Basic health check - returns OK if app is running."""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
    }


@app.get("/health/ready", tags=["Health"])
async def readiness():
    """
    Readiness probe - checks critical dependencies.
    Returns 200 if ready to serve traffic, 503 if not.
    """
    from supabase import create_client
    import httpx
    
    checks = {}
    overall_ready = True

    # Check Supabase connection
    try:
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_ANON_KEY")
        )
        # Simple query to verify connection
        supabase.table("users").select("user_id").limit(1).execute()
        checks["supabase"] = {"status": "ok", "latency_ms": 0}
    except Exception as e:
        checks["supabase"] = {"status": "error", "error": str(e)}
        overall_ready = False

    # Check Ollama availability
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            resp = await client.get(f"{ollama_url}/api/tags")
            if resp.status_code == 200:
                models = resp.json().get("models", [])
                checks["ollama"] = {
                    "status": "ok",
                    "models_available": len(models),
                    "models": [m["name"] for m in models[:5]]
                }
            else:
                checks["ollama"] = {"status": "error", "error": f"HTTP {resp.status_code}"}
                overall_ready = False
    except Exception as e:
        checks["ollama"] = {"status": "error", "error": str(e)}
        overall_ready = False

    # Check Redis (if used for rate limiting)
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        try:
            import redis.asyncio as redis
            r = redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
            await r.ping()
            await r.close()
            checks["redis"] = {"status": "ok"}
        except Exception as e:
            checks["redis"] = {"status": "error", "error": str(e)}
            overall_ready = False
    else:
        checks["redis"] = {"status": "skipped", "reason": "REDIS_URL not configured"}

    status_code = 200 if overall_ready else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if overall_ready else "not_ready",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "checks": checks,
        }
    )


@app.get("/health/live", tags=["Health"])
def liveness():
    """Liveness probe - returns OK if process is alive."""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat() + "Z"}