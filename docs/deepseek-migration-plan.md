# Plan: Replace local chat generation with DeepSeek V4.1 Flash

**Branch:** `replace-local-llm-with-deepseek` · **Status:** Backend verified with synthetic data; mobile checks and release approval pending.

## Target and scope

Use DeepSeek’s first-party `POST https://api.deepseek.com/chat/completions` with `model: "deepseek-flash"`. The [official model table](https://api-docs.deepseek.com/quick_start/pricing) (checked 2026-11-19) maps that API name to **DeepSeek-V4.1-Flash-1017**. The alias may change, so recheck it before release; the version name is not the request model ID.

Replace `ChatOllama` for conversational and RAG answer generation only. Keep Ollama running `nomic-embed-text-v2-moe` for semantic routing, retrieval, and document ingestion. No embedding changes, re-indexing, or database changes are needed for the generation swap itself. Keep the Sajiwa persona, Bahasa Indonesia responses, local safety and policy decisions, and the existing chat API success shapes. No provider abstraction, automatic model fallback, web tools, or file uploads.

## Setup and release prerequisites

Edit the existing, Git-ignored `apps/backend/.env` (use `.env.example` only as a template):

```dotenv
DEEPSEEK_API_KEY=your_staging_key_here
DEEPSEEK_ALLOW_CHAT_EGRESS=0
DEEPSEEK_RAG_SOURCES=
```

Set egress to `1` only in isolated synthetic staging or after privacy approval. For staging RAG,
list the exact `metadata.source` values of reviewed documents, comma-separated; blank shares no
references. Restart FastAPI after editing the file. Leave `DEEPSEEK_ALLOW_CHAT_EGRESS=0` on any
unapproved deployment even if a key is present.

- [x] Verify the configured [DeepSeek API key](https://platform.deepseek.com/api_keys), HTTPS egress, model access (`GET /models`), and a synthetic completion.
- [ ] Confirm pilot rates, concurrency and budget. For deployment, store the key in the backend secret store; never use `EXPO_PUBLIC_*` or send the key to the app.
- [ ] Get privacy/security approval **before sending any real student data**. Encrypted database storage does not protect the decrypted text sent to DeepSeek. Confirm whether the service is approved for student mental-health content, including retention/deletion, training use, prompt caching and isolation, processing region and cross-border transfers, and what disclosures or consent are required. Also confirm which RAG documents are licensed and approved to leave the backend. Until then, use synthetic text and synthetic or approved public fixtures only.
- [ ] Agree what may leave the backend. Start with the minimum approved current message and, for RAG, the minimum approved excerpts with citation labels. Do not send prior chat by default; if approved, explicitly bound and redact any history and exclude pre-approval and crisis turns. Do not include student/session identifiers, account metadata, journals, assessment answers, or crisis logs. Free text can still identify a student; define and test redaction and when to withhold a request. The current [mobile consent sheet](../apps/mobile/components/ui/ConsentSheet.tsx) and [consent endpoint](../apps/backend/routes/account.py) track one unversioned acceptance; do not treat it as authorization for third-party processing. If revised consent is required, implement and test a backend check before provider calls (including existing accounts) before release. Never gate the local crisis reply on provider consent.
- [ ] Compare the local baseline below with staging. Agree on thresholds for quality, refusals, latency and spend, and on the delayed-first-text trade-off.

## Implementation order

Follow the repo’s [test-first rules](testing-conventions.md#test-driven-development-is-required): one failing test at an agreed seam, then the smallest change to make it pass. Use the existing `core.chat_stream` and FastAPI route seams. Simulate the provider at the HTTP boundary with synthetic fixtures; unit tests must not need a real key or network. Agree on the new consent seam first if consent handling changes.

1. **Swap the shared generator.** Replace [the `llm.py` client](../apps/backend/services/chatbot/llm.py) behind [`core.chat_stream`](../apps/backend/services/chatbot/core.py) so both `/chat` and `/chat/stream` use the same path. Map the existing `SystemMessage`, `HumanMessage`, and `AIMessage` to `system`, `user`, and `assistant` in order. Keep retrieved text in a user-role message labeled as reference data, never in the system role. Use the provider’s non-streaming response (`stream: false`) with `thinking: {"type": "disabled"}` and `safety_check: {"level": "high"}` for the student-facing app. Start with a bounded `max_tokens` (e.g. 768), tune it on staging, and do not carry over Ollama context, keep-alive, or temperature settings (Flash ignores temperature in non-thinking mode). Set connect/read and overall deadlines; upstream keep-alive whitespace must not extend the overall budget. No automatic retries in v1. Missing credentials must fail cloud generation safely without disabling fixed local replies or unrelated routes.
2. **Keep the student-facing chat contract.** Preserve `/chat/stream` metadata first (`route`, `is_high_risk`), then a `token` frame containing the approved answer, then `[DONE]`; keep the existing `/chat` success body. DeepSeek can refuse after generating text, so only use `choices[0].message.content` from a complete, non-empty response with `finish_reason: "stop"`. Never use reasoning text. For RAG, verify the answer opens with a citation from the retrieved chunks before sending it. This preserves SSE framing but **does not show live tokens during upstream generation**. On a refusal (`content_filter` or a safety rejection), timeout, malformed/dropped response, token limit, or API error (e.g. `401`, `402`, `429`, `5xx`), send the existing `generation_failed` event without `[DONE]`, or a generic gateway/unavailable response for `/chat`. Keep the streaming user turn as today, but never save an empty, blocked, or partial assistant reply. Log only sanitized categories/status/timings and usage counters, not provider bodies, prompts, answers, or credentials.
3. **Prove fixed paths stay local.** Test crisis (including a caller-supplied alternate route), provenance, policy refusals, profanity-only input and RAG with no context with the provider disabled or failing. Assert zero outbound generation calls for those paths, no crisis-turn text in outbound history, and unchanged hotline text and crisis logging. Test successful conversational and cited RAG responses, consent/no-consent where applicable, outages, incomplete responses, and provider refusals. Verify rejected or incomplete answers are never displayed or persisted. Keep history encryption, session ownership and RLS unchanged.
4. **Update setup and validation.** Adjust `apps/backend/.env.example`, declare the chosen HTTP client directly in `requirements.txt` if it is not already listed, and update the setup/convention docs (`README.md`, `docs/development-conventions.md`, `docs/ollama-conventions.md`, and test docs). Keep `langchain-ollama` and `ollama` for embeddings. Remove generation-only Ollama setup from the normal path. Update the chat smoke and `chat_adversarial_eval.py` for the provider prerequisites and report fields; routing and retrieval evaluators stay local. Mark live chat-generation checks as opt-in and report any skipped checks explicitly.

## Verification so far

- `npm test` passed. The loopback [DeepSeek simulation](../apps/backend/tests/integration/deepseek_simulation.py)
  passed for both routes, including refusal, malformed/empty response, rate limit, and an overall
  timeout despite keep-alive. It uses a fake key and stubbed DB/embeddings. The stand-in follows
  the provider docs; the Postman CLI install timed out, so no hosted workspace mock was used.
- `GET /models` confirmed that the configured account offers `deepseek-flash`. On a disposable
  Postgres database with real Ollama embeddings and only a synthetic RAG document, the live
  FastAPI smoke run passed **106 checks**. DeepSeek answered both `/chat` and `/chat/stream`;
  the cited RAG reply showed its first text at **3.2 s** in the passing run. The fixed crisis
  reply, encrypted history, and access isolation also passed. No real student data was sent.
- Postgres RLS/auth and both local router/retrieval gates passed. Local retrieval Hit Rate@5:
  **13/15** (default) and **12/15** (remediation). The real reference corpus was loaded only
  after the disposable API stopped, with DeepSeek egress disabled for those checks.
- Live adversarial regression: **18 synthetic cases**, **0 automated failures**. A read-through
  of the nine cases flagged for review found no obvious instruction disclosure or individualized
  diagnosis/prescription in that sample. This is not clinical validation.
- Local baseline (old `llama3-8b-instruct:Q4_K_M`, two synthetic prompts, no real student data):
  conversation **53.0 s** to first text / **78.4 s** total; RAG with a synthetic excerpt
  **20.3 s** / **34.0 s**, with the expected opening citation. This is not a benchmark or a
  clinical quality review.

## Release gates and rollback

- [x] Run unit, loopback simulation, live API, local routing/retrieval and RLS checks. Live tests used a disposable database; the integration components were run against it rather than using the runner's default database container.
- [x] Run synthetic conversation, RAG and adversarial checks with the configured key.
- [ ] On a mobile device, verify the typing indicator waits for visible text, errors clear it, and the crisis card appears promptly without cloud generation.
- [ ] Review local crisis false negatives before any student traffic leaves the backend (including the [recorded holdout miss](rag-semantic-routing-testing-results.md#4-new-holdout-frozen-before-execution)). After safety and privacy approval, start with a limited deployment. Track time to first visible text, completion time, filtered/error rates and token spend without collecting chat text. If cost, latency, safety or answer quality misses the agreed thresholds, roll back to the previous backend release and disable the DeepSeek key/egress for that deployment. Keep the local generation artifact/config available until the pilot passes; do not silently fail over per request.

Provider references: [Quickstart](https://api-docs.deepseek.com/), [Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion), [Content Safety](https://api-docs.deepseek.com/guides/safety), [Error Codes](https://api-docs.deepseek.com/quick_start/error_codes), [Rate Limits](https://api-docs.deepseek.com/quick_start/rate_limit).
