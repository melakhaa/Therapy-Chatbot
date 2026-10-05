# Sajiwa dashboard migration foundation (M0)

## Boundary

`apps/dashboard-next` is a temporary Next.js App Router workspace. The existing Expo dashboard remains runnable in `apps/dashboard` until explicit cutover approval. FastAPI and PostgreSQL remain the behavioral and data sources of truth.

The supplied screenshots inform spacing, hierarchy, responsive intent, drawers, tables, filters, and semantic color. They do not define clinical rules, permissions, database fields, or API behavior.

## Existing implementation map

- Dashboard: Expo Router 6, React Native Web, React 19, `StyleSheet`, React Native primitives, `react-native-svg`, and `react-native-chart-kit`.
- Routes: overview, assessments, attention/risk, students/detail, counseling requests, schedule, counselors, analytics/reports, report preview, instruments, hotlines, settings, and user management.
- Reusable framework-independent code: API response/request types, URL query construction, domain unions, date/formatting utilities, localization copy, permission concepts, and validated DASS-21 constants/logic.
- Rewrite for the web: Expo Router routes, React Native `View`/`Text`/`Pressable`, `StyleSheet`, modal-heavy flows, RN chart rendering, calendar rendering, and dashboard-specific theme/provider code.
- Preview system: `EXPO_PUBLIC_ADMIN_PREVIEW=true` plus local synthetic fixtures in the old dashboard. It remains local and untouched by M0.

## Auth strategy

The backend issues HS256 bearer JWTs from `POST /auth/login`; `/auth/me` returns the current profile. There is no refresh-token rotation despite the legacy response shape containing a `refresh_token` field. Role authorization remains enforced by FastAPI `require_role` and PostgreSQL RLS.

M0 provides a browser-only session adapter and bearer injection without adding NextAuth/Auth.js. The M1 audit confirmed that the current administrator endpoints require the existing `admin` role. M1 validates `/auth/me` at startup, allows only `admin`, clears expired sessions on 401, and redirects to `/login`.

M1 stores the bearer session in `sessionStorage`, scoped to the current browser tab. This is compatible with the existing backend and is not vulnerable to conventional cookie CSRF because credentials are sent explicitly in the Authorization header. Browser storage remains exposed to XSS, so the dashboard uses a CSP, avoids unsafe HTML, and never logs or server-renders tokens. Moving to an HttpOnly SameSite cookie would require an explicitly approved backend/BFF contract change and CSRF protection for state-changing requests.

## API and database compatibility

Existing endpoints cover login/profile, account management, student directory and academic profiles, assessment/attention data, counseling requests, counselor profiles, recurring availability, blocked periods, appointments, analytics/comparison/report data, versioned instruments, hotlines, and notifications. Existing RLS applies because FastAPI sets `app.current_user_id` on the non-superuser database connection.

The base client in M0 keeps browser concerns separate from the React Native API package. It supports bearer injection, JSON and non-JSON responses, typed results, standardized errors, and native `AbortSignal` through `RequestInit`.

## Capability gaps for later milestones

| Capability | Classification | Reason / later action |
| --- | --- | --- |
| Student faculty/program data | Existing | `student_academic_profiles`, faculties, and academic units exist. |
| Reported mental-health condition and disability | C: additive migration + B: API + D: permission | The academic profile currently stores only faculty/unit. Add structured, nullable support fields with explicit field-level authorization, auditability, and neutral wording. |
| Physical and virtual rooms | C: additive migration + B: API | No first-class room/resource model. Add resource table with type, status, capacity, and uniqueness. |
| Room availability and exceptions | C + B | Existing availability/blocks are counselor-centered. Add resource availability/blocking. |
| Appointment-room assignment | C + B | Appointments do not own a first-class room/platform relation. Add nullable resource reference for backward compatibility. |
| Counselor recurring availability | Existing | Rules and blocked periods exist; API semantics need UX adaptation. |
| Counselor instrument approval | C + B + D | Current validation is admin-driven. Add reviewer role, immutable decision record, and authorization policy. |
| Validation comments/history | C + B + D | Add version comments and approval events without rewriting published history. |
| Hotline verification metadata | C + B | Add status, type, coverage/hours, verifier, verified timestamp, and note fields. |
| Custom report configuration | B, optionally C | Current report aggregation exists; saved reusable configurations need additive storage only if required. |
| Future counselor dashboard permissions | D | Define endpoint-specific RBAC and RLS; do not widen current admin routes globally. |
| Theme/language preference | A initially | Device-local preference is sufficient; persistence across devices can be additive later. |

All future schema work must use new ordered migrations, nullable/defaulted columns or new tables, and corresponding RLS policies. Existing migration files and historical assessment/counseling records remain immutable.

## Privacy rules carried forward

- Never return or render raw chatbot messages, journal content, guardrail trigger text, assessment answer wording in notifications, password material, JWTs, OTPs, or secrets.
- Monitoring uses operational metadata only. UI colors do not establish clinical classification.
- Safety cases remain visible and are not visually deprioritized.
- Sensitive student support fields require explicit backend authorization and auditability before M4 exposure.

## M1 plan

1. Implement the Sajiwa responsive shell and navigation from the written information architecture.
2. Add Indonesian-first copy, English switching, and light/dark/system preferences.
3. Complete the login/logout/session state machine against FastAPI and role guards.
4. Add CSP and centralized 401/403 handling.
5. Establish accessible UI primitives, drawer behavior, loading/error/empty states, and keyboard navigation.
6. Keep all feature routes as placeholders until their named milestone.
