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

M1 contains the responsive shell, authentication/session integration, role guard, theme and language preferences, shared accessible primitives, and security headers. M2 implements the real-data Beranda Operasional at `/overview`. M3 implements the bounded real-data Monitoring Asesmen & Risiko worklist at `/monitoring`. M4 implements the server-paginated student directory, quick-view drawer, and student detail workspace at `/students` and `/students/[studentId]`. M5 implements the real-data counseling schedule workspace at `/counseling`. M6 implements the counselor directory, profile drawer, and recurring availability management at `/counselors` and `/counselors/[counselorId]`; later feature screens remain placeholders until their milestones.

The current FastAPI contract issues bearer tokens and has no refresh-token or HttpOnly-cookie flow. The dashboard therefore keeps the token in per-tab `sessionStorage`, validates it through `/auth/me` on startup, and clears it when an authenticated request returns 401. Tokens are never placed in URLs, rendered markup, or application logs.
