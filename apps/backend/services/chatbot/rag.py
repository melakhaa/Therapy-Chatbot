from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_core.messages import HumanMessage
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

llm = ChatOllama(model="llama3.2:3b")
embeddings = OllamaEmbeddings(model=EMBED_MODEL)

def retrieve_docs(text: str, k: int = 5):
    query_embedding = embeddings.embed_query(f"{QUERY_PREFIX}{text}")
    return query(
        "select * from match_documents(%s::vector, %s, %s)",
        (str(query_embedding), 0.3, k),
    )

def get_rag_response(user_message: str) -> str:
    # ponytail: stateless per request, no chat memory. Load last N messages from `messages` by session_id if context needed.
    docs = retrieve_docs(user_message)
    
    if not docs:
        return "Maaf, saya tidak menemukan informasi terkait di dokumen."
    
    context = "\n---\n".join([d["content"] for d in docs])

    prompt = f"""Gunakan konteks berikut untuk menjawab pertanyaan dalam Bahasa Indonesia.
Jika tidak ada di konteks, katakan kamu tidak tahu.

Konteks:
{context}

Pertanyaan: {user_message}"""

    response = llm.invoke([HumanMessage(content=prompt)])

    return response.content

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
