# Expo Router conventions

Both apps use **expo-router 6** for file-based routing/navigation. (This replaces the standalone
React Navigation setup for app navigation — see [react-navigation-conventions.md](react-navigation-conventions.md).)

## Structure

- `app/` is the route tree; every file is a screen. `app/_layout.tsx` is the root layout.
- Layouts render `<Stack>` / `<Tabs>` from `expo-router` with `headerShown: false` and app-wide
  `screenOptions` (background color, animation).
- `(group)` folders are route groups with no URL segment; the dashboard uses `app/(dashboard)/`,
  which now holds the operator screens (`overview`, `risk`, `assessments`, `students`,
  `students/[id]`, `analytics`, `counseling`, `schedule`, `counselors`, `attention`, `hotlines`,
  `reports`, `users`, `settings`, plus `index` as a legacy redirect).
- Screens are registered explicitly in the root `<Stack>` (mobile: `index`, `register`, `home`,
  `admin`, `chat`, `journal`, `stats`, `profile`; dashboard: `index`, `(dashboard)`,
  `report-preview`). The mobile `forgot-password` screen exists under `app/` but is reached via
  `router.push`, not a `<Stack.Screen>` entry.
- `expo-router/entry` is the package `main` for the dashboard; mobile uses `index.ts`.

## Navigation

- Imperative navigation: `router.push(...)` / `router.replace(...)` from `useRouter()`.
- Read params with `useLocalSearchParams()`.
- Use `Link`/`router` — never `navigation.navigate` directly from screens.
- Dashboard enables `experiments.typedRoutes` so routes are type-checked.

## Config

- Enabled via the `expo-router` plugin in `app.json`.
- Deep linking scheme: mobile `alsahabat`, dashboard `dashboardweb`.

## Rules

- New screen = new file under `app/` + a `<Stack.Screen>` entry in the root layout.
- Keep layouts thin (providers, fonts, splash); put feature logic in `hooks/` and `components/`.
- Route files should not import each other; share through `components/`/`hooks/`.
