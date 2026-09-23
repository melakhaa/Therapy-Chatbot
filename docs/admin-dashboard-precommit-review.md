# PRE-COMMIT REVIEW REPORT

Review date: 2026-09-23. Review scope: complete tracked diff against main plus every untracked implementation/test/documentation addition. No commit, push, merge or change to main was performed.

## Repository state

- Branch: feature/admin-dashboard.
- Main: bc6dcf95fd14cbe55b7db0741de940b07a8d2a79, unchanged.
- Working tree: intentionally dirty; unstaged implementation and review changes.
- Final totals, including this report: 25 added/untracked files, 6 modified tracked files, 0 deleted files. Nothing staged.
- No database schema, initialization SQL, RLS policy, mobile screen, chatbot service, package manifest or lockfile changes.

## Corrections made during review

Each production correction was explained before editing.

1. Restored apps/dashboard/app/(dashboard)/index.tsx as a compatibility redirect to /overview. Deleting it removed an existing grouped route target. The first browser regression then caught logout resolving / back into that group. Logout now explicitly resets the root navigator to its index screen, after clearing stored authentication. All logout consumers use the same hook.
2. Restored original shared API error messages. The implementation had replaced HTTP 400 details globally, which hid useful mobile registration and OTP errors. Safe generic dashboard error messages now live only in the dashboard error helper.
3. Applied NULLS LAST to assessment ordering because taken_at is nullable in the actual schema; aligned the new assessment type/date formatter with null. Added a finite page upper bound so user input cannot overflow PostgreSQL OFFSET.
4. Fixed rejected-login text: a 401 during login now says credentials are incorrect instead of claiming the session expired.

## Route deletion assessment

The file is no longer deleted. /overview is canonical; /(dashboard) retains the legacy entry. Expo exports both the root login and the grouped compatibility template. Browser regression covers root login, login to overview, direct legacy entry, direct overview, refresh on both, dynamic student-detail refresh, logout and re-login. Existing source references were searched. The root navigator reset is necessary because an unqualified / from within the group can resolve to the grouped index.

Static deployment still needs clean URL handling. This review does not claim arbitrary hosting configuration has been tested.

## SQL/schema and RLS assessment

Compared queries directly with db/init/01_schema.sql, db/init/02_auth.sql, apps/backend/core/db.py and apps/backend/auth.py. All four new endpoints are read-only and retain request-scoped identity.

| Endpoint | Schema / query | Authorization and visibility |
| --- | --- | --- |
| GET /admin/assessments | assessments LEFT JOIN users on user_id; explicit result columns; consistent count/filter predicates | admin, pemangku_jabatan, konselor. Users RLS masks other identities for counselors while assessment RLS permits their results. UUIDs remain visible as allowed assessment identifiers; this is pseudonymous, not anonymous data. |
| GET /admin/users/{user_id} | Explicit user_id, nama, email, nim, role, created_at selection; UUID parameter | Only admin/pemangku_jabatan; absent target returns 404. No password fields. |
| GET /admin/users/{user_id}/assessments | Target user_id predicate; explicit assessment columns; deterministic paginated order | Operator roles; current assessment RLS already allows counselors all assessment results. No raw answers or identity lookup. |
| GET /admin/users/{user_id}/bookings | booking_konsultasi JOIN jadwal_konsultasi using the real jadwal_id FK; selects ID/status/date/times | Operator roles; counselor rows are limited by existing booking/schedule RLS. No notes or user profile fields in this endpoint. |

- All identifiers and referenced columns exist. LEFT JOIN is deliberate: a counselor's restricted users visibility must not discard otherwise authorized assessments. Booking join uses a non-null FK; RLS can legitimately suppress inaccessible rows.
- Authentication uses the existing verified JWT and database role lookup, not a client-provided role. Mahasiswa is denied all four routes. Every query receives operator.id; the DB helper sets app.current_user_id transaction-locally. No new privileged helper, bypass, grant or policy change.
- RLS enforcement depends on deployment continuing to use the configured non-superuser sanctuary_app connection. A superuser/table-owner connection would invalidate the intended guarantee; the unavailable deployment could not be inspected live.
- User IDs are FastAPI UUID values converted to bound strings. SQL uses bound placeholders throughout; concatenated SQL consists only of constant fragments. Search escapes backslash, percent and underscore before ILIKE. No user-supplied SQL identifiers or sort clauses.
- Page size is 1..100; page is 1..2147483647, keeping computed offsets within PostgreSQL bigint. High offsets can still be slow; no performance claim is made.
- Severity/instrument enums, search length, date parsing and date-range validation are bounded. Upper date is exclusive next day; timestamps use the database session timezone for date boundaries. Null timestamps are excluded by active date filters and sort last otherwise. Null name/NIM are handled as restricted/missing values in UI.
- Count and rows are separate queries, so concurrent changes can temporarily make totals differ from returned rows. This is not a shared snapshot.
- Histories return an empty list for an absent/inaccessible target instead of revealing existence through different error responses.
- No new endpoint selects passwords, OTPs, tokens, journals, messages, raw guardrail text, assessment answers or booking notes. Authorized profile contact details and health-assessment results are intentionally sensitive data, not public information.
- Static review found no SQL/schema mismatch or authorization bypass. Stubbed tests do not execute SQL or prove RLS at runtime.

## API-client compatibility

Successful responses still use res.json(); request methods, bodies, headers, authentication, login persistence and storage are unchanged. Existing non-JSON/empty successful response behavior is also unchanged. ApiError remains an Error and adds status (its name is now ApiError); inspected existing consumers do not depend on the old name. Error message extraction matches main, including malformed error-response fallback.

EXPO_PUBLIC_API_URL is an opt-in build-time override. With it unset, Android emulator, iOS/web development and production fallback selection match main. Production still requires setting a real origin because the existing production placeholder is unchanged. No native storage behavior was changed.

An isolated comparison against main exercised six OS/development combinations, successful responses, request headers/auth/base overrides, 400/401/403/422/500 errors, malformed error JSON, login persistence and the explicit environment override. All passed. Mobile TypeScript also passed. Physical native execution and real chatbot responses remain unverified.

## Hardcoded/mock/secret scan

No new runtime fake users, demo fallback records, TODO/FIXME markers, data console.log calls, hardcoded credentials/tokens or TypeScript any were found in the new dashboard/admin code.

Expected findings: synthetic users/tokens/test signing key and PASS/diagnostic logs exist only in isolated test scripts. Browser-test localhost URLs are test-server/interception addresses. The shared client's existing localhost:8000, Android 10.0.2.2:8000 and production-placeholder defaults remain; existing any annotations in apiRegister/apiGetJournals predate this work. Route/role casts exist but no new any. No actual secret was found by the source scan; this is not a full historical credential audit.

Dashboard 400/500 errors are sanitized to avoid showing backend exception text. Booking notes from the existing authorized incoming-booking endpoint appear only in its detail dialog. No private chat/journal content is rendered.

## Validation

- Dashboard TypeScript: passed after final routing correction.
- Mobile TypeScript: passed.
- Dashboard ESLint: passed after final routing correction.
- Expo static web export: passed; root login, compatibility route and requested route templates exported.
- Python compileall: passed.
- Isolated backend unittest suite: 14 passed, including authorization, UUID/filter validation, parameterization, paging, nullable-date ordering and sensitive-column checks.
- Shared API comparison against main: passed.
- Isolated Playwright browser regression: all checks passed after the logout correction; zero browser runtime/hydration errors. Covered login failure/success, legacy/direct routes and refresh, student-detail refresh, account CRUD, counseling status flows, filtering, empty/error/retry states, responsive layouts, logout/re-login, counselor restrictions and expired sessions. Results: D:/tmp/sanctuary-admin-browser-results/result.json.
- Git whitespace/diff and protected-file checks: passed (only Git line-ending conversion notices).

The initial compatibility-route browser run detected a logout regression, which was corrected; it is not counted as a passing run. The complete final rerun passed.

## Deployment and remaining unverified items

The exact known /students/[id] requirement is an internal HTTP 200 rewrite of /students/<uuid> to the exported dist/students/[id].html file, preserving the requested URL so Expo Router receives the UUID. Do not redirect the browser to the literal bracket URL. Serve exported assets and normal clean-route HTML as well. If public group-qualified student URLs are supported, apply the analogous /(dashboard)/students/<uuid> template rewrite. The browser harness supplies the canonical rewrite; the production host must do so independently.

Set EXPO_PUBLIC_API_URL to the real backend origin before building and restart the backend with the new router module. No deployment was performed.

Live PostgreSQL SQL execution, effective deployed RLS/grants, full backend integration, Ollama/RAG/chatbot service execution, Python 3.12 runtime, physical mobile behavior and production hosting rewrites remain unverified. Isolated backend tests used available Python 3.13. Existing unrelated security concerns documented in the implementation report were not changed or newly exposed by these endpoints.

Recommendation: retain the narrow corrections above. No redesign or new feature is recommended for this review. Source can be considered for commit after final safe checks pass; live-service and hosting checks remain necessary before deployment. No commit or push is authorized or performed by this review.