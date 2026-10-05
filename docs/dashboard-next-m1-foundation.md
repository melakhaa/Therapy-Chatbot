# Sajiwa dashboard shared foundation (M1)

## Scope

M1 completes the shared Next.js application foundation in `apps/dashboard-next`. Every product route remains a restrained migration placeholder. The existing Expo dashboard, mobile app, FastAPI business logic, PostgreSQL schema, RLS policies, assessment logic, counseling logic, analytics, and reporting code are unchanged.

## Shell and navigation

The App Router `(admin)` layout composes `AuthGuard` and `AppShell`. Desktop uses a persistent, independently scrollable sidebar and a sticky top bar. At widths below 1024px the sidebar becomes an accessible right-side drawer. Content uses the available workspace width and page-level scrolling, with smaller header controls at phone widths.

The sidebar exposes only the approved routes: overview, monitoring, students, counseling, counselors, analytics, instruments, hotline, and settings. Active state covers dynamic descendants, so student, counselor, and instrument detail placeholders keep their parent navigation item selected.

## Authentication and session

The implementation follows the current FastAPI contract:

- `POST /auth/login` accepts `{ email, password }` and returns a bearer access token plus the user profile.
- `GET /auth/me` validates the bearer token and returns the current user.
- JWT access tokens expire according to the backend claim; the backend does not provide a working refresh-token flow.
- Current administrator endpoints require the existing `admin` role.

The bearer session is stored in `sessionStorage`. This limits persistence to the current browser tab and avoids placing credentials in server-rendered output. It remains readable by JavaScript if an XSS vulnerability exists. Mitigations include CSP headers, no unsafe HTML from application content, generic API errors, no token logging, explicit bearer injection, and no credential transmission in URLs or analytics. A stronger HttpOnly SameSite cookie design requires an approved backend or BFF contract and CSRF handling, so it is deferred.

`AuthProvider` models loading, authenticated, unauthenticated, unauthorized, expired, and backend-unavailable states. Startup validation prevents protected-content flash. Any authenticated API response with status 401 emits a central expiry event, clears the session, and returns the user to login. Backend authorization and PostgreSQL RLS remain the security authorities; the frontend guard is only a UX boundary.

## Preferences

Bahasa Indonesia is the default and English is the secondary language. Shell, navigation, login, account actions, dialogs, and common feedback copy use a central message catalog. The preference persists in `localStorage`.

Theme modes are Light, Dark, and System. Semantic CSS tokens provide both color schemes. A small blocking script applies the persisted preference before paint, while the provider follows operating-system changes in System mode. Motion is reduced when the operating system requests it.

## Shared UI

M1 includes buttons and icon buttons, labeled inputs with accessible errors, badges, inline alerts, skeleton/loading/error/empty states, page shells, a confirmation dialog, a right-side drawer, and dropdown menus. Drawer and dialog behavior includes Escape handling, focus containment, focus restoration, close controls, overlay dismissal, and scrollable content. Dropdown menus support Arrow Up/Down, Home, End, Escape, outside dismissal, and focus restoration.

## Web security

Next.js response headers set a content security policy, deny framing and object embedding, limit connections to the configured API origin, restrict referrers, disable MIME sniffing, disable camera/microphone/geolocation, and enable same-origin opener isolation. The CSP permits inline styles and scripts because Next.js runtime styles and the pre-paint theme initializer require them in this foundation. Development additionally permits eval and WebSocket connections. A nonce-based production CSP can be evaluated with a future server-rendering/deployment contract.

## Validation

The workspace provides TypeScript, ESLint, focused Node tests for theme/language/session/role helpers, and a Next.js production build. The build route manifest is the route-resolution check for all static and dynamic placeholders. Live login and `/auth/me` integration still require a reachable configured FastAPI environment.
