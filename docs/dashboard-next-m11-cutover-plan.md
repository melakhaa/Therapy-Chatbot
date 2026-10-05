# M11 Next.js dashboard cutover plan

## Status and scope

M11 prepares the replacement of the legacy Expo web dashboard in `apps/dashboard` with the reviewed Next.js application currently in `apps/dashboard-next`. It does not perform the replacement, alter application source, change the database, select a production hosting vendor, or deploy anything.

The integration worktree is on `integration/admin-nextjs-b1`. At the time of this audit, the M09/M10 frontend work is still an uncommitted checkpoint. That checkpoint and this M11 document must be reviewed, committed, and pushed before the mechanical M12 cutover begins. The primary checkout at `D:\Therapy-Chatbot` contains 22 pre-existing local changes and is outside the M12 work area.

## Current and desired workspace structure

Current dashboard workspaces:

```text
apps/
├── dashboard/       # legacy Expo Router web dashboard; package dashboard-web
└── dashboard-next/  # reviewed Next.js App Router dashboard; package @sajiwa/dashboard-next
```

Desired structure after M12:

```text
apps/
└── dashboard/       # Next.js App Router dashboard; package @sajiwa/dashboard
```

The root workspace declaration already uses `apps/*`, so the directory move requires no workspace-glob change. M12 should remove the tracked legacy directory with Git, move `apps/dashboard-next` to `apps/dashboard` with Git, and then update package identity and references. It must not create an intermediate mixed application or retain two packages with the same identity.

## Package identity and commands

| Concern | Current legacy dashboard | Current Next.js dashboard | M12 target |
| --- | --- | --- | --- |
| Directory | `apps/dashboard` | `apps/dashboard-next` | `apps/dashboard` |
| Package name | `dashboard-web` | `@sajiwa/dashboard-next` | `@sajiwa/dashboard` |
| Development | `expo start --web` | `next dev` | `next dev` |
| Production build | Expo static output configuration | `next build` | `next build` |
| Production serve | static host | `next start` | `next start` |
| Lint | `expo lint` | `eslint .` | `eslint .` |
| Type check | no package script | `tsc --noEmit --incremental false` | same |
| Tests | no package script | `test:foundation` | canonical `test`, with the existing command retained as an alias if useful |

M12 should add explicit root scripts so CI and operators do not depend on a directory name:

```json
{
  "dashboard:dev": "npm run dev --workspace @sajiwa/dashboard",
  "dashboard:build": "npm run build --workspace @sajiwa/dashboard",
  "dashboard:start": "npm run start --workspace @sajiwa/dashboard",
  "dashboard:typecheck": "npm run typecheck --workspace @sajiwa/dashboard",
  "dashboard:lint": "npm run lint --workspace @sajiwa/dashboard",
  "dashboard:test": "npm run test --workspace @sajiwa/dashboard"
}
```

These scripts are additions. Mobile and backend commands and checks must remain available.

## Environment, API, CORS, and authentication

The Next.js dashboard uses one environment variable:

| Variable | Visibility | Development | Production requirement |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | exposed to browser JavaScript | defaults to `http://localhost:8000` | required public HTTPS origin of the FastAPI service |

No secret belongs in a `NEXT_PUBLIC_` value. The production value must be provided to the Next.js build/runtime environment and must match the origin admitted by the Content Security Policy in `next.config.ts`.

FastAPI reads comma-separated `ALLOWED_ORIGINS`. Production must set the exact dashboard origin or origins rather than `*`. Preflight and the methods used by the application must remain allowed: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS`, with the `Authorization` and content headers. The browser client sends bearer tokens explicitly and uses `credentials: 'omit'`.

The supported authentication contract is:

- `POST /auth/login`
- `GET /auth/me`
- an administrator role is required
- session state is kept per tab in `sessionStorage` under `sajiwa_admin_session`
- logout clears local session state; the backend has no required logout endpoint
- a `401` triggers the central expired-session flow

This is sufficient for the documented B1 contract. Moving to server-issued HttpOnly cookies is a later security architecture change and is outside M12.

## Final route inventory

The cutover application provides:

- `/` (redirects to `/overview`)
- `/login`
- `/overview`
- `/monitoring`
- `/students`
- `/students/[studentId]`
- `/counseling`
- `/counselors`
- `/counselors/[counselorId]`
- `/analytics`
- `/reports/preview`
- `/instruments`
- `/instruments/new`
- `/instruments/[instrumentId]`
- `/hotline`
- `/settings`

No product route imports `MigrationPlaceholder`. The unused component may be removed in a later cleanup after cutover validation; its presence does not block M12.

## Legacy deep-link mapping and redirects

M12 should add explicit permanent or temporary redirects in `apps/dashboard/next.config.ts` for paths whose public URL changes. Temporary redirects are safer during the first production cutover and can become permanent after link telemetry and stakeholder validation.

| Legacy route | Next.js destination | Treatment |
| --- | --- | --- |
| `/` | `/overview` through the existing auth flow | existing application redirect |
| `/overview` | `/overview` | unchanged |
| `/analytics` | `/analytics` | unchanged |
| `/assessments` | `/monitoring` | redirect |
| `/attention` | `/monitoring` | redirect |
| `/risk` | `/monitoring` | redirect |
| `/counseling` | `/counseling` | unchanged; calendar is the default view |
| `/schedule` | `/counseling` | redirect |
| `/counselors` | `/counselors` | unchanged |
| `/hotlines` | `/hotline` | redirect |
| `/instruments` | `/instruments` | unchanged |
| `/reports` | `/analytics` | redirect |
| `/report-preview` | `/reports/preview` | redirect |
| `/settings` | `/settings` | unchanged |
| `/students` | `/students` | unchanged |
| `/students/[id]` | `/students/[studentId]` | concrete URLs remain unchanged |
| `/users` | `/students` | redirect, preserving the legacy policy |

The old counseling page redirected to the schedule. The new `/counseling` workspace starts on the calendar view. There is currently no supported URL parameter for preserving a non-default counseling tab; M12 should not invent one.

## Assets and package dependencies

`apps/dashboard-next` has no required `public` image, font, or other binary assets. Branding, icons, charts, and report marks are rendered through components, CSS, text, or inline SVG. The Expo starter images and web icons under the legacy dashboard do not need to be copied. A future favicon or formal university brand asset should be reviewed separately.

The Next.js dashboard currently imports none of these shared packages directly:

- `@prototype/api-client`
- `@prototype/ui-shared`
- `@prototype/utils`

They cannot be removed because the mobile application uses them. All `packages/*` workspaces remain in place.

Direct legacy-dashboard dependency candidates that may disappear from `package-lock.json` after the old workspace is removed are:

- `@react-navigation/bottom-tabs`
- `@react-navigation/elements`
- `@react-navigation/native`
- `expo-constants`
- `expo-haptics`
- `expo-image`
- `expo-symbols`
- `expo-system-ui`
- `expo-web-browser`
- `react-native-chart-kit`
- `react-native-svg`

M12 must let npm recalculate the lockfile. A package must remain if mobile, a shared package, or a transitive dependency still requires it. Expo, React Native, Expo Router, vector icons, and the shared packages are used elsewhere and are not removal candidates.

## Deployment model and runtime

The legacy web dashboard was configured for static Expo output. The reviewed Next.js application uses App Router dynamic segments and `headers()` in `next.config.ts`. Its current production contract is a Next.js Node server or a hosting platform that implements the equivalent Next.js runtime. The old static hosting pipeline cannot be reused unchanged.

The generic deployment commands are:

```text
npm ci
npm run dashboard:build
npm run dashboard:start
```

The dashboard health smoke target is `/login` or `/overview`; the backend health target is `/health`; an authenticated application probe should exercise `/auth/me`. The deployment platform must preserve Next.js headers, dynamic routes, client-side history, HTTPS, environment injection, and rolling or atomic release behavior.

Next.js 16 requires Node.js 20.9 or newer. The local audit ran on Node.js 23.8.0, which is not an LTS production baseline. M12 should standardize on Node.js 24 LTS, which also satisfies the Expo SDK 54 minimum used by mobile. Pin the version in repository tooling such as `.nvmrc` or `.node-version` and declare a compatible root `engines.node` range. If the chosen hosting platform has not certified Node 24, Node 22 LTS is the documented fallback after a clean CI run.

References:

- [Next.js 16 upgrade guide and Node minimum](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js Node.js server deployment](https://nextjs.org/docs/app/getting-started/deploying)
- [Node.js release status](https://nodejs.org/en/blog/release)
- [Expo SDK 54 Node requirement](https://expo.dev/changelog/sdk-54)

## CI and test plan

No repository-managed CI workflow for the dashboard was found. M12 should add or update CI so the dashboard runs on the pinned LTS Node version while preserving backend and mobile checks.

Required dashboard gates:

1. `npm ci` at repository root.
2. `npm run dashboard:typecheck`.
3. `npm run dashboard:lint`.
4. `npm run dashboard:test`.
5. `npm run dashboard:build` with a non-secret test `NEXT_PUBLIC_API_URL`.
6. Inspect the generated route manifest for all final routes.
7. Run backend tests, including the adjusted instrument-integrity assertion.
8. Run existing mobile checks to detect lockfile or shared-workspace regressions.

`apps/backend/tests/test_iteration4_1.py` currently reads `apps/dashboard/app/(dashboard)/instruments.tsx` and asserts legacy UI implementation strings. That path is removed by the cutover. M12 must replace the brittle legacy-file assertion with a test of the new Next.js instrument safety behavior or an API contract assertion. It must not weaken the locked-standard-instrument rule.

## Exact proposed M12 file operations

Perform M12 only from the integration worktree after its checkpoint is clean and pushed:

1. Record the pre-cutover branch name, `HEAD`, remote tracking SHA, and clean `git status`.
2. Record the final legacy dashboard commit for rollback.
3. Remove the tracked legacy `apps/dashboard` tree with `git rm -r apps/dashboard`.
4. Move the reviewed tree with `git mv apps/dashboard-next apps/dashboard`.
5. Rename the moved package from `@sajiwa/dashboard-next` to `@sajiwa/dashboard`.
6. Add the canonical dashboard `test` script and the root `dashboard:*` scripts listed above.
7. Add the legacy deep-link redirects to `apps/dashboard/next.config.ts`.
8. Update `apps/backend/tests/test_iteration4_1.py` so it validates the new instrument implementation or contract.
9. Update active documentation and repository instructions for the new path and runtime.
10. Pin the supported Node LTS version and update the declared engine range.
11. Run npm once at the repository root to recalculate `package-lock.json` without an unrelated dependency upgrade.
12. Run the complete CI and smoke checklist below.
13. Inspect the staged diff: it should contain the legacy removal, the Next.js directory move, intentional package/config/test/documentation updates, and the mechanically recalculated lockfile only.
14. Create one reviewed cutover commit.
15. Deploy that commit to a non-production environment, complete authenticated smoke testing, and promote the same immutable build or commit through the approved release process.

M12 must not alter database migrations, backend product behavior, page functionality, or the production hosting target as an incidental part of the move.

## Expected lockfile changes

`package-lock.json` is expected to:

- remove the `apps/dashboard-next` workspace key;
- replace the legacy `apps/dashboard` workspace entry with the Next.js package metadata;
- change the workspace package name to `@sajiwa/dashboard`;
- retain Next.js, React, testing, and lint dependencies used by the moved package;
- remove dependency nodes used only by the deleted legacy dashboard when no other workspace needs them;
- preserve dependencies used by mobile and shared packages.

M12 should use the existing lockfile and npm version deliberately, avoid broad upgrades, and investigate any unrelated version churn before committing.

## Documentation update plan

M12 should update active references in:

- root `README.md`;
- `AGENTS.md` and any applicable dashboard agent instructions;
- dashboard README and environment examples;
- development, TypeScript, Expo, local-run, CI, and deployment documentation;
- backend test documentation if the static instrument assertion changes.

M0-M11 milestone and architecture documents are historical records. Preserve their original paths where they describe work as it existed, and add a short cutover note or index rather than rewriting history. Product requirements that intentionally describe the former Expo implementation should be labeled historical if they remain useful.

## Primary-checkout safety

The primary checkout at `D:\Therapy-Chatbot` has 22 known pre-existing local changes. M12 must:

- operate only in `D:\Therapy-Chatbot-integration-admin-nextjs-b1`;
- verify the absolute working directory before every Git mutation;
- never stage, stash, restore, reset, clean, move, or edit the primary checkout;
- use path-specific staging or a reviewed single cutover diff in the integration worktree;
- stop if a command resolves to the primary checkout or if unexpected files appear.

## Rollback strategy

Record the M12 commit and the last deployable legacy commit. If validation fails before deployment, do not promote the cutover build. If it fails after deployment:

1. Revert the M12 cutover commit with a normal new Git commit; do not rewrite shared history.
2. Build and redeploy the recorded legacy artifact using the previous static hosting process.
3. Restore the previous routing and environment configuration at the deployment layer.
4. Verify legacy login, core routes, API connectivity, and backend health.
5. Preserve logs and the failed immutable artifact for diagnosis.

Because M12 has no database changes, application rollback does not require a schema rollback.

## Backend runtime release dependencies

The following B1 concerns remain production-release dependencies, even though they do not block the mechanical directory cutover when mocked or development data is used:

- application and verification of migration `004`;
- row-level security and role behavior;
- instrument review and publish workflow;
- student support-profile persistence;
- counseling-resource conflict handling;
- atomic recurring-schedule operations;
- hotline verification behavior;
- analytics aggregates and data completeness.

Their owners must provide a release-ready FastAPI origin and confirm the M09 handoff contract before production promotion.

## M12 preconditions

All of the following must be true before the first M12 mutation:

- M09/M10 and this M11 artifact are reviewed, committed, and pushed on the integration branch.
- The integration worktree is clean and its remote tracking SHA is recorded.
- The primary dirty checkout is untouched and separately identified.
- The deployment target is confirmed to run the selected supported Node LTS and Next.js server model.
- Production and staging values for `NEXT_PUBLIC_API_URL` and `ALLOWED_ORIGINS` are owned and documented.
- The old-to-new redirect table is approved.
- The replacement for the brittle backend legacy-dashboard test is agreed.
- CI can run root install, dashboard checks, backend tests, and mobile checks.
- A non-production environment and an operator are available for authenticated smoke testing.
- The rollback commit, artifact, routing procedure, and owner are recorded.

## Deployment checklist

- Build from the reviewed M12 commit with the pinned Node LTS and lockfile.
- Set `NEXT_PUBLIC_API_URL` to the intended HTTPS FastAPI origin.
- Set backend `ALLOWED_ORIGINS` to the exact dashboard origins.
- Confirm CSP `connect-src` admits that API origin.
- Confirm HTTPS, DNS, certificates, and reverse-proxy forwarding.
- Confirm the platform preserves Next.js response headers and dynamic routes.
- Run database migrations and B1 runtime verification through the backend release procedure.
- Verify `/health`, `/login`, `/auth/login`, and authenticated `/auth/me`.
- Complete the visual and authenticated smoke matrices below.
- Test every legacy redirect and a direct browser refresh on every dynamic route.
- Inspect browser console, network failures, CSP, CORS, and accessibility errors.
- Confirm observability, error reporting, and rollback access before promotion.
- Promote the same reviewed commit or immutable artifact; do not rebuild from changed inputs.
- Monitor authentication failures, API errors, redirect failures, and server errors after promotion.

## Visual smoke checklist

Test at desktop width, a compact laptop width, tablet width, and mobile width where supported:

- login and expired-session state;
- overview cards, priority queue, and today schedule;
- monitoring filters, selection state, and case actions;
- student list, detail drawer/page, assessment and counseling history;
- counseling calendar, request queue, availability, exceptions, and assignment dialogs;
- counselor directory, profile, routine schedule, and one-time exceptions;
- analytics charts, filters, export configuration, and report preview;
- instrument list, standard detail, scoring, custom builder, review, and publish states;
- hotline list, filters, create/edit panel, validation, and status display;
- settings appearance, language, profile, security, system data, and academic structure;
- loading, empty, partial-failure, forbidden, not-found, and offline/error states;
- keyboard focus, labels, dialogs, contrast, table overflow, and zoom at 200 percent.

Compare the reviewed M09/M10 screenshots and behavior rather than the legacy Expo layout.

## Authenticated browser smoke plan

Use a dedicated non-production administrator account and synthetic records:

| Area | Authenticated action | Expected evidence |
| --- | --- | --- |
| Session | log in, refresh, open a second tab, expire token, log out | correct per-tab persistence, `/auth/me` identity, centralized 401 handling |
| Monitoring | filter cases and open a case | backend data loads and authority checks remain enforced |
| Students | search and open a dynamic detail URL directly | list/detail consistency and successful hard refresh |
| Counseling | create or edit a safe synthetic request/appointment | conflict feedback, resource linkage, refreshed calendar |
| Counselors | open a dynamic profile and inspect availability | schedule, capacity, and exception data agree |
| Analytics | change filters and open report preview | aggregates refresh and preview receives the intended selection |
| Instruments | create a draft and exercise review-safe actions | standard instruments stay locked; custom workflow follows backend authority |
| Hotline | create/edit a synthetic contact and test filters | verification metadata and status persist correctly |
| Settings | change local theme/language; exercise permitted profile/academic actions | local preferences persist and server writes reflect backend responses |
| Redirects | open every mapped legacy URL directly | correct destination without loops or lost authentication |

Capture route, viewport, build SHA, API origin, response status, console output, and screenshot for every failure.

## Readiness conclusion

The cutover design is mechanically coherent: the workspace glob already supports the move, the Next.js route set is complete, no required static assets are missing, and a reversible file-operation sequence exists. M11 therefore passes as a planning milestone.

M12 is not yet safe to begin. The M09/M10/M11 checkpoint is not committed and pushed, and the production/staging target has not been confirmed to support the required Next.js Node runtime. Complete the preconditions above before changing either dashboard directory.
