# Chat generation and local embeddings

Ollama runs **local embeddings only**. DeepSeek handles answer generation when explicitly
enabled. Prompts still use `langchain-core` messages; RAG retrieval is SQL on PostgreSQL + pgvector.

## Models

| Purpose | Model | Client |
|---------|-------|--------|
| Intent routing | `nomic-embed-text-v2-moe` | `semantic_router.encoders.OllamaEncoder` |
| Chat generation | DeepSeek V4.1 Flash (`deepseek-flash`) | `httpx` in `services/chatbot/llm.py` |
| RAG query embeddings | `nomic-embed-text-v2-moe` | `langchain_ollama.OllamaEmbeddings` (`embed_query`) |
| Document ingestion embeddings | `nomic-embed-text-v2-moe` | `ollama.embed(...)` |

## Generation

`core.chat_stream` dispatches the fixed replies first, then calls `llm.generate()` for eligible
turns. Both chat endpoints use it. The backend uses a non-streaming completion with thinking
disabled, safety review enabled, 768 output tokens, and a 45-second overall deadline. The SSE
endpoint still sends routing metadata first but does not show answer text until review completes.
Missing cloud config does not disable local fixed replies or unrelated endpoints.

- Put persona and policy instructions in the system role. Keep the current message and any
  approved reference data in the user role.
- Past turns stay in the encrypted transcript and are never used as DeepSeek prompt history.
  Only the current turn (at most 4,000 characters, with basic identifier redaction) and eligible
  RAG excerpts are sent. Redaction is not anonymization.
- `DEEPSEEK_RAG_SOURCES` is an explicit comma-separated allowlist of reviewed `metadata.source`
  values. A cloud RAG prompt only uses hits with one of those names and a non-empty citation.
  An empty allowlist or no qualifying hit gives the fixed no-context reply. Review source
  content again before replacing an approved file under the same name.
- Get privacy approval before using real student data. See the
  [migration plan](deepseek-migration-plan.md) and [security rules](security-conventions.md).

## RAG ingestion & retrieval

`apps/backend/scripts/embed.py` reads `apps/backend/docs/*.docx`, extracts paragraphs + tables,
chunks at `size=500 / overlap=50`, embeds, and writes `documents` (`metadata.source`,
`metadata.chunk`). It is a **dry run by default**; `--apply` replaces each source atomically:
all chunks are embedded and validated (768 dimensions) before the old rows are deleted, the
replacement happens in one transaction, and the old rows are first dumped to a JSON file whose
path is printed. Importing the module does nothing — the ingestion loop lives in `main()`.

Retrieval is `select * from match_documents(%s::vector, 0.35, k)` (`rag.MIN_SIMILARITY`)
plus a bounded slice of each
hit's neighbouring chunks (`rag.NEIGHBOUR_WING`), because table rows and list items in the
guide cross chunk boundaries. The returned entries keep the old shape (`content`, `metadata`,
`similarity`) and stay at `k` or fewer. See [postgresql-conventions.md](postgresql-conventions.md).
The measured gates are `tests/integration/rag_retrieval_eval.py`.

- Pin model names; all call sites share `EMBED_MODEL` from `services/chatbot/rag.py`.
- Every chunk carries `metadata.citation` — the label a student sees, written by
  `scripts/embed.py` from its `CITATIONS` map (`"Buku Depresi REVISI FINAL.docx"` →
  `"Petunjuk Teknis Layanan Depresi (Kemenkes RI, 2021)"`). The raw filename is internal and
  must not reach the model. A new document with no entry is ingested with `null` and the prompt
  falls back to its filename — add the entry when you add the file.
- `build_messages` prefixes each chunk with `[<citation>]` in a separate **user-role data
  message**, not in the system message. `RAG_SYSTEM_PROMPT` says to ignore instructions in
  retrieved text. Cloud answers must open with `Menurut <citation>,` (optionally bracketed);
  the backend rejects a missing or unknown citation. Changing a citation is metadata-only: backfill with
  `update documents set metadata = metadata || jsonb_build_object('citation', …)` — no
  re-embed, because the vectors do not change.
- Deletion during ingestion is gated by migration 012's `documents_replace_for_ingest`
  policy: it fires when the transaction sets `app.embedding_ingest = 'on'`. The script uses
  this flag, but a DB client can also set it; it is an ingestion guard, not an authorization
  boundary against a compromised DB client.
- Chunking was evaluated, not guessed: sentence-packed, one-unit-per-chunk and word-boundary
  windows were all measured against the 15 retrieval fixtures and did not beat the plain
  500/50 window (the word-backoff variant also pushed an out-of-domain query above the 0.3
  threshold). Neighbour slices in `retrieve_docs` recover some, not all, boundary misses.
  The 17 November calibration compared 0.30/0.35/0.40/0.45 across 45 domain and 15 OOD
  regression queries: 0.35 removed the MySQL false positive without losing phrase hits
  (13/15, 13/15, 12/15). This does not establish semantic relevance on unseen queries.
- `nomic-embed-text-v2-moe` requires task prefixes and does not add them itself: documents are
  embedded as `"search_document: "`, queries as `"search_query: "`. The `QUERY_PREFIX` /
  `DOCUMENT_PREFIX` constants in `rag.py` are the single source of truth — keep the pair matched
  or similarity degrades silently. Changing either invalidates every stored vector: re-embed via
  `scripts/embed.py`. `OllamaEmbeddings` is a module-level singleton in `rag.py`.

## Failure mode

If Ollama isn't running the backend **fails to start**: `SemanticRouter(...)` embeds every route
utterance at import, so the exception surfaces there and nothing serves. That is deliberate — a
zero-vector fallback would route everything to one route while looking healthy. See
[semantic-router-conventions.md](semantic-router-conventions.md).

`ponytail:` comments mark known limits (e.g. no per-user rate limit on generation).

## Run

```bash
ollama serve
ollama pull nomic-embed-text-v2-moe
# No local chat generation model is needed on this branch.
```
