# Ollama & LLM conventions

All generation and embeddings run **locally via Ollama** through `langchain-ollama`
(and the raw `ollama` client for ingestion). No hosted LLM provider.

## Models

| Purpose | Model | Client |
|---------|-------|--------|
| Intent routing | `nomic-embed-text-v2-moe` | `semantic_router.encoders.OllamaEncoder` |
| Chat generation | `llama3.2:3b` | `langchain_ollama.ChatOllama` |
| RAG query embeddings | `nomic-embed-text-v2-moe` | `langchain_ollama.OllamaEmbeddings` (`embed_query`) |
| Document ingestion embeddings | `nomic-embed-text-v2-moe` | `ollama.embed(...)` |

## Generation

One shared client, `services/chatbot/llm.py` — import it, never construct another
`ChatOllama`:

```python
from langchain_core.messages import HumanMessage, SystemMessage
from services.chatbot.llm import llm

messages = [SystemMessage(content=system), *history, HumanMessage(content=user)]
for chunk in llm.stream(messages):      # what core.chat_stream does
    yield chunk.content
```

Generation happens in exactly one place, `core.chat_stream`. `/chat` is that generator joined, and
`/chat/stream` forwards it as SSE — so the two endpoints cannot answer differently. The prompt is
built by `build_messages()` in `conversational.py` (persona) or `rag.py` (retrieved context, or
`None` when retrieval found nothing → `NO_CONTEXT_REPLY`).

Instructions always go in a `SystemMessage`, never a `HumanMessage` — shared roles are the easy
prompt-injection path.

`llm.py` pins `num_ctx` (history is prepended, so the prompt grows), `keep_alive`, and an httpx
timeout, all overridable via `OLLAMA_NUM_CTX` / `OLLAMA_TEMPERATURE` / `OLLAMA_TIMEOUT`.

## Conversation memory

The model is stateless: "memory" is the last `HISTORY_TURNS` rows re-read per request by
`services/chatbot/history.py` (`load_history`) and prepended to the prompt, oldest first.
Redis not needed — it is one indexed query.

Two rules there, both load-bearing:

- `route_used is distinct from 'guardrail'` — crisis turns must never reach the LLM (see the
  non-negotiable below). Both rows of a crisis exchange carry that route.
- `user_id` comes from the JWT, so RLS scopes the read; the amount of history is bounded by
  `HISTORY_CHAR_CAP` to stay under `num_ctx`.

## RAG ingestion

`apps/backend/scripts/embed.py` reads `apps/backend/docs/*.docx`, extracts paragraphs + tables,
chunks at `size=500 / overlap=50`, embeds, and inserts into the `documents` table
(`metadata.source`, `metadata.chunk`). Run from `apps/backend`:

```bash
cd apps/backend && python scripts/embed.py
```

Retrieval is `select * from match_documents(%s::vector, 0.3, k)` through `core/db.py`
— see [postgresql-conventions.md](postgresql-conventions.md).

## Conventions

- Pin model names; all call sites share `EMBED_MODEL` from `services/chatbot/rag.py`
  (`core.py` routing, `rag.py` queries, `scripts/embed.py` ingestion).
- `nomic-embed-text-v2-moe` requires task prefixes and does not add them itself: documents are
  embedded as `"search_document: "` (`embed.py`), queries as `"search_query: "` (`rag.py`). The
  `QUERY_PREFIX` / `DOCUMENT_PREFIX` constants in `rag.py` are the single source of truth — keep the
  pair matched or similarity degrades silently.
- Changing an embedding prefix invalidates every stored vector: re-embed the `documents` table
  (`scripts/embed.py`) after any prefix or model change.
- If Ollama isn't running the backend **fails to start**: `OllamaEncoder()` itself does not raise,
  but `SemanticRouter(...)` embeds every route utterance at import, so the exception surfaces there
  and nothing serves. That is deliberate — a zero-vector fallback would route every message to the
  same route while looking healthy.
- Never send guardrail (crisis) messages to the LLM; they are handled by fixed responses
  (see [semantic-router-conventions.md](semantic-router-conventions.md)). `load_history`
  enforces this for the memory path; the chat route enforces it for the current turn.
- `ponytail:` comments mark known limits (e.g. no per-user rate limit on generation).

## Run

```bash
ollama serve
ollama pull llama3.2:3b
ollama pull nomic-embed-text-v2-moe
```
