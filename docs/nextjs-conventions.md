# Next.js conventions

The administrator dashboard migrates to **Next.js 16 (App Router)** in `apps/dashboard-next`
(package `@sajiwa/dashboard-next`): React 19, TypeScript 5.9, Tailwind CSS 4, ESLint 9
(`eslint-config-next`). The legacy Expo dashboard in `apps/dashboard` stays the comparison
implementation until the reviewed cutover
([M11 cutover plan](dashboard-next-m11-cutover-plan.md)).

Product behavior per route is specified in the [dashboard-next milestones](dashboard-next-m0-architecture.md)
(M0–M8); this file is the stack layer only.

## Structure

```
app/                 App Router: (admin) route group + login; layout/error/loading/not-found
features/<domain>/   Page components + api.ts + model.ts + model.test.ts + types.ts
lib/                 api/client.ts (bearer injection), auth, i18n, theme, previewMode
components/          auth, feedback, providers, shell, ui
types/               shared types
```

- Route segments in `app/(admin)/` are thin: compose `features/` pages, nothing else.
- `features/<domain>/model.ts` holds pure transformations — that is what the tests cover.

## Commands

Run from the repo root with `--workspace @sajiwa/dashboard-next`, or locally:

```bash
npm run dev           # next dev on :3000
npm run typecheck     # tsc --noEmit --incremental false
npm run lint          # eslint . (flat config)
npm run test:foundation  # node --test with --experimental-strip-types
npm run build         # production build (required gate)
```

Tests are node's built-in runner on colocated `*.test.ts` — no test framework. Gates before
done: `typecheck`, `lint`, `test:foundation`, `build`.

## Environment

- `NEXT_PUBLIC_API_URL` — FastAPI **origin only**, never a token, database URL, or secret.
  `next.config.ts` derives the CSP `connect-src` from it.
- `NEXT_PUBLIC_PREVIEW_MODE=true` — synthetic admin + fictional data, honored only when
  `NODE_ENV=development`; production builds ignore it. Preview data stays in memory
  (`lib/previewMode.ts`, `lib/previewData.ts`), never persists a fake token.

## Security

`next.config.ts` sets CSP (plus Referrer-Policy, nosniff, DENY, Permissions-Policy, COOP)
for every route — do not weaken headers to make a third-party script work.

- Bearer token in per-tab `sessionStorage`, validated via `GET /auth/me` at startup;
  any authenticated 401 clears the session centrally. The backend has no refresh-token or
  HttpOnly-cookie flow; moving to cookies needs an approved BFF contract and CSRF handling.
- Generic API errors only — no token logging, no credentials in URLs or analytics.
  Backend authorization and RLS remain the security authorities; the client guard is UX only.
  See [security-conventions.md](security-conventions.md).

## UI, theme, i18n

- Tailwind 4 with semantic CSS tokens; Light/Dark/System themes applied by a small blocking
  script before paint. Respect `prefers-reduced-motion`.
- Bahasa Indonesia default, English secondary; all copy goes through the central message
  catalog (`lib/i18n`) — no inline user-facing strings.
- Accessibility is a gate, not a polish pass: labeled controls, native buttons, table
  headers, visible focus, text alongside status colors.

## What is shared with the Expo apps

API contracts and auth expectations are unchanged from the Expo dashboard
([fastapi-conventions.md](fastapi-conventions.md), [security-conventions.md](security-conventions.md)).
There is no React Native here — [react-conventions.md](react-conventions.md) and
[typescript-conventions.md](typescript-conventions.md) apply; expo/react-native docs do not.
