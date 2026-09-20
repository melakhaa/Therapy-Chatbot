# Ollama & LLM conventions

All generation and embeddings run **locally via Ollama** through `langchain-ollama`
(and the raw `ollama` client for ingestion). No hosted LLM provider, despite "LiteLLM"
appearing in the README.

## Models

| Purpose | Model | Client |
|---------|-------|--------|
| Intent routing + query embeddings | `nomic-embed-text-v2-moe` | `semantic_router.encoders.OllamaEncoder` |
| Chat generation | `llama3.2:3b` | `langchain_ollama.ChatOllama` |
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

Retrieval is `supabase.rpc("match_documents", {query_embedding, match_threshold: 0.3, match_count: 5})`
— see [supabase-conventions.md](supabase-conventions.md).

## Conventions

- Pin model names; all three call sites must agree on the embedding model or vector search breaks.
- Embedding input is prefixed `"passage: "` for documents (see `embed.py`); keep query/document
  prefixes consistent with the model's expectations.
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
