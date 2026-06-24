# Sanctuary — System Overview & PRD

## Project Overview

AI-powered mental health support platform for students & counselors. Monorepo with 3 apps (mobile, dashboard, backend) and 3 shared packages. Chatbot uses Semantic Router + RAG + Ollama for context-aware therapy support, with stress detection, clinical assessments (PHQ-9/GAD-7/SRQ), journaling, booking, and admin dashboards.

## Architecture & File Map

```
prototype-monorepo/
├── apps/
│   ├── mobile/              # Expo RN app ("Al Sahabat Mahasiswa")
│   │   ├── app/             # expo-router pages (login, register, home, chat, journal, stats, profile, admin)
│   │   ├── components/      # chat/, home/, ui/ sub-dirs + legacy root files
│   │   └── hooks/           # useChat.ts (chat state + stress detection integration)
│   ├── dashboard/           # Expo RN web dashboard ("MindGuard Admin")
│   │   ├── app/             # expo-router pages (login, (dashboard)/ overview)
│   │   └── components/      # themed views, icons, parallax, collapsible
│   └── backend/             # FastAPI Python server
│       ├── main.py          # Entry: registers 14 endpoints (CB-01..CB-14)
│       ├── auth.py          # JWT verification + role-based access deps
│       ├── routes/          # assessment, account, chat, dashboard, jadwal, journal
│       ├── services/chatbot/ # guardrail, conversational, rag, core (semantic router)
│       ├── core/security.py # Fernet AES encryption for chat messages
│       ├── scripts/         # embed.py (doc→vector), test_rag_performance.py
│       └── docs/            # schema.sql, migration.sql, .docx medical refs
├── packages/
│   ├── api-client/          # apiFetch<> wrapper, endpoint fns, storage (AsyncStorage/localStorage)
│   ├── ui-shared/           # SanctuaryColors, Typography, Spacing, ThemeContext, useAuth, useAnimatedEntrance
│   └── utils/               # stressDetection.ts (keyword scoring), aiResponses.ts (response pools)
├── supabase/
│   ├── config.toml          # Local supabase project config
│   └── snippets/            # SQL queries
├── opencode.json            # Agent plugin config
└── skills-lock.json         # Caveman skill lock
```

### Key Endpoints (Backend — CB-01..CB-14)

| ID | Endpoint | Purpose |
|----|----------|---------|
| CB-01 | POST /assessment/submit | Submit self-assessment (PHQ-9/GAD-7/SRQ) |
| CB-02 | POST /assessment/notify-risk | Notify operator of high-risk results |
| CB-03 | GET /guardrail/hotline | Get emergency hotline contacts |
| CB-04 | POST /guardrail/check | Check message for crisis content |
| CB-05 | POST /router/intent | Detect user intent via Semantic Router |
| CB-06 | POST /rag/context | Retrieve RAG context from medical docs |
| CB-07 | POST /chat/stream | Stream chatbot response |
| CB-08 | POST /chat/history | Save/fetch chat history |
| CB-09 | POST /auth/login | Login (returns JWT) |
| CB-10 | GET /dashboard/data | Aggregated dashboard stats |
| CB-11 | GET /accounts | List users (admin) |
| CB-12 | POST /accounts | Create user/register |
| CB-13 | PUT /accounts/{user_id} | Update user |
| CB-14 | DELETE /accounts/{user_id} | Delete user |

### Semantic Router Flow (chatbot)

```
User message → Guardrail check (suicide/SH keywords?)
  ├─ YES → hardcoded crisis response + hotline
  └─ NO → Semantic Router (Ollama encoder)
       ├─ RAG route (medical/depression queries) → retrieve_docs() → LLM + context
       ├─ Conversational route → LLM (Llama 3.2 3B) with history
       └─ (fallback)
```

### Database Tables (Supabase)

`users`, `assessments`, `chat_sessions`, `messages`, `documents` (w/ vector(768) pgvector), `guardrail_logs`, `hotline`/`hotlines`, `counselor_slots`, `consultations`, `journals`, `jadwal_konsultasi`, `booking_konsultasi`

## Technical Requirements & Rules

- **Monorepo**: npm workspaces (`apps/*`, `packages/*`), Metro configured to watch root
- **Backend**: Python 3.12, FastAPI, uv w/ requirements.txt
- **Frontend**: Expo SDK 54, React Native 0.81, React 19.1, expo-router (file-based)
- **Auth**: Supabase Auth (JWT bearer), role-based (mahasiswa, konselor, admin, pemangku_jabatan)
- **AI**: Ollama (local), semantic-router, LiteLLM, langchain-ollama, nomic-embed-text-v2-moe (768d)
- **Security**: Fernet symmetric encryption on chat messages before DB insert
- **Stress Detection**: Client-side keyword scoring (3 tiers: low/mid/high, scale 0-10)
- **Styling**: No CSS-in-JS lib (inline StyleSheet.create), SanctuaryColors theme via React context
- **Config**: `opencode.json` loads ponytail plugin; skills-lock pins caveman skill
- **RLS**: Row-Level Security on all Supabase tables
- **Commit**: No auto-commit. `apps/backend/.env` keys: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `HF_TOKEN`

### Code Conventions

- Python: no comments unless asked, no unrequested abstractions
- TypeScript: strict mode, `@/*` path alias → `./*`, no `any` where possible
- No automatic linting/typecheck hooks currently configured
- Stray `.html` file at dashboard root (orphan)
- Legacy component wrappers in mobile `components/` root (canonical versions in `chat/`, `home/` subdirs)
- `stressDetection.ts` has cross-package import path issue (`'../components/chat/ChatBubble'`)
- Two SQL schema files exist (schema.sql + migration.sql) — migration.sql is the newer/ERD-aligned version