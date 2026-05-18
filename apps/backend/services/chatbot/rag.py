from huggingface_hub import InferenceClient
from semantic_router import Route
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

HF_MODEL = "SekarBestNY/llama3-mental-health-adapter"
HF_EMBED_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
HF_TOKEN = os.getenv("HF_TOKEN")

rag_route = Route(
    name="rag",
    utterances=[
        "apa itu depresi?",
        "apa saja gejala depresi?",
        "bagaimana cara menangani depresi?",
        "apa penyebab depresi?",
        "jelaskan tentang kesehatan mental",
        "apa itu anxiety?",
        "bagaimana cara mengatasi stres?",
        "apa itu gangguan jiwa?",
        "terapi apa yang cocok untuk depresi?",
        "apa bedanya depresi dan sedih biasa?",
    ]
)

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))
client = InferenceClient(model=HF_MODEL, token=HF_TOKEN)
embed_client = InferenceClient(token=HF_TOKEN)

# In-memory chat history for RAG conversation
_rag_history: list[dict] = []


def embed_query(text: str) -> list[float]:
    """Embed text using HF sentence-transformers model."""
    response = embed_client.feature_extraction(text, model=HF_EMBED_MODEL)
    # feature_extraction returns a list or nested list — flatten to 1D
    if isinstance(response[0], list):
        return response[0]
    return list(response)


def retrieve_docs(query: str, k: int = 5):
    query_embedding = embed_query(query)
    result = supabase.rpc("match_documents", {
        "query_embedding": query_embedding,
        "match_threshold": 0.3,
        "match_count": k
    }).execute()
    return result.data or []


def get_rag_response(user_message: str) -> str:
    docs = retrieve_docs(user_message)

    if not docs:
        return "Maaf, saya tidak menemukan informasi terkait di dokumen."

    context = "\n---\n".join([d["content"] for d in docs])

    system_prompt = (
        "Kamu adalah asisten psikologi bernama Hana. "
        "Gunakan konteks berikut untuk menjawab pertanyaan dalam Bahasa Indonesia. "
        "Jika informasi tidak ada di konteks, katakan kamu tidak tahu.\n\n"
        f"Konteks:\n{context}"
    )

    _rag_history.append({"role": "user", "content": user_message})
    messages = [{"role": "system", "content": system_prompt}] + _rag_history

    response = client.chat.completions.create(
        messages=messages,
        max_tokens=512,
        temperature=0.5,
    )

    reply = response.choices[0].message.content
    _rag_history.append({"role": "assistant", "content": reply})
    return reply


if __name__ == "__main__":
    tests = [
        "apa itu depresi?",
        "siapa itu mr ambatunat?",
        "apa saja gejala depresi?",
        "bagaimana cara menangani depresi?"
    ]
    for t in tests:
        print(f"User: {t}")
        print(f"RAG: {get_rag_response(t)}\n")