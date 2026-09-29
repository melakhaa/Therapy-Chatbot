from langchain_core.messages import HumanMessage, SystemMessage
from semantic_router import Route

conversational_route = Route(
    name="conversational",
    utterances=[
        "halo",
        "hai",
        "apa kabar?",
        "terima kasih",
        "kamu siapa?",
        "bisa bantu saya?",
        "saya sedang sedih",
        "saya merasa kesepian",
        "saya butuh teman bicara",
        "saya tidak tahu harus bagaimana",
        "saya stres banget",
        "saya lelah",
        "saya merasa tidak dihargai",
        "saya butuh motivasi",
    ]
)

SYSTEM_PROMPT = """Kamu adalah asisten psikologi yang empatik dan suportif bernama Hana.
Kamu berbicara dalam Bahasa Indonesia yang hangat dan mudah dipahami.
Dengarkan dan validasi perasaan pengguna, jangan menghakimi."""

def build_messages(user_message: str, history: list | None = None) -> list:
    """The prompt for one turn: persona, then prior turns, then the new message.

    Generation itself lives in core.chat_stream — one path for both /chat and /chat/stream.
    """
    return [
        SystemMessage(content=SYSTEM_PROMPT),
        *(history or []),
        HumanMessage(content=user_message),
    ]


if __name__ == "__main__":
    from services.chatbot.core import chat

    for t in [
        "halo, aku lagi sedih banget hari ini",
        "aku ngerasa sendirian",
        "makasih udah dengerin aku",
    ]:
        print(f"User: {t}")
        print(f"Hana: {chat(t)}\n")
