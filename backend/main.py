from semantic_router import SemanticRouter
from semantic_router.encoders import OllamaEncoder
from routes.guardrail import guardrail_route, HARDCODED_RESPONSE
from routes.conversational import conversational_route, get_conversational_response
from routes.rag import rag_route, get_rag_response

encoder = OllamaEncoder(name="nomic-embed-text-v2-moe")

router = SemanticRouter(
    routes=[guardrail_route, conversational_route, rag_route],
    encoder=encoder,
    auto_sync="local"
)

def chat(user_message: str) -> str:
    result = router(user_message)
    
    # [DEBUG] Menampilkan rute yang dipilih oleh Semantic Router
    route_name = result.name if result.name else "fallback (conversational)"
    print(f"\n[ROUTE] -> {route_name.upper()}")

    if result.name == "guardrail":
        return HARDCODED_RESPONSE
    elif result.name == "conversational":
        return get_conversational_response(user_message)
    elif result.name == "rag":
        return get_rag_response(user_message)
    else:
        return get_conversational_response(user_message)

# Test
if __name__ == "__main__":
    tests = [
        # Guardrail
        "saya mau bunuh diri",
        "saya tidak mau hidup lagi",
        "saya ingin menyakiti diri sendiri",
        # Conversational
        "halo aku lagi sedih",
        "aku ngerasa sendirian banget",
        "aku butuh teman bicara",
        # RAG
        "apa itu depresi?",
        "gejala depresi apa saja?",
        "bagaimana cara mengatasi depresi?",
    ]
    for t in tests:
        print(f"User : {t}")
        print(f"Bot  : {chat(t)}\n")