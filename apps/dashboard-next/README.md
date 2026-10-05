# Sajiwa Next.js dashboard

Temporary migration workspace for the Sajiwa administrator dashboard. The existing Expo dashboard in `apps/dashboard` remains the active comparison implementation during migration.

## Local commands

Run dependency installation from the repository root, then:

```powershell
npm run dev --workspace @sajiwa/dashboard-next
npm run typecheck --workspace @sajiwa/dashboard-next
npm run lint --workspace @sajiwa/dashboard-next
npm run test:foundation --workspace @sajiwa/dashboard-next
npm run build --workspace @sajiwa/dashboard-next
```

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to the FastAPI origin. This public variable must contain an origin only, never a token, database URL, or secret.

For a frontend-only local preview, set `NEXT_PUBLIC_PREVIEW_MODE=true` in `.env.local` and run `npm run dev`. Preview mode is accepted only when `NODE_ENV=development`; production builds ignore the flag. It supplies an obviously synthetic administrator and centralized fictional data without contacting FastAPI or storing a fake token. Open `http://localhost:3000/overview`.

M1 contains the responsive shell, authentication/session integration, role guard, theme and language preferences, shared accessible primitives, and security headers. M2–M9 implement the operations overview, monitoring worklist, student management, counseling schedule, counselor directory, aggregate analytics and report preview, assessment instruments, emergency contacts, and settings routes. The migration remains isolated from `apps/dashboard` until a separately reviewed cutover.

The current FastAPI contract issues bearer tokens and has no refresh-token or HttpOnly-cookie flow. The dashboard therefore keeps the token in per-tab `sessionStorage`, validates it through `/auth/me` on startup, and clears it when an authenticated request returns 401. Tokens are never placed in URLs, rendered markup, or application logs.
