from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
import json

from auth import get_current_user
from core.security import encrypt_text
from core.db import db
from services.chatbot.core import chat as chat_fn, semantic_router
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
    user_id: Optional[str] = None

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

@chat_router.post("/stream")
def stream_chat_response(request: ChatRequest, user=Depends(get_current_user)):
    def generate():
        response = chat_fn(request.message)
        for word in response.split(" "):
            yield f"data: {json.dumps({'token': word + ' '})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@chat_router.post("/history")
def save_chat_history(request: ChatRequest, user=Depends(get_current_user)):
    if not request.session_id:
        return {"status": "skipped", "reason": "no session_id"}

    result = semantic_router(request.message)
    route_used = result.name or "conversational"
    response_text = chat_fn(request.message)

    with db(user.id) as conn:
        conn.cursor().executemany(
            "insert into messages (session_id, user_id, role, content, route_used) "
            "values (%s, %s, %s, %s, %s)",
            [
                (request.session_id, user.id, "user", encrypt_text(request.message), route_used),
                (request.session_id, user.id, "assistant", encrypt_text(response_text), route_used),
            ],
        )

    return {"status": "saved", "route": route_used, "response": response_text}

@chat_router.post("")
def chat_unified(request: ChatRequest, user=Depends(get_current_user)):
    route_result = semantic_router(request.message)
    route = route_result.name or "conversational"
    is_high_risk = route == "guardrail"

    if is_high_risk:
        response_text = HARDCODED_RESPONSE
        if request.session_id:
            with db(user.id) as conn:
                conn.execute(
                    "insert into guardrail_logs (session_id, user_id, triggered_input) "
                    "values (%s, %s, %s)",
                    (request.session_id, user.id, request.message),
                )
    else:
        response_text = chat_fn(request.message)

    if request.session_id:
        with db(user.id) as conn:
            conn.cursor().executemany(
                "insert into messages (session_id, user_id, role, content, route_used) "
                "values (%s, %s, %s, %s, %s)",
                [
                    (request.session_id, user.id, "user", encrypt_text(request.message), route),
                    (request.session_id, user.id, "assistant", encrypt_text(response_text), route),
                ],
            )

    return {
        "response": response_text,
        "route": route,
        "is_high_risk": is_high_risk,
    }
