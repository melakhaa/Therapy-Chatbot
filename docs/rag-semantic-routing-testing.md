# Running RAG and semantic-routing tests

This guide covers the executable checks and their limits. Historical results live in
[C500](C500_Sajiwa_Pengujian_Produk.md), Tables 2.7 and 2.10; the current measured results and
what is still open are in the [remediation plan](rag-semantic-routing-remediation-plan.md).
The checks are also part of `npm run test:integration` — the commands below are for running
them alone.

## 1. Setup

Use Python 3.12 and the backend virtual environment. From the repository root, once:

```bash
cd apps/backend
python3.12 -m venv venv
venv/bin/python -m pip install -r requirements.txt
```

For general setup see [development conventions](development-conventions.md).
The unit tests below do not require PostgreSQL, Ollama, an API server, or real credentials.

## 2. Focused unit tests (no live stack)

Start from the repository root. Run each file in a fresh process because existing tests modify
module-level dependencies and `sys.modules`:

```bash
cd apps/backend
for test in \
  test_rag_citation \
  test_provenance \
  test_guardrail \
  test_chat_history \
  test_chat_stream \
  test_chat_sessions
do
  venv/bin/python -m unittest discover -s tests/unit -p "${test}.py" -v || exit 1
done
```

| File under `apps/backend/tests/unit/` | Tests | What it establishes |
| --- | ---: | --- |
| `test_rag_citation.py` | 3 | Citation reaches prompt, filename fallback, source instruction |
| `test_provenance.py` | 4 | Corpus-based fixed reply, AI/credential disclaimer, empty corpus fallback, example utterance membership |
| `test_guardrail.py` | 8 | Deterministic crisis normalization and profanity handling |
| `test_chat_history.py` | 6 | History ordering, scope, budget, crisis exclusion and incomplete-turn handling |
| `test_chat_stream.py` | 4 | HTTP SSE framing/termination and persistence failures with stubbed chatbot |
| `test_chat_sessions.py` | 5 | Session listing/scoping, previews, encrypted persistence |

These 30 tests passed when preparing this guide. They do **not** establish embedding routing
accuracy, live retrieval quality, generated-answer citations, or real dispatcher bypass behavior.
The provenance utterance-membership check is not a classifier evaluation.

Run one file by replacing the pattern above, for example:

```bash
# From apps/backend
venv/bin/python -m unittest discover -s tests/unit -p 'test_rag_citation.py' -v
```

Run the complete regression tier after implementation changes:

```bash
# From repository root
npm test
# Backend-only alternative:
npm run backend:test:unit
```

The full `npm test` additionally needs installed npm workspaces and the repository's Node version.

## 3. Live integration tests

### Prepare a disposable local stack

These tests write accounts, chat history, assessments and other records, and perform cleanup.
Use a dedicated local database, **never production or a shared student database**. Interrupted
runs can leave fixtures; cleanup targets synthetic test accounts and related records.

1. Configure `apps/backend/.env` using `.env.example` without overwriting existing settings.
   Set `DATABASE_URL` to the non-superuser application role `sajiwa_app`, plus local
   `JWT_SECRET` and `ENCRYPTION_KEY`. Do not commit secrets.
2. Start PostgreSQL/migrations from the repository root:

   ```bash
   docker compose up -d
   docker compose ps
   ```

3. Start Ollama in a separate terminal if it is not already running:

   ```bash
   ollama serve
   ```

   In another terminal:

   ```bash
   ollama pull nomic-embed-text-v2-moe
   ollama list
   ```

   Install the configured generation model following
   [Ollama conventions](ollama-conventions.md#run). The default is the team's
   `llama3-8b-instruct:Q4_K_M`; substituting `OLLAMA_CHAT_MODEL` changes the evaluation baseline
   and must be recorded. The router embeds utterances at backend startup: unavailable Ollama
   or a missing model can prevent the API from starting.

4. Ingest the corpus **once into an empty/disposable corpus**:

   ```bash
   # From repository root, in a separate shell
   cd apps/backend
   venv/bin/python scripts/embed.py
   ```

   Requires the DOCX files in `apps/backend/docs/`, PostgreSQL and Ollama.
   **This script inserts; rerunning duplicates chunks. Do not import it as a test helper:**
   its ingestion loop runs at module import. Inspect the corpus before deciding to run it;
   do not wipe an existing database to satisfy this guide.

5. Start the API in another terminal:

   ```bash
   # From repository root
   cd apps/backend
   venv/bin/uvicorn main:app --reload
   ```

### Execute

```bash
# From repository root
npm run test:integration
```

This runs `apps/backend/tests/integration/run.sh`: the live `stack_smoke.py`, the router
quality gate (`rag_router_eval.py`), the retrieval gate (`rag_retrieval_eval.py`), and
`db/test_rls.sql`. Each evaluator prints its own matrix/counters; a failure exits nonzero, and
a missing Ollama/model/corpus skips loudly (exit 2) instead of passing silently.
It creates its own test identities; manually seeding dev users is not required for this runner.

Run one evaluator directly:

```bash
# From repository root
cd apps/backend
venv/bin/python tests/integration/rag_router_eval.py     # needs Ollama embeddings only
venv/bin/python tests/integration/rag_retrieval_eval.py  # needs Ollama + the stored corpus
```

Gates inside them were fixed before the fixes landed: macro precision and recall >= 85%,
paraphrase consistency **and** correctness, out-of-domain questions must not reach
`rag`/`provenance`, Hit Rate@5 >= 80%, no context for out-of-domain retrieval, and < 3 s per
retrieval query. Do not lower a pass mark to make a run green.

Relevant existing checks include:

- Crisis and ordinary conversational replies over `/chat`.
- `/rag/context` returns HTTP 200 and a `context` field (not asserted nonempty/relevant).
- Educational chat SSE metadata, multiple tokens, `[DONE]`, and persistence.
  The test does not require the reported route to be `rag` or verify the citation.
- Crisis streaming, a crisis-phrase battery, and ordinary-distress negative cases.
- Encrypted chat storage, history scoping and cross-student isolation.

For the HTTP/DB smoke script alone (omits the separate RLS SQL self-check):

```bash
# From repository root
cd apps/backend
venv/bin/python tests/integration/stack_smoke.py
```

`API_BASE` overrides the HTTP URL (default `http://localhost:8000`). `SMOKE_DB_URL` is a
privileged **test-only** connection used for bootstrap and DB verification; supply a matching
local test DB through your shell if not using the Compose defaults. Never use that privileged
connection as the API's `DATABASE_URL`. The shell runner's RLS step still targets the local
`sajiwa-db` container and its configured local database; it does not follow `SMOKE_DB_URL`.

**Read output, not only exit status:** the runner can print `SKIP integration` and return 0
when Docker/API/DB are unavailable. A skipped HTTP smoke followed by a passing RLS check is
still not a passing RAG/router evaluation. Require actual relevant `PASS` lines and no `FAIL`
or `SKIP`; failed assertions return nonzero.

## 4. Existing RAG performance probe (diagnostic only)

With PostgreSQL, populated corpus and Ollama available (HTTP server is not required):

```bash
# From repository root
cd apps/backend
venv/bin/python scripts/test_rag_performance.py
```

It queries five fixed messages with **k=3**, printing latency, similarity and content previews.
It does not implement C500's 20-query/k=5 evaluation, Hit Rate@5, p95, or a <3s assertion.
It catches per-query exceptions and prints them without failing the process; its average uses
all five queries as denominator even if some failed. Thus exit 0 and the printed average are
**not acceptance evidence**. Inspect every result/error, and do not publish sensitive previews.

## 5. Optional interactive routing smoke

With the same live model/DB setup, from `apps/backend`:

```bash
venv/bin/python -m services.chatbot.core
venv/bin/python -m services.chatbot.rag
```

These execute built-in sample messages and print replies. They can invoke generation and take
minutes; neither has correctness assertions. The RAG module's sample block calls the shared
chat dispatcher, so it does not force every sample through RAG. These are manual probes, not
extra passing tests.

## 6. What still cannot be run

- **Generated-answer grounding**: answers can be produced and their citation presence checked,
  but no automated check proves the claims are supported by the retrieved text. That needs
  human review.
- **Generation latency gate (<40 s)**: deliberately out of scope (Tahap 4 of the remediation
  plan). The streaming checks prove an answer completes, not that it completes fast.
- **Independent fixture review and literal self-checks** for the metric formulas (Tahap 0).
- **Process-level outage tests** (Ollama down mid-request, DB down during retrieval) — the
  error frames are unit-tested; a real outage run is not.

For future measured runs, save the commit, model/version, corpus/fixture identity, hardware,
thresholds, cold/warm status, per-case results and failures. Keep retrieval time, classification
time, time-to-first-token and full RAG response time separate. Never replace C500's historical
numbers with results from different models/corpora without labeling the new baseline.

Validation for this documentation: `npm test` passed (172 backend tests plus the workspace
suites) and `npm run test:integration` passed without skips, including both evaluators, the RLS
self-check, and the streaming checks.
