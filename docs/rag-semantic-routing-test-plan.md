# RAG and semantic routing: missing-test plan

Status: **partly implemented.** The P0 contracts, the P1 router/retrieval evaluators and the
P2 retrieval-latency gate now exist; the generation-latency gate, independent fixture review and
process-level outage runs are still open. Results and the remaining work are in the
[remediation plan](rag-semantic-routing-remediation-plan.md).
Scope: C500 Tables 2.7 and 2.10, plus directly related safety, API, and latency checks.
See [C500](C500_Sajiwa_Pengujian_Produk.md) and the [run guide](rag-semantic-routing-testing.md).

C500 records historical executions. The corresponding 100-label router dataset, 40 paraphrases,
15 in-domain/5 out-of-domain retrieval cases, and complete evaluation runner were not found in
this checkout. Missing reproducible automation does **not** mean the historical tests never ran.
Do not copy C500's results into a new run or call existing smoke tests full C500 coverage.

## 1. Existing coverage and remaining gaps

Paths below are relative to `apps/backend/`.

| C500 test | Existing evidence in code | Missing automated coverage |
| --- | --- | --- |
| SJW-ROU-001 conversational classification | Live smoke checks a conversational reply | Held-out labels and per-class correctness; reply length alone does not prove route |
| SJW-ROU-002 RAG classification | Live smoke asks an educational streaming question | Explicit `rag` assertion; held-out factual topics, including C500 misses |
| SJW-ROU-003 provenance classification | `tests/unit/test_provenance.py` checks fixed reply and presence of sample utterances | Real embedding-based classification; utterance membership does not establish routing |
| SJW-ROU-004 crisis priority | `test_guardrail.py` and live crisis battery | Assert the real dispatcher bypasses embedding/generation for deterministic crisis matches |
| SJW-ROU-005 fallback | Fallback exists in HTTP/chat code | No-match classification produces `conversational`, never an empty route |
| SJW-ROU-006 paraphrases | None found | Versioned groups, consistency and label correctness scored separately |
| SJW-ROU-007 confusion matrix | None found | Four-class matrix, per-class and macro precision/recall/F1, accuracy |
| SJW-RAG-001 DOCX extraction | Extraction implementation only | Fixture with paragraphs and tables interleaved; literal expected order/content |
| SJW-RAG-002 chunking | Chunking implementation only | Empty, short, exact-boundary and multi-chunk texts; max length, overlap, no lost text |
| SJW-RAG-003 embeddings | Ingestion/query implementations only | Document/query task prefixes, vector dimensions and stored metadata with real ingestion evidence |
| SJW-RAG-004 relevant retrieval | Smoke asserts HTTP 200 and `context` key; performance probe prints results | Known relevant fixture, nonempty result, top-5 limit and strict score >0.3 |
| SJW-RAG-005 no context | Empty-result branch exists | Empty retrieval returns fixed reply through actual dispatch and never calls generation |
| SJW-RAG-006 Hit Rate@5 | None found | Versioned relevance judgments, 15+5 cases, asserted ≥80% in-domain hit rate |
| SJW-RAG-007 citations | `test_rag_citation.py` checks prompt citation and filename fallback | Actual generated answer cites returned metadata; missing metadata fallback; multiple sources |
| SJW-RAG-008 latency | `scripts/test_rag_performance.py` prints five timings at k=3 | Assert <3s per query at k=5; cold/warm samples, percentiles, failures included |

Related existing checks: `test_chat_history.py` covers history ordering/budget/crisis filtering;
`test_chat_stream.py` covers SSE and persistence failures with a stubbed chatbot;
`test_chat_sessions.py` covers session scoping/previews and encrypted persistence.
These do not execute the real router or RAG dispatcher. Some legacy unit tests replace owned
modules; do not repeat that approach in new tests.

## 2. Proposed seams and implementation order

Follow [testing conventions](testing-conventions.md). No test or production code is added by this plan.
New seams marked **approval needed** must be agreed and added to the conventions before implementation.
Mock only external boundaries (DB, Ollama/network), not the router/RAG code under test.

### P0 — deterministic contracts and safety

- [ ] **Ingestion seam — approval needed:** `extract_text_docx` and `chunk_text` in
  `scripts/embed.py`, unit tier. Catches extraction order and chunk boundaries; misses real
  embeddings/storage. Use a tiny synthetic DOCX and hand-authored expected chunks, not the
  production corpus as the only oracle. The script currently ingests at import: first separate
  its executable entry point safely so importing testable functions cannot write to the DB.
- [ ] **Dispatcher seam — approval needed:** `semantic_router` and `chat_stream` in
  `services/chatbot/core.py`, unit tier with only external boundaries replaced. Catches crisis
  priority, no-match fallback via chat, fixed provenance/no-context replies, and no generation
  on those paths; misses fuzzy model accuracy. Exercise real dispatch, including a crisis
  mixed with profanity. Avoid the existing HTTP tests' whole-chatbot stubs.
- [ ] **Existing RAG prompt seam:** extend `test_rag_citation.py` for empty retrieval,
  missing/null metadata, multiple citations, and system/history/user ordering. Reach the real
  retrieval code with DB/embedding boundary fakes rather than replacing `retrieve_docs`.
- [ ] **Existing live HTTP seam:** strengthen `/rag/context` assertions beyond response shape;
  test missing/invalid JWT, valid JWT, missing/wrong-type `message`, and correct metadata.
  `/router/intent` is currently unauthenticated: record that as a known security gap, not a
  passing authentication guarantee. Requiring auth needs an explicitly agreed behavior change.
- [ ] **Existing live HTTP seam:** assert route metadata for RAG, provenance, conversational,
  and crisis chat; assert SSE errors do not masquerade as successful `[DONE]` completion when
  embedding/retrieval/generation fails. Use a disposable environment for outage cases.

### P1 — reproducible C500 quality evaluation

- [ ] Add reviewed, synthetic fixtures under proposed `tests/integration/fixtures/`:
  100 labeled messages (25 per class), eight paraphrase groups (five each), and 20 retrieval
  cases (15 in-domain, five out-of-domain). Recover original fixtures if available; otherwise
  label these a **new baseline**, not an exact reproduction of C500.
- [ ] Keep evaluation messages separate from route utterances; check normalized exact overlap
  and manually review near-duplicates. Freeze labels before tuning. Include anxiety, CBT,
  referral, identity/credentials, colloquial crisis, and ordinary distress.
- [ ] Add a dedicated live HTTP evaluation script under `tests/integration/` (not yet present).
  It must call the real `/router/intent`, `/rag/context`, `/chat`, and `/chat/stream` as needed,
  produce per-case evidence, and return nonzero for failed assertions or required missing setup.
  Do not duplicate the full-stack bootstrap or invent another test tier.
- [ ] Router acceptance: C500 macro precision and recall ≥85%; print all four classes and
  accuracy separately. Report RAG/provenance per-class failures even if macro metrics pass.
  Paraphrases must be both consistent and correct. The explicit-crisis regression battery
  must all pass; an aggregate metric must not hide a safety regression.
- [ ] Retrieval acceptance: at most five results; in-domain Hit Rate@5 ≥80%; all five
  intentionally out-of-domain cases return no context. Review relevant passages independently
  of retrieval output; store expected passage/source labels and keyword aliases, not DB row IDs.
  PHQ-9 is absent from the documented depression corpus: record this coverage limitation rather
  than pretending it has an expected supporting passage.
- [ ] Add four generated-answer citation cases. Assert `route=rag`, nonempty retrieved context,
  citation from that context, and successful completion. Review groundedness separately:
  citation text alone does not prove the answer is supported.
- [ ] Add focused prompt-injection cases for document/source disclosure and injected instructions
  in synthetic retrieved content. Use an isolated corpus, never real student data; retain failures
  as failures rather than relaxing expectations to match the model.

### P2 — performance and failure evidence

- [ ] Time 20 retrieval cases at k=5, including query embedding. Gate each completed query at
  <3s (C500 TP-10); report count, mean, median, p95, maximum and errors. Do not average errors
  as zero latency. Measure cold start separately from warmed samples.
- [ ] Record router cold/warm timing without inventing a router latency SLA. Record RAG chat
  time-to-first-token and completion separately; C500's end-to-end target is <40s, distinct
  from the <3s retrieval target. Slow hardware is a failed performance target, not a test skip.
- [ ] Exercise unavailable Ollama, missing embedding model and DB failure in an isolated stack.
  Verify startup fails visibly rather than using fabricated vectors, and runtime failures do
  not become fabricated successful answers. Never stop a shared service for these checks.

## 3. Evidence and definition of done

Each run records commit, fixture version/hash, corpus checksum/chunk count, model identifiers
and digests, embedding dimensions, thresholds/k, generation settings, Python/dependency versions,
hardware, cold/warm state, sample counts, per-case predictions/results, durations and errors.
Do not publish JWTs, credentials or real conversations. Commit reviewed synthetic fixtures and
runners; keep sensitive/raw local logs out of Git.

For each slice: write one test, observe its failure for the intended reason, implement only the
needed fix, then run the relevant tier and `npm test`. Tests added solely to describe existing
behavior are characterization tests, not claimed TDD. Do not bulk-write the whole backlog first.

Completion requires reproducible commands in the [run guide](rag-semantic-routing-testing.md),
nonzero failure exits, isolated fixture cleanup, explicit skips, and a C500-ID-to-test mapping.
Update C500 only with a new, dated execution record; preserve its historical results.
