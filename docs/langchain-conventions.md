# LangChain conventions

The project uses **LangChain only as an LLM/message adapter** — `langchain-core` for messages and
`langchain-ollama` for the local model. There are **no chains, agents, retrievers, or vector-store
abstractions**; RAG retrieval is done manually against Supabase.

## Packages

- `langchain-core>=0.2.0` — `messages.HumanMessage`.
- `langchain-ollama>=0.1.0` — `ChatOllama`, `OllamaEmbeddings`.

## Patterns

```python
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage

llm = ChatOllama(model="llama3.2:3b")

# conversational.py
llm.invoke([HumanMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_message)]).content

# rag.py
llm.invoke([HumanMessage(content=prompt)]).content
```

- One module-level `llm = ChatOllama(model="llama3.2:3b")` per service file; never construct per request.
- `SYSTEM_PROMPT` is passed as an extra `HumanMessage` (there is no `SystemMessage` usage) — follow the
  existing pattern.
- Return the string via `response.content`; handlers wrap it in the API shape.
- `OllamaEmbeddings(model="nomic-embed-text-v2-moe")` is imported in `rag.py`, but retrieval actually
  calls the same model through the router encoder / `ollama` client — keep model names in sync.

## Rules

- Do not introduce LCEL chains or LangGraph; the codebase deliberately keeps calls direct and stateless.
- Keep generation local (Ollama). No hosted providers (the README's "LiteLLM" is not in the code or
  `requirements.txt`).
- Guardrail/crisis messages never reach LangChain or the LLM.

Related: [ollama-conventions.md](ollama-conventions.md), [semantic-router-conventions.md](semantic-router-conventions.md).
