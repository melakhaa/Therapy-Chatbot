from huggingface_hub import InferenceClient
from semantic_router import Route
from dotenv import load_dotenv
import os

load_dotenv()

HF_MODEL = "SekarBestNY/llama3-mental-health-adapter"
HF_TOKEN = os.getenv("HF_TOKEN")

client = InferenceClient(model=HF_MODEL, token=HF_TOKEN)

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

# In-memory chat history: list of {"role": ..., "content": ...}
_chat_history: list[dict] = []


def get_conversational_response(user_message: str) -> str:
    """Send message to HF model and return response text."""
    _chat_history.append({"role": "user", "content": user_message})

    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + _chat_history

    response = client.chat.completions.create(
        messages=messages,
        max_tokens=512,
        temperature=0.7,
    )

    reply = response.choices[0].message.content
    _chat_history.append({"role": "assistant", "content": reply})
    return reply


# Test
if __name__ == "__main__":
    tests = [
        "halo, aku lagi sedih banget hari ini",
        "aku ngerasa sendirian",
        "makasih udah dengerin aku",
    ]
    for t in tests:
        print(f"User: {t}")
        print(f"Hana: {get_conversational_response(t)}\n")