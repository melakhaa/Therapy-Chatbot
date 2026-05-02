from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from main import chat, router as semantic_router
from routes.guardrail import HARDCODED_RESPONSE
from routes.rag import get_rag_response, retrieve_docs
from supabase import create_client
from dotenv import load_dotenv
import os, json

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    route: str = None
    is_high_risk: bool = False

@app.post("/guardrail/check")
def check_safety_guardrail(request: ChatRequest):
    result = semantic_router(request.message)
    is_high_risk = result.name == "guardrail"
    return {
        "is_high_risk": is_high_risk,
        "response": HARDCODED_RESPONSE if is_high_risk else None
    }

@app.get("/guardrail/hotline")
def get_emergency_hotline():
    return {
        "hotlines": [
            {"name": "Into The Light Indonesia", "number": "119 ext 8"},
            {"name": "Yayasan Pulih", "number": "(021) 788-42580"},
            {"name": "IGD Rumah Sakit Terdekat", "number": "118"},
        ]
    }

@app.post("/guardrail/notify")
def send_high_risk_notification(request: ChatRequest):
    if not request.session_id:
        return {"status": "skipped", "reason": "no session_id"}
    
    supabase.table("guardrail_logs").insert({
        "session_id": request.session_id,
        "triggered_input": request.message,
    }).execute()

    return {"status": "logged"}

@app.post("/router/intent")
def route_semantic_intent(request: ChatRequest):
    result = semantic_router(request.message)
    return {"route": result.name or "conversational"}

@app.post("/rag/context")
def retrieve_rag_context(request: ChatRequest):
    docs = retrieve_docs(request.message)
    return {
        "context": [{"content": d["content"], "metadata": d["metadata"]} for d in docs]
    }

@app.post("/chat/stream")
def stream_chat_response(request: ChatRequest):
    def generate():
        response = chat(request.message)
        for word in response.split(" "):
            yield f"data: {json.dumps({'token': word + ' '})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/chat/history")
def save_chat_history(request: ChatRequest):
    if not request.session_id:
        return {"status": "skipped", "reason": "no session_id"}

    result = semantic_router(request.message)
    route_used = result.name or "conversational"
    response = chat(request.message)

    supabase.table("messages").insert({
        "session_id": request.session_id,
        "role": "user",
        "content": request.message,
        "route_used": route_used,
    }).execute()

    supabase.table("messages").insert({
        "session_id": request.session_id,
        "role": "assistant",
        "content": response,
        "route_used": route_used,
    }).execute()

    return {"status": "saved", "response": response, "route": route_used}

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    result = semantic_router(request.message)
    route = result.name or "conversational"
    is_high_risk = route == "guardrail"

    if is_high_risk and request.session_id:
        send_high_risk_notification(request)

    response = chat(request.message)

    if request.session_id:
        save_chat_history(request)

    return ChatResponse(
        response=response,
        route=route,
        is_high_risk=is_high_risk
    )

@app.get("/")
def root():
    return {"status": "ok"}