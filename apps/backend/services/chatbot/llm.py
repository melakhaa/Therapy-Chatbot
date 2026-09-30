import os

from langchain_ollama import ChatOllama

# Single client for every generation call (conversational.py, rag.py). Defaults are all
# deliberate: num_ctx bounds prompt growth now that history is prepended, the keep-alive
# avoids reloading the model per request, and the httpx timeout stops a dead Ollama from
# parking a threadpool worker forever.
llm = ChatOllama(
    model="llama3.2:3b",
    temperature=float(os.getenv("OLLAMA_TEMPERATURE", "0.6")),
    num_ctx=int(os.getenv("OLLAMA_NUM_CTX", "4096")),
    keep_alive="10m",
    client_kwargs={"timeout": float(os.getenv("OLLAMA_TIMEOUT", "60"))},
)
