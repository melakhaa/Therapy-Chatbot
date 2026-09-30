from langchain_ollama import OllamaEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage
from semantic_router import Route

from core.db import query

# nomic-embed-text-v2-moe expects task prefixes; query and document must use their
# matching pair or similarity silently degrades. Single source of truth for the
# router (core.py), the RAG query path, and scripts/embed.py.
EMBED_MODEL = "nomic-embed-text-v2-moe"
QUERY_PREFIX = "search_query: "
DOCUMENT_PREFIX = "search_document: "

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

embeddings = OllamaEmbeddings(model=EMBED_MODEL)

def retrieve_docs(text: str, k: int = 5):
    query_embedding = embeddings.embed_query(f"{QUERY_PREFIX}{text}")
    return query(
        "select * from match_documents(%s::vector, %s, %s)",
        (str(query_embedding), 0.3, k),
    )

RAG_SYSTEM_PROMPT = """Gunakan konteks berikut untuk menjawab pertanyaan dalam Bahasa Indonesia.
Jika tidak ada di konteks, katakan kamu tidak tahu.

Konteks:
{context}"""


NO_CONTEXT_REPLY = "Maaf, saya tidak menemukan informasi terkait di dokumen."


def build_messages(user_message: str, history: list | None = None) -> list | None:
    """Prompt for a RAG turn, or None when retrieval found nothing.

    None is not an error: the caller replies with NO_CONTEXT_REPLY so the model is never asked
    to answer from an empty context. Generation lives in core.chat_stream.
    """
    docs = retrieve_docs(user_message)

    if not docs:
        return None

    context = "\n---\n".join([d["content"] for d in docs])

    return [
        SystemMessage(content=RAG_SYSTEM_PROMPT.format(context=context)),
        *(history or []),
        HumanMessage(content=user_message),
    ]


if __name__ == "__main__":
    from services.chatbot.core import chat

    for t in [
        "apa itu depresi?",
        "siapa itu mr ambatunat?",
        "apa saja gejala depresi?",
        "bagaimana cara menangani depresi?",
    ]:
        print(f"User: {t}")
        print(f"RAG: {chat(t)}\n")
