# Dashboard repository split plan

Status: standalone extraction and original-repository cleanup complete on `chore/split-dashboard`; live cross-app verification remains pending before merge/deployment.

## Execution record

- Current checkout branch: `chore/split-dashboard`.
- Dashboard repository: `/home/kha/repos/sajiwa-dashboard`, fresh `main`; remote configured as `https://github.com/melakhaa/sajiwa-dashboard.git`.
- Copied tracked dashboard source, not real environment files, dependencies, build artifacts, or old Git history.
- Added independent lockfile, Node 24 requirement, `.nvmrc`, standalone instructions, and local TDD skill. Pinned React/React DOM to 19.3.0 to preserve the original root override.
- No shared-package source imports were found in the dashboard; no package publishing or duplicated shared packages were needed.
- Passed standalone `npm ci`, all 99 unit tests, typecheck, lint, and production build with `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- Passed original-repository `npm test`, including 159 backend tests and workspace unit tests.
- Backend health at `localhost:8000` was unreachable and Docker was unavailable. Native mobile ↔ dashboard journeys and live socket recovery remain **unverified**. Do not treat unit tests as evidence those journeys passed.
- Removed the obsolete dashboard source-grep check from `apps/backend/tests/unit/test_iteration4_1.py`. Its fixture failed with `FileNotFoundError` after extraction; all 9 remaining tests in that file now pass without a dashboard checkout. Draft/published instrument behavior stays covered by the standalone dashboard's existing model tests.
- Existing `e2e/` browser snippets use fixed localhost ports and cover dashboard login/monitoring only. They can target the standalone app on port 3000 today; configurable URLs and two-way UI coverage remain pending.
- User authorized cleanup before live verification: removed `apps/dashboard` and its root scripts, pruned dashboard dependencies from the lockfile, and updated setup/agent/test documentation. Backend API, database, mobile code, and shared packages are unchanged.
- Clean root `npm ci --ignore-scripts` and `npm test` pass: 26 mobile tests, 12 shared-package tests, 158 backend tests. Standalone dashboard's 99 tests, typecheck, lint, and build also pass after removal.
- `npm run test:e2e` explicitly skipped because dashboard/API were not running. No native mobile journey was executed.
- The original dashboard directory (including generated local state) is backed up outside the repository at `/tmp/sajiwa-cutover.zt1xwX/dashboard`. Git history and the separate committed dashboard are the durable rollback sources.
- Mobile `.env` remains uncommitted. Pre-existing lockfile removal of the optional Expo worklets entry is kept separate from the cleanup commit; dashboard-related pre-existing removals are subsumed by extraction.
- `npm audit` in the standalone repo reports 7 moderate and 1 critical vulnerability. The inherited Next.js 16.3.8 has the production critical finding; npm recommends 16.4.6. A reviewed framework/security upgrade is required before deployment, not an automatic force-upgrade during extraction.
- Production cross-origin WebSocket/CSP behavior needs verification: the inherited CSP names the HTTP API origin and only explicitly adds socket schemes in development.

Next: review draft PR #49, start the shared backend/database, verify both client directions and realtime recovery, and address deployment blockers before merge/deployment. The new repository's README contains setup and manual acceptance steps.

## Goal

Move the Next.js dashboard into an independently installable and runnable repository, while keeping the mobile app working in the current repository.

## Proposed layout

- **New `sajiwa-dashboard` repository:** dashboard source, configuration, unit tests, relevant browser tests, environment template, and setup documentation.
- **Current repository:** Expo mobile app, FastAPI backend, database, and shared packages still needed here.
- Both applications continue to use the same backend. No API behavior changes are planned.

## Required mobile–dashboard communication

Repository separation must not separate application data. Preserve this architecture:

```text
Mobile app <── authenticated HTTP API ──> FastAPI <──> PostgreSQL
Dashboard  <── authenticated HTTP API ──> FastAPI
Dashboard  <── authenticated /realtime notices ── FastAPI
```

- Both clients must target the same backend environment and database. The mobile app does not call the Next.js server directly, and neither client connects directly to PostgreSQL.
- Preserve existing student-to-staff and staff-to-student workflows: assessments/signals, counseling requests, scheduling/booking, and notifications. Audit the current UI flows before selecting the exact test journeys.
- Existing live updates are implemented in `apps/backend/routes/realtime.py` and `lib/realtime/useLiveRefresh.ts` in `sajiwa-dashboard`. The dashboard receives topic-only notices and refetches authorized data, with polling fallback and reconnect resynchronization.
- `/realtime` currently permits admin and counselor roles, not students. Preserve this restriction; mobile must retain its existing fetch/refresh behavior rather than gaining staff socket access.
- Keep authentication, role checks, counselor caseload restrictions, and student data isolation intact. Communication does not mean sharing private clinical data with every user.
- Document reachable API addresses for physical phones/emulators and the dashboard. A phone's `localhost` is not the development computer. Production must support HTTPS and WSS, permitted dashboard origins, CSP connections, and WebSocket proxy upgrades.
- No new direct messaging feature, socket service, or separate database is required for the repository split.

## Decisions required

- [x] Use `melakhaa/sajiwa-dashboard` and local `/home/kha/repos/sajiwa-dashboard`.
- [x] Start fresh; original history remains in Therapy-Chatbot.
- [x] Keep the backend and database in the current repository.

A fresh local repository named `sajiwa-dashboard` was used for non-destructive extraction.
Original-repository cleanup was subsequently authorized; live verification remains a merge/deployment gate.

## Implementation steps

### 1. Audit the extraction boundary

- Inspect dashboard imports for dependencies on shared packages and files outside `apps/dashboard`.
- Identify inherited root dependencies, overrides, Node requirements, scripts, and configuration.
- Trace dashboard references in documentation, hooks, deployment configuration, and root `e2e/` tests.
- Keep backend integration tests in the current repository. Keep cross-app journeys in root `e2e/`, configuring the external dashboard URL and documenting how to start its separate checkout; dashboard-only tests can move with the dashboard.
- Audit existing coverage in `apps/backend/tests/integration/stack_smoke.py` and root `e2e/` before adding tests. The integration script already covers student assessment notices, booking, notifications, and role/data isolation, but does not itself prove both client UIs work.
- If shared code is required, agree on its ownership and distribution before extraction; do not introduce a package registry without a demonstrated need.
- Record the existing dashboard test, typecheck, lint, and build baseline so pre-existing failures are distinguishable from migration regressions.

### 2. Extract non-destructively

- Create the new repository in the approved destination; retain the original dashboard until verification passes.
- Extract source and required configuration using the chosen history strategy.
- Exclude real environment files, credentials, `node_modules`, `.next`, and other generated artifacts.
- If preserving history, inspect the selected history for secrets before publishing it.
- Preserve existing uncommitted work rather than resetting or overwriting it. At planning time, modified files include:
  - `apps/dashboard/next-env.d.ts`
  - `apps/mobile/.env`
  - `package-lock.json`

### 3. Make the dashboard standalone

- Put the dashboard application at the new repository root unless the audit identifies a concrete reason not to.
- Provide standalone package scripts and a lockfile with the required dependencies and compatible versions.
- Update configuration and imports that assume the monorepo layout.
- Adapt `AGENTS.md` and required convention documentation so their links and commands work independently.
- Add a safe environment template and README covering install, development, tests, production build, and backend configuration.
- Preserve authentication, authorization, security headers, CSP, and accessibility.
- Check backend CORS and deployment origin settings if the dashboard origin changes; avoid unrelated backend changes.
- Follow the repository's test-first conventions for any behavioral changes needed during extraction.

### 4. Verify the new repository

- Install from its own lockfile in isolation, without relying on the original repository's `node_modules` or source files.
- Run dashboard unit tests, typecheck, lint, and production build.
- Run relevant browser journeys against a configured backend, including authentication and an authenticated dashboard flow.
- Confirm that both clients point to the same backend environment and do not expose secrets.
- With both clients running from separate checkouts, verify a student action on mobile appears in the authorized dashboard and a supported staff scheduling/booking action appears back on mobile through its existing refresh behavior.
- Verify dashboard live notices, fallback refresh while the socket is unavailable, and resynchronization after reconnect. Verify a student cannot subscribe to the staff socket or read another student's records.
- Use isolated test accounts/data and clean up generated records and notifications. Record the exact commands, environment, results, and any skipped checks.
- Document any checks blocked by unavailable services or credentials; do not treat blocked checks as passing.

### 5. Clean up the current repository

Only proceed once the standalone dashboard is verified and removal is approved.

- Remove `apps/dashboard` and dashboard-only root scripts and dependencies.
- Update the workspace lockfile without discarding unrelated local changes.
- Update documentation, hooks, deployment references, and affected browser-test orchestration.
- Keep shared packages required by mobile or other remaining consumers.
- Run affected mobile/shared-package checks and any root tests or commands changed by the split.

### 6. Publish and hand off

- Review both diffs for accidental deletions, secrets, generated files, and broken references.
- Create separate, reviewable commits in each repository.
- Push only to the approved remote with the agreed visibility.
- Document where dashboard development, backend development, and cross-app tests now happen.

## Acceptance criteria

- The dashboard installs, tests, and builds without accessing the original checkout.
- The dashboard still connects to the existing backend with authentication and security behavior intact.
- Mobile remains functional in the original repository.
- At least one mobile-to-dashboard and one dashboard-to-mobile UI journey pass against the shared backend from separate checkouts.
- Existing dashboard live updates and recovery work without weakening student/staff authorization.
- Relevant browser tests remain runnable with documented setup.
- No secrets or generated dependencies are included in the new repository.
- Existing local changes are preserved, and both repositories have accurate setup instructions.

## Rollback and risks

Keep the original dashboard until standalone verification succeeds. If verification fails, stop before cleanup and continue using the original checkout. Keep extraction and cleanup separate so cleanup can be reverted independently.

Dependency coupling, inherited version overrides, and cross-app browser tests have not yet been fully audited. Preserving history may carry historical secrets; starting fresh loses dashboard commit history. A separate repository also requires coordinating future API contract changes across repositories.
