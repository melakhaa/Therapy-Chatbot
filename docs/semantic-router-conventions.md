# Semantic Router conventions

Intent routing lives in `apps/backend/services/chatbot/`. Library: `semantic-router`
(`>=0.0.72`). The router is the decision layer — it picks a route; each route then has its
own handler.

## Pipeline

```
user message
   → semantic_router(message)          core.py  (the only entry point)
       ├─ is_crisis(message)?  ────────→ "guardrail"   <-- deterministic, runs FIRST
       └─ embedding match
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

## Crisis detection is NOT left to the router

`guardrail.is_crisis()` is a normalized keyword check that runs **before** the embedding
match. All four route decisions in `routes/chat.py` import `semantic_router` from
`core.py`, which is the wrapper function — so the keyword net cannot be bypassed.

The router alone is not a safety boundary. In testing it missed:

- "aku udah minum obat banyak"
- "aku pegang pisau sekarang"
- "aku mau loncat dari gedung"

and all three were handled as ordinary conversation by the LLM, with no hotline card and
nothing written to `guardrail_logs`. Embedding distance is not a safety property.

Rules when touching this:

- New crisis wording goes in **both** `CRISIS_PHRASES` in `guardrail.py` and the
  `guardrail_route` utterances. The keyword list matches exact wording (including slang
  and punctuation variants); utterances help the fuzzy matcher with paraphrases.
- Bias toward matching. A false positive shows a student the hotline card — harmless.
  A false negative means a student in crisis is talking to an LLM.
- Keep the battery in `scripts/api_smoke.py` green; it asserts every crisis phrasing is
  flagged, that the reply is the fixed hotline text, and that ordinary distress still
  reaches the normal path.

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
