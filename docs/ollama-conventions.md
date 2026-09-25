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

```python
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage

llm = ChatOllama(model="llama3.2:3b")
llm.invoke([HumanMessage(content=prompt)]).content
```

Used in `conversational.py` (system prompt + user message) and `rag.py`
(retrieved context + question). Responses are Bahasa Indonesia.

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
- If Ollama isn't running, routing falls back to a zero-vector `MockEncoder` and answers degrade —
  treat "no Ollama" as a dev-only state.
- Never send guardrail (crisis) messages to the LLM; they are handled by fixed responses
  (see [semantic-router-conventions.md](semantic-router-conventions.md)).
- `ponytail:` comments mark known limits (e.g. stateless per-request chat).

## Run

```bash
ollama serve
ollama pull llama3.2:3b
ollama pull nomic-embed-text-v2-moe
```
