# LangChain conventions

The project uses **LangChain only as an LLM/message adapter** — `langchain-core` for messages and
`langchain-ollama` for the local model. There are **no chains, agents, retrievers, or vector-store
abstractions**; RAG retrieval is done manually with SQL against PostgreSQL + pgvector.

## Packages

- `langchain-core>=0.2.0` — `messages.SystemMessage` / `HumanMessage` / `AIMessage`.
- `langchain-ollama>=0.1.0` — `ChatOllama`, `OllamaEmbeddings`.

## Patterns

```python
from langchain_core.messages import HumanMessage, SystemMessage
from services.chatbot.llm import llm

# conversational.py — persona in the system message, history between it and the new turn
messages = build_messages(user_message, history)

# rag.py — retrieved context in the system message too, never as a HumanMessage
messages = build_messages(user_message, history)   # None when retrieval found nothing

# core.chat_stream — the only place generation happens
for chunk in llm.stream(messages):
    yield chunk.content
```

- **Import the shared client from `services/chatbot/llm.py`**; never construct a second
  `ChatOllama`. It pins `num_ctx`, `keep_alive`, and a request timeout that a fresh client would
  silently lose.
- **Prompt building and generation are separate**: `build_messages()` lives in `conversational.py`
  (`rag.py` for the RAG path) and `core.chat_stream` is the only caller that generates. That is why
  `/chat` and `/chat/stream` cannot answer differently.
- Use `llm.stream(messages)`, not `invoke`. Non-streaming callers join the chunks, so there is one
  token path rather than two that can drift apart.
- Instructions belong in a `SystemMessage`. Putting them in a `HumanMessage` makes them
  indistinguishable from user text, which is the easy prompt-injection path.
- `history` comes from `services/chatbot/history.py:load_history` — real preceding turns, oldest
  first, with crisis turns already filtered out. Never assemble it by hand.
- `OllamaEmbeddings(model=EMBED_MODEL)` is a module-level singleton in `rag.py`; retrieval embeds
  the query with `embeddings.embed_query(f"{QUERY_PREFIX}{text}")` and passes it to
  `match_documents(%s::vector, 0.3, k)` through `core.db.query`. `scripts/embed.py` imports the same
  `EMBED_MODEL` / `DOCUMENT_PREFIX` constants and embeds documents via the raw `ollama.embed` client.

## Rules

- Do not introduce LCEL chains or LangGraph; the codebase deliberately keeps calls direct.
- Generation is stateless per call — conversation memory is rebuilt per request from Postgres by
  `load_history`, never held in the process.
- Keep generation local (Ollama). No hosted providers.
- Guardrail/crisis messages never reach LangChain or the LLM — enforced by `core.semantic_router`
  for the current turn and by `load_history` for earlier ones.

Related: [ollama-conventions.md](ollama-conventions.md), [semantic-router-conventions.md](semantic-router-conventions.md).
