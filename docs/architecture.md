# Sajiwa architecture and chatbot flow

Sajiwa is a Bahasa Indonesia mental-health support app for university students. The Expo app
and the separate staff dashboard share one FastAPI backend. The chatbot runs on that backend:
the mobile app renders the conversation, PostgreSQL stores it, and Ollama runs the AI models.

```text
Student app (Expo / React Native) ──┐          ┌── PostgreSQL 17 + pgvector
                                    ├─ FastAPI ┤
Staff dashboard (Next.js) ──────────┘          └── Ollama (embeddings + text generation)
```

## What lives where

| Component | Responsibility | Start here |
| --- | --- | --- |
| Student app | Chat, assessments, journaling, counseling requests, and notifications. Expo Router maps screens to files. | [Chat screen](../apps/mobile/app/chat.tsx), [chat state and actions](../apps/mobile/hooks/useChat.ts) |
| Staff dashboard | Risk summaries, counselor workflows, scheduling, and administration. It calls the same API as mobile, not the mobile app itself. | [sajiwa-dashboard (separate repo)](https://github.com/melakhaa/sajiwa-dashboard) |
| Shared TypeScript packages | `api-client` handles requests, authentication headers, streaming, and device storage; `ui-shared` provides the theme and auth hook; `utils` contains helpers like the local stress score. | [packages/](../packages/) |
| FastAPI (Python 3.12) | Authenticates requests, enforces access rules, handles application workflows, and runs the chat pipeline. | [main.py](../apps/backend/main.py), [routes/](../apps/backend/routes/), [chatbot services](../apps/backend/services/chatbot/) |
| PostgreSQL + pgvector | Stores app data and reference document embeddings in the same database. Python uses parameterized SQL via psycopg, not an ORM. | [Database schema](../db/TABLES.md), [migrations](../db/migrations/), [DB access](../apps/backend/core/db.py) |
| Ollama | Runs `nomic-embed-text-v2-moe` for routing and retrieval and `llama3-8b-instruct:Q4_K_M` by default for text generation. LangChain adapts messages and model calls; the app controls the pipeline directly. | [llm.py](../apps/backend/services/chatbot/llm.py), [Ollama setup](ollama-conventions.md) |

## What happens when a student sends a message

1. **Mobile shows the message immediately.** `useChat` adds the student's bubble, shows a typing
   indicator, and sends the message and current `session_id` through the
   [API client](../packages/api-client/src/api.ts).
2. **FastAPI authenticates and routes it.** [`POST /chat/stream`](../apps/backend/routes/chat.py)
   takes the caller's identity from the bearer JWT, not the request body. The server picks the
   route and, if a session ID was supplied, attempts to save the encrypted student message
   before generating a reply.
3. **The client gets the risk flag before the reply.** The first server-sent event (SSE) carries
   `route` and `is_high_risk`. The app can open the crisis support sheet immediately, but keeps
   the typing indicator visible until the first text chunk.
4. **The reply arrives in chunks.** The chatbot yields either a fixed reply or chunks from
   Ollama. The app reads the stream with `expo/fetch` and appends each chunk to the same bubble.
   If the session ID was supplied, the backend attempts to save the full reply before sending
   `[DONE]`. A generation exception sends an error instead and skips saving the partial reply.
   The app treats a stream that ends without `[DONE]` as a failure, not a completed answer.

`POST /chat` is the non-streaming alternative. It uses the same routing and answer logic and
returns the result as JSON. The app does not need to call the router or RAG endpoints separately.

## How the chatbot chooses a reply

[`core.py`](../apps/backend/services/chatbot/core.py) checks for crisis patterns in the original
message before using embeddings. Otherwise, Semantic Router compares the message's embedding
with example utterances for each route. If nothing matches, it defaults to `conversational`.

| Route | Used for | What happens |
| --- | --- | --- |
| `guardrail` | Possible self-harm or harm to others | Returns a fixed crisis reply with hotline information. The text is never sent to the generation model on this path. |
| `provenance` | Questions about Sajiwa's identity, credentials, or sources | A template identifies Sajiwa as an AI, not a psychologist, and lists citations from the stored corpus. No generation. |
| `conversational` | Greetings and emotional support, e.g. “Aku sedang sedih” | Ollama receives the Sajiwa persona prompt, recent history, and the current message. |
| `rag` | Factual mental-health questions, e.g. “Apa itu depresi?” | Retrieves relevant passages and asks Ollama to answer from them. If nothing matches, returns a fixed no-context reply without generation. |

Crisis handling takes priority. The remaining paths first check for narrow refusal patterns
(e.g. requests for internal instructions, a personal diagnosis or prescription, or another
user's data). After the provenance check, the generation paths strip recognized Indonesian and
Javanese profanity from the current message and use a fixed reply if nothing remains.

### Where RAG gets its information

Retrieval-augmented generation (RAG) looks up references **before** asking the model to answer.
[`scripts/embed.py`](../apps/backend/scripts/embed.py) reads DOCX files from
[`apps/backend/docs/`](../apps/backend/docs/), extracts paragraphs and table rows, and splits
the text into 500-character windows with 50 characters of overlap. It stores each chunk, its
768-dimensional embedding, and citation metadata in `documents`. The bundled guide is cited
as *Petunjuk Teknis Layanan Depresi (Kemenkes RI, 2021)*.

[`rag.py`](../apps/backend/services/chatbot/rag.py) embeds the current question and uses
`match_documents` to fetch up to five chunks above a cosine similarity of `0.35`. It adds
short excerpts from neighboring chunks to recover some of the context across chunk boundaries.
The prompt treats those passages as reference data, not instructions, and asks the model
to start its Bahasa Indonesia answer with `Menurut <source>, …`. This is a prompt instruction,
not a separate citation verifier.

## Conversation history, privacy, and staff alerts

- **Resuming a chat:** The app persists only the active conversation ID, not the transcript.
  `GET /chat/sessions` lists the caller's conversations, and `GET /chat/history` loads the
  selected transcript. Session previews are decrypted and shortened on read rather than saved
  as plaintext titles. A new chat does not appear in the list until its first message is saved.
- **Model memory:** [`history.py`](../apps/backend/services/chatbot/history.py) reads up to 10
  recent non-crisis message rows for that user and session, caps the text at 4,000 characters,
  and presents it oldest first. It drops a trailing unanswered student message so the current
  message is not duplicated in the prompt. Ollama is not the store for conversation history.
- **Access:** Message bodies and crisis trigger text are Fernet-encrypted at rest. `ENCRYPTION_KEY`
  stays on the backend. FastAPI connects as the non-superuser `sajiwa_app` and sets the
  authenticated user ID per transaction so PostgreSQL row-level security keeps transcripts
  scoped to their owner.
- **Escalation:** The [on-device stress score](../packages/utils/src/stressDetection.ts) can show
  the support sheet independently of the backend risk flag. It is a UI heuristic, not a
  clinical assessment, and does not by itself write a server alert. A persisted `guardrail`
  turn creates a safety signal; tapping **Kabari tim** is a separate `POST /chat/report`
  request for follow-up. [`/admin/attention`](../apps/backend/routes/admin_operations.py)
  shows signal metadata to admins, not the chat transcript or raw trigger text.
- **Dashboard updates:** PostgreSQL change notices reach the dashboard through the staff-only
  [`/realtime` WebSocket](../apps/backend/routes/realtime.py). The notice only names the area
  that changed, such as `signals`; the dashboard then refetches data through authorized REST
  endpoints. This is separate from the SSE stream that delivers chat replies.

## Running it locally

Follow the [README](../README.md) for setup. Docker Compose runs PostgreSQL, applies migrations,
and provides pgAdmin; it does not run FastAPI, Expo, or Ollama. Start Ollama with the embedding
model installed **before** starting FastAPI: Semantic Router embeds its example utterances on
import. The generation model tag can be overridden with `OLLAMA_CHAT_MODEL`.

For a fresh DB, run `venv/bin/python scripts/embed.py --apply` from `apps/backend` after setting
up Ollama and the backend env. Without `--apply` the script only previews the chunks; with it,
it backs up and replaces the stored chunks for each source. Set `EXPO_PUBLIC_API_URL` on mobile
and `NEXT_PUBLIC_API_URL` on the dashboard to the same FastAPI instance. On a physical phone,
use an address the phone can reach rather than `localhost`.

For more detail, see the [routing rules](semantic-router-conventions.md),
[security conventions](security-conventions.md), and [test tiers](testing-conventions.md).
