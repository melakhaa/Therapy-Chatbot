from dataclasses import dataclass

from semantic_router import SemanticRouter
from semantic_router.encoders import OllamaEncoder
from services.chatbot.guardrail import guardrail_route, HARDCODED_RESPONSE, is_crisis
from services.chatbot.conversational import conversational_route, get_conversational_response
from services.chatbot.history import load_history
from services.chatbot.rag import rag_route, get_rag_response, EMBED_MODEL

try:
    encoder = OllamaEncoder(name=EMBED_MODEL)
except Exception as e:
    print(f"Warning: Ollama not found. Using mock encoder. Error: {e}")
    class MockEncoder:
        def __call__(self, text):
            class Result:
                def __init__(self): self.embedding = [0]*768
            return Result()
    encoder = MockEncoder()

_router = SemanticRouter(
    routes=[guardrail_route, conversational_route, rag_route],
    encoder=encoder,
    auto_sync="local"
)


@dataclass
class RouteResult:
    name: str | None


def semantic_router(message: str) -> RouteResult:
    """Route a message, checking crisis phrases deterministically before the fuzzy match.

    Every route decision in the API goes through here, so the keyword net cannot be
    bypassed by a paraphrase the router fails to match (see guardrail.is_crisis).
    """
    if is_crisis(message):
        return RouteResult(name="guardrail")
    return _router(message)


def chat(
    user_message: str,
    session_id: str | None = None,
    user_id: str | None = None,
    route: str | None = None,
) -> str:
    """Answer one turn. `route` is accepted so callers that already routed do not pay for it twice."""
    route = route or (semantic_router(user_message).name or "conversational")

    if route == "guardrail":
        return HARDCODED_RESPONSE

    history = load_history(session_id, user_id)

    if route == "rag":
        return get_rag_response(user_message, history)
    return get_conversational_response(user_message, history)

if __name__ == "__main__":
    tests = [
        "saya mau bunuh diri",
        "saya tidak mau hidup lagi",
        "saya ingin menyakiti diri sendiri",
        "halo aku lagi sedih",
        "aku ngerasa sendirian banget",
        "aku butuh teman bicara",
        "apa itu depresi?",
        "gejala depresi apa saja?",
        "bagaimana cara mengatasi depresi?",
    ]
    for t in tests:
        print(f"User : {t}")
        print(f"Bot  : {chat(t)}\n")
