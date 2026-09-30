from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
import json

from auth import get_current_user
from core.security import decrypt_text, encrypt_text
from core.db import db, query
from services.chatbot.core import chat as chat_fn, chat_stream, semantic_router
from services.chatbot.guardrail import HARDCODED_RESPONSE
from services.chatbot.rag import retrieve_docs

load_dotenv()

guardrail_router = APIRouter(prefix="/guardrail", tags=["Guardrail"])
router_router = APIRouter(prefix="/router", tags=["Router"])
rag_router = APIRouter(prefix="/rag", tags=["RAG"])
chat_router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    # No user_id: identity always comes from the JWT (`get_current_user`), never the body.

@guardrail_router.post("/check")
def check_safety_guardrail(request: ChatRequest):
    result = semantic_router(request.message)
    is_high_risk = result.name == "guardrail"
    return {
        "is_high_risk": is_high_risk,
        "route": result.name,
        "response": HARDCODED_RESPONSE if is_high_risk else None,
    }

@router_router.post("/intent")
def route_semantic_intent(request: ChatRequest):
    result = semantic_router(request.message)
    return {"route": result.name or "conversational"}

@rag_router.post("/context")
def retrieve_rag_context(request: ChatRequest, user=Depends(get_current_user)):
    docs = retrieve_docs(request.message)
    return {
        "context": [
            {"content": d["content"], "metadata": d.get("metadata", {})}
            for d in docs
        ]
    }

def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@chat_router.post("/stream")
def stream_chat_response(request: ChatRequest, user=Depends(get_current_user)):
    """Real SSE: tokens as the model produces them. `[DONE]` terminates the stream."""
    route_result = semantic_router(request.message)
    route = route_result.name or "conversational"
    is_high_risk = route == "guardrail"

    def generate():
        # Metadata first, so the client can raise the crisis card without waiting for tokens.
        yield _sse({"route": route, "is_high_risk": is_high_risk})

        parts = []
        try:
            for chunk in chat_stream(
                request.message,
                session_id=request.session_id,
                user_id=user.id,
                route=route,
            ):
                parts.append(chunk)
                yield _sse({"token": chunk})
        except Exception:
            # A truncated answer is not a turn: keep it out of history so the next request
            # re-asks rather than continuing from half a reply.
            yield _sse({"error": "generation_failed"})
            return

        response_text = "".join(parts)
        if request.session_id:
            with db(user.id) as conn:
                _persist_turn(conn, request, user.id, route, response_text, is_high_risk)

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

def _persist_turn(conn, request: ChatRequest, user_id, route: str, response_text: str, is_high_risk: bool):
    """One transaction: session row (idempotent), optional crisis log, then both turns."""
    conn.execute(
        "insert into sessions (session_id, user_id, title) values (%s, %s, %s) "
        "on conflict (session_id) do nothing",
        (request.session_id, user_id, request.message[:80]),
    )
    if is_high_risk:
        conn.execute(
            "insert into guardrail_logs (session_id, user_id, triggered_input) "
            "values (%s, %s, %s)",
            (request.session_id, user_id, encrypt_text(request.message)),
        )
    conn.cursor().executemany(
        "insert into messages (session_id, user_id, role, content, route_used) "
        "values (%s, %s, %s, %s, %s)",
        [
            (request.session_id, user_id, "user", encrypt_text(request.message), route),
            (request.session_id, user_id, "assistant", encrypt_text(response_text), route),
        ],
    )


class ReportRequest(BaseModel):
    session_id: Optional[str] = None


@chat_router.post("/report")
def report_to_team(request: ReportRequest, user=Depends(get_current_user)):
    """User tapped "Kabari tim Sajiwa" in the crisis sheet. Logged as an unread safety
    signal, which the counselor dashboard surfaces under /admin/attention."""
    query(
        "insert into guardrail_logs (session_id, user_id, triggered_input) values (%s, %s, %s)",
        (request.session_id, str(user.id), "[LAPORAN PENGGUNA] Minta dihubungi tim dari modal krisis"),
        user_id=user.id,
    )
    return {"status": "reported"}


@chat_router.post("")
def chat_unified(request: ChatRequest, user=Depends(get_current_user)):
    route_result = semantic_router(request.message)
    route = route_result.name or "conversational"
    is_high_risk = route == "guardrail"

    if is_high_risk:
        response_text = HARDCODED_RESPONSE
    else:
        # Routed above, so chat() must not route again; it only loads history and generates.
        response_text = chat_fn(
            request.message,
            session_id=request.session_id,
            user_id=user.id,
            route=route,
        )

    if request.session_id:
        with db(user.id) as conn:
            _persist_turn(conn, request, user.id, route, response_text, is_high_risk)

    return {
        "response": response_text,
        "route": route,
        "is_high_risk": is_high_risk,
    }


@chat_router.get("/history")
def chat_history(session_id: str, limit: int = 50, user=Depends(get_current_user)):
    """The caller's own transcript. RLS scopes it to `user.id`; never expose this to admins."""
    rows = query(
        "select role, content, route_used, created_at from messages "
        "where session_id = %s order by created_at asc limit %s",
        (session_id, min(max(limit, 1), 200)), user_id=user.id,
    )

    messages = []
    for row in rows:
        try:
            text = decrypt_text(row["content"])
        except Exception:
            continue
        messages.append({
            "role": row["role"],
            "text": text,
            "route": row["route_used"],
            "created_at": row["created_at"],
        })

    return {"session_id": session_id, "messages": messages}
