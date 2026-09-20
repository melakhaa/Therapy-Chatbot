# Semantic Router conventions

Intent routing lives in `apps/backend/services/chatbot/`. Library: `semantic-router`
(`>=0.0.72`). The router is the decision layer — it picks a route; each route then has its
own handler.

## Pipeline

```
user message
   → semantic_router(message)          core.py
       ├─ "guardrail"      → HARDCODED_RESPONSE             guardrail.py
       ├─ "conversational" → LLM reply                      conversational.py
       └─ "rag"            → retrieve_docs() → LLM answer   rag.py
```

`core.py` builds the single router and exposes `chat(user_message)`:

```python
semantic_router = SemanticRouter(
    routes=[guardrail_route, conversational_route, rag_route],
    encoder=OllamaEncoder(name="nomic-embed-text-v2-moe"),
    auto_sync="local",
)
```

Speech-to-intent calls are `semantic_router(message)` → `.name` is the matched route
(falls back to `"conversational"` when `None`).

## Defining a route

Each route is a `semantic_router.Route(name, utterances=[...])`. Utterances are **Indonesian**
and are the only thing that trains the match — adding a capability usually means adding
utterances, not new branching logic.

- **guardrail** (`guardrail.py`) — self-harm / harm-to-others phrases. Handler returns the
  fixed `HARDCODED_RESPONSE` with hotlines. Never route this to an LLM.
- **conversational** (`conversational.py`) — greetings and emotional support. Persona "Hana",
  warm Bahasa Indonesia `SYSTEM_PROMPT`.
- **rag** (`rag.py`) — factual mental-health questions; see
  [ollama-conventions.md](ollama-conventions.md) for retrieval + generation.

## Conventions

- Keep one file per route; export the `Route` object and its handler.
- `semantic_router` is a module-level singleton in `core.py` — don't rebuild per request.
- `auto_sync="local"`; if the Ollama encoder is unreachable, `core.py` falls back to a
  zero-vector `MockEncoder` (degraded routing).
- Expose results over HTTP as `{ route, is_high_risk, response }` (`routes/chat.py`).
- Every chatbot file has an `if __name__ == "__main__":` block of sample utterances to
  smoke-test routing. Use it when tuning utterances.
