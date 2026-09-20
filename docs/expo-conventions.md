# Expo conventions

Two apps, both TypeScript, both on **Expo SDK 54** with **expo-router**:

- `apps/mobile` — Expo React Native 0.81, student app (`newArchEnabled: false`).
- `apps/dashboard` — Expo rendered for web via `react-native-web` (`newArchEnabled: true`,
  `web.output: "static"`). The README calls it "Next.js"; the code is Expo web, run with
  `expo start --web`.

Core React Native rules live in [react-native-conventions.md](react-native-conventions.md); routing in
[expo-router-conventions.md](expo-router-conventions.md).

## Expo modules in use

| Module | Use |
|--------|-----|
| `expo-router` | routing/navigation |
| `expo-font` + `@expo-google-fonts/plus-jakarta-sans` | Plus Jakarta Sans |
| `expo-splash-screen` | splash / `AnimatedSplashScreen` |
| `expo-status-bar` | status bar |
| `expo-linear-gradient`, `expo-blur` | visual effects |
| `expo-symbols`, `@expo/vector-icons` | icons |
| `expo-image` | images (dashboard) |
| `expo-haptics` | haptics (dashboard) |
| `expo-linking` | deep links |
| `expo-constants`, `expo-system-ui`, `expo-web-browser` | runtime/config (dashboard) |
| `expo-asset` | asset loading (also installed at root) |

## `app.json` config

- Plugins: `expo-router`, `expo-font` (mobile); `expo-router`, `expo-splash-screen` (dashboard).
- Deep-link schemes: `alsahabat` (mobile), `dashboardweb` (dashboard).
- Dashboard `experiments`: `typedRoutes: true`, `reactCompiler: true`.
- Env is `EXPO_PUBLIC_*` only ([security-conventions.md](security-conventions.md)).

## Component conventions

- **Local UI kit** in `apps/mobile/components/ui/` (`Button`, `Badge`, `Divider`, `FadeIn`,
  `BottomNav`) and feature folders (`components/chat/`, `components/home/`), each with an
  `index.ts` barrel.
- **Shared design system** from `@prototype/ui-shared` (`ThemeProvider`, `SanctuaryColors`,
  typography) — style from the theme, do not hardcode hex values.
- Dashboard keeps its own `components/` + `constants/theme.ts`.
- Font: Plus Jakarta Sans, loaded in the root layout via `useFonts`.
- Components are `PascalCase.tsx`; hooks are `useX.ts`.

## Data & state

- All network calls go through `@prototype/api-client` (`apiFetch`, `apiLogin`, `apiChat`, ...).
  Never call `fetch` directly in a screen.
- Auth state via `useAuth()` from `@prototype/ui-shared`.
- Chat logic lives in `apps/mobile/hooks/useChat.ts`.

## Env

`apps/mobile/.env` holds `EXPO_PUBLIC_*` vars only. `API_BASE_URL` in `api-client` defaults to
`http://localhost:8000` (Android emulator: `http://10.0.2.2:8000`). See
[security-conventions.md](security-conventions.md) for what must never be `EXPO_PUBLIC_`.

## Run

```bash
cd apps/mobile     && npx expo start   # a = Android, i = iOS, w = web
cd apps/dashboard  && npm run dev      # expo web
```

## Monorepo gotcha

Both apps' `metro.config.js` set `watchFolders = [workspaceRoot]`, `nodeModulesPaths` for root +
app, and `disableHierarchicalLookup = true`. Keep this when touching bundler config so
`@prototype/*` resolves. See [npm-workspaces-conventions.md](npm-workspaces-conventions.md).
