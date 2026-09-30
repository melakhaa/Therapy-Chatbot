# Plan: keep the friend's frontend, revert everything else to `main`

Status: **executed** on branch `cleanup/frontend-only` (changes uncommitted). The analysis below is kept for reference; §8 records what actually landed and how it was verified.
Branch under review: `integrate-mobile-and-backend` (23 commits ahead of `main`, 132 files, +9,503 / −2,713).

## 1. Goal (as stated)

> "I just want the frontend from my friend. Chat session, backend, etc — I wanted to use the main branch one."

Interpretation used below:

- **Keep** the friend's mobile redesign (Sajiwa frontend: screens, components, theme, character assets, and the shared-package support it genuinely uses).
- **Use `main`'s** backend, chat-session implementation, DB schema and repo tooling.
- Delete everything else the branch carries that neither side needs.

Key fact that makes this cheap: `main` is already an ancestor of the branch, and **`main` already contains the chat-session feature** (`feat(chat): give the LLM memory from persisted sessions`, `feat(chat): stream Hana's reply token by token over SSE`, PR #17). So "use main's chat session" is mostly *not reverting chat.py* — the branch already runs main's `chat.py` unchanged except for one added endpoint. The work is trimming, not rebuilding.

## 2. What the branch actually contains

| Area | Branch vs main |
|---|---|
| `apps/mobile/**` | Friend's Sajiwa redesign: rewritten screens, new `schedule`/`hotline`/`chat-history`/`journal-history`/`journal-detail` screens, new `components/ui/**` kit, character companion, Sajiwa theme, fonts, ~18 expression PNGs |
| `packages/ui-shared` | `SanctuaryColors` → `SajiwaColors` (+ `Colors` alias kept), full palette rewrite |
| `packages/utils` | `characterReaction.ts` + check, `phone.ts`, `Message` type moved here, emoji removed from canned replies |
| `packages/api-client` | +235 lines in `api.ts` (used + dead), refresh-token storage, dashboard aliases; `apiFetch` rewritten (timeout/401 handling) |
| `apps/backend` | main's `chat.py` + `/chat/report`; `/accounts/konselor`; `/booking/admin`; `request` signal type + `/admin/insights`; 3 dead `core/*` modules; Dockerfile, test.html, seed script, 2 new tests, 1 broken test |
| DB | 3 new SQL files (`03_mobile_app.sql`, `04_staff_bookings.sql`, `05_student_insights.sql`) |
| Dashboard | 5 lines: `request` signal type in `SignalCard`/`OperationsOverview` |
| Tooling/assets | CI workflow, Dependabot, Playwright scaffold, Dockerfiles, nginx.conf, design PNGs, PRD doc, skills-lock churn |

## 3. Disposition inventory

### A. KEEP — friend's frontend

- `apps/mobile/app/*`, `components/**`, `constants/**`, `hooks/useChat.ts`, `babel.config.js`, `.env`, `app.json`, `assets/Character/expressions/*.png`, `assets/fonts/symphony/*`, updated `assets/image.png`.
- `packages/ui-shared/src/theme.ts`, `ThemeContext.tsx`.
- `packages/utils/src/characterReaction.ts` + `.check.ts`, `phone.ts`, `stressDetection.ts`, `aiResponses.ts`, `index.ts`.
- `packages/api-client/src/api.ts` — **only the functions mobile actually calls** (see C for the rest).
- `apps/dashboard/components/admin/OperationsOverview.tsx`, `OperationsUI.tsx` — 5 lines for the `request` signal type, required end-to-end by the crisis "kabari tim" flow.

### B. KEEP — minimal backend the kept frontend calls

These are *additions*, not reversions; without them screens are broken. Each is small and lives beside main's code.

| Addition | Needed by | Size |
|---|---|---|
| `POST /chat/report` (`routes/chat.py`) | `useChat.confirmReport` → `apiReportToTeam` (crisis sheet) | ~12 lines |
| `GET /accounts/konselor` (`routes/account.py`) + `list_konselor()` (`db/init/03_mobile_app.sql`) | `schedule.tsx`, `home.tsx`, `profile.tsx` | ~10 + ~15 lines |
| `attention` `'request'` classification (`routes/admin_operations.py`) + dashboard `SignalType` | counselor dashboard shows "Student asked to be contacted" | ~8 lines |

No read-only session-listing route (`GET /chat/sessions`) — the chat-history screen that needed it is dropped (see C).

### C. REVERT / DELETE — unnecessary

**Backend (nothing calls these):**

| Item | Why |
|---|---|
| `apps/backend/core/logger.py`, `core/rate_limit.py`, `core/task_queue.py` | Zero importers anywhere outside themselves (verified by grep) |
| `apps/backend/docs/test.html` | 356-line scratch HTML page |
| `apps/backend/Dockerfile`, `requirements-test.txt` | Deployment/test scaffolding not wired to anything in compose or CI-that-matters |
| `apps/backend/routes/admin_operations.py` → `GET /admin/insights` | No UI calls `apiGetInsights` (grep: 0 usages) |
| `apps/backend/routes/jadwal.py` → `GET /booking/admin` | `apiGetAdminBookings` has 0 usages |
| `apps/backend/scripts/seed_jadwal.py` | Only fed `/booking/admin`; and main's schedule screen (student side) reads `/jadwal` |
| `db/init/04_staff_bookings.sql` (`list_bookings_for_staff`) | Only `/booking/admin` uses it |
| `db/init/05_student_insights.sql` (`student_insights`) | Only `/admin/insights`; also counts `chat_sessions`, a table the backend never writes, so its chat numbers would always be 0 |
| `db/init/03_mobile_app.sql` → `chat_sessions` table | Duplicate of main's `sessions`; backend writes to `sessions` only. Keep the file for `list_konselor()` alone |
| `core/security.py` whitespace-only diff | Noise |

**Shared packages:**

| Item | Why |
|---|---|
| `api.ts`: `apiGetChatHistory`, `apiGetJadwalSaya`, `apiBuatJadwal`, `apiUpdateJadwalStatus`, `apiGetAdminBookings`, `apiUpdateBookingStatus` | 0 usages; `apiGetChatHistory` additionally has the wrong path shape (`/chat/history/{id}` vs main's `?session_id=`) |
| `api.ts`: `apiRefreshSession`, refresh branch inside `apiFetch`, `saveRefreshToken`/`getRefreshToken` + the storage.ts diff | Calls `/auth/refresh`, which does not exist in either branch; `account.py` always returns `"refresh_token": ""`, so the branch is unreachable. Keep the 401 → `clearAuth()` → `setUnauthorizedCallback` part (used by `_layout.tsx`), drop the refresh half |
| `admin-operations.ts`: `apiGetAdminSchedules` etc. aliases + reformatting | Dashboard imports the same names as main; aliases have 0 usages. Keep only the `SignalType`/`signal_type` union change |
| `packages/*/package.json` `"test": "echo ..."` scripts | CI scaffolding for a CI we're dropping |

**Mobile leftovers:**

| Item | Why |
|---|---|
| `components/ChatBubble.tsx`, `AlertModal.tsx`, `StressBar.tsx`, `QuickReply.tsx`, `TypingIndicator.tsx`, `MoodSelector.tsx` (root level) | Superseded by `components/chat/*` + `MoodPicker`; the barrel and every screen import the `chat/` versions. `ChatBubble.tsx` even says "legacy file" |
| `app/chat-history.tsx` + its `Stack.Screen` in `_layout.tsx` | Session-list screen; the API it needs (`GET /chat/sessions`) was dropped in the main merge, so it 404s today. Dropping the screen avoids re-adding the route |
| `app/home.tsx` "Lanjutkan percakapan" card, `app/profile.tsx` session count + "Riwayat chat" row | The only other `apiGetChatSessions` callers. No session list exists any more; the chat screen still resumes via `getChatSessionId()`, so these UIs just go |
| `assets/Character/CharSet.jpeg`, `CharSet2.jpeg` | 2.5 MB each, raw source sheets, not referenced at runtime |
| `docs/design-exploration/*.png` | ~3 MB of design exploration |
| `docs/PRD-Sajiwa.md`, `docs/design/chat-wireframe.txt` | Docs only; keep or delete — your call |

**Repo tooling (separate concern from the frontend):**

- `.github/workflows/ci.yml` — stale: references `develop`/`prototype` branches, Supabase and Redis env/services the backend no longer uses, and `npm test` scripts that only echo. Either rewrite for `main` + unittest or drop; dropping also orphans the Dockerfiles/nginx.conf.
- `.github/dependabot.yml`, `playwright.config.ts`, `tests/example.spec.ts`, root devDeps `@playwright/test` + `@types/node`, Playwright `.gitignore` block.
- `skills-lock.json` — adds agent skills (`brandkit`, taste-*, …); unrelated to app code.
- `docker-compose.yml` `SANCTUARY_DB_PORT` override — harmless, tiny; keep or revert.
- Root `"expo-asset": "~57.0.18"` — both apps run Expo SDK 54 (which bundles `expo-asset ~12.0.12`); the 57 pin is a leftover from the friend's SDK-57 branch and risks a hoisted version conflict. Revert to main's value or remove.

### D. FIX — broken by the main merge (independent of any trimming)

1. `apps/backend/tests/test_stress_detection.py` **breaks the documented test command**: it `import pytest` (not installed), while AGENTS.md says `venv/bin/python -m unittest discover -s tests -v`. Current result: `Ran 29 tests … FAILED (errors=1)`. It is also a hand-copied Python port of the TS `stressDetection.ts`, so it tests a duplicate of the logic, not the real code. Delete it (and `conftest.py`/`requirements-test.txt`, which only exist for pytest) — or convert to unittest and add pytest to requirements. `test_guardrail.py` is genuinely valuable and passes: keep.
2. `/chat/sessions` 404 → resolved by dropping the screen and its three callers (see C), not by adding a backend route.
3. Stale docs: `docs/react-native-ui-conventions.md`, `docs/expo-conventions.md`, `docs/npm-workspaces-conventions.md` still document `SanctuaryColors`; update to `SajiwaColors` now that the rename is real.

## 4. Proposed end state

```
git diff main <clean-branch> --stat
```
→ only: `apps/mobile/**` (friend's frontend + its assets), `packages/ui-shared/src/theme*`, `packages/utils/src/{characterReaction,phone,stressDetection,aiResponses,index}`, the used `packages/api-client` additions, `db/init/03_mobile_app.sql` (list_konselor only), +3 small backend additions (`/chat/report`, `/accounts/konselor`, `request` signal), 2 dashboard lines, `apps/backend/tests/test_guardrail.py`, and doc fixes.

## 5. Execution order

1. Branch off current HEAD (`cleanup/frontend-only`) so nothing is lost.
2. Backend: delete dead `core/*`, `docs/test.html`, `Dockerfile`, `requirements-test.txt`, `scripts/seed_jadwal.py`, `/booking/admin`, `/admin/insights`; revert whitespace noise in `security.py`.
3. DB: delete `04`/`05`; strip `chat_sessions` from `03`.
4. Backend additions: keep `/chat/report`, `/accounts/konselor`, `request`. No `/chat/sessions` route.
5. Mobile: delete `app/chat-history.tsx` + its route; drop the `apiGetChatSessions` card/stat from `home.tsx` and `profile.tsx`; delete `apiGetChatSessions`/`apiGetChatHistory` from `api-client`.
6. `packages/api-client`: delete the dead functions listed in C; trim the refresh-token code but keep 401 handling + `setUnauthorizedCallback`; keep only the `SignalType` change in `admin-operations.ts`.
7. Mobile cleanup: delete the six legacy root components, the two `CharSet*.jpeg`, design-exploration PNGs (confirm first); revert `test: echo` scripts.
8. Tooling: remove Playwright/Dependabot/CI (or move to its own PR), revert `expo-asset`, keep the port override if wanted.
9. Tests/docs: delete `test_stress_detection.py` + `conftest.py` + `requirements-test.txt`; update theme docs.
10. Verify (below), then commit as small focused commits.

## 6. Verification

From `apps/backend`:

```bash
venv/bin/python -m unittest discover -s tests -v   # must be all-green, no pytest ImportError
```

From repo root:

```bash
cd apps/dashboard && npm run lint
cd apps/mobile    && npx expo start               # check: chat, schedule, hotline, journal, crisis sheet report
```

Manual checks: login, send a chat message (SSE still streams, session persists and resumes), press "kabari tim" → `/chat/report` row appears in counselor dashboard as a `request` signal, book a slot on the schedule screen (needs `list_konselor()`).

## 7. Open questions (need your call)

1. ~~Chat history sessions list~~ — **decided: drop it**. No DB change: main's `sessions`/`messages` tables and `/chat/stream` persistence stay exactly as they are; only the list *screen* and `apiGetChatSessions` go. The chat screen still resumes the current session via `getChatSessionId()`. (`chat_sessions`, the branch's duplicate table, only ever exists in `db/init/03_mobile_app.sql` — removed there; an existing dev DB may have an empty copy, harmless.)
2. ~~CI / Playwright / Dockerfiles~~ — **deleted** (stale: Supabase/Redis env, `prototype` branches, echo tests). Restore from `git show b860f94:<path>` if wanted.
3. **Docs & design assets** — still present: `docs/PRD-Sajiwa.md`, `docs/design/chat-wireframe.txt`, `docs/design-exploration/*.png`, `assets/Character/CharSet*.jpeg`. Nothing references them at runtime. Say the word and they go.
4. ~~`seed_jadwal.py`~~ — **deleted** with `/booking/admin`.

## 8. What actually landed

- Backend reverted to main everywhere, plus: `POST /chat/report`, `GET /accounts/konselor`, `attention` `'request'` classification (with the `%%` psycopg escape fix main was missing). Everything else added by the branch is gone: `core/logger|rate_limit|task_queue`, `docs/test.html`, Dockerfile, `/booking/admin`, `/admin/insights`, `04`/`05` SQL, `chat_sessions`, `seed_jadwal.py`, pytest-only test files.
- `db/init/03_mobile_app.sql` keeps only `list_konselor()`.
- `api.ts` reverted to main + only what the kept screens call (logout, 401 redirect, report, konselor, typed jadwal, journal update/delete/pagination). Refresh-token and chat-session-list code gone; storage.ts and admin-operations.ts reverted except the `'request'` union.
- Mobile: `chat-history.tsx` and its six legacy root components deleted; `home.tsx`/`profile.tsx` no longer fetch the session list.
- Dashboard: `request` signal now shows in the attention page filter and badge too (the branch had missed that).
- Docs updated: `SanctuaryColors` → `SajiwaColors` in the three convention docs; security doc reverted.
- Kept from the branch: all `apps/mobile/**` screens/components/assets/fonts, Sajiwa theme, `characterReaction`/`phone`/`stressDetection` utils, `babel.config.js`, `.env`, `app.json`, mobile package deps (worklets 0.5.1 pinned in the root lock).
- `plan.md` itself is untracked.

Verification: backend `unittest discover` → 28 tests OK; dashboard `npm run lint` clean; mobile `tsc --noEmit` clean; dashboard `tsc` shows only 5 pre-existing expo-router typed-route errors (present on main, unrelated). Not verified: live end-to-end against a running stack.
