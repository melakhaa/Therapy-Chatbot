# Expo conventions

The student application is TypeScript on **Expo SDK 54** with **expo-router**:

- `apps/mobile` — Expo React Native 0.81, student app (`newArchEnabled: false`).

The administrator dashboard at `apps/dashboard` is Next.js and does not follow Expo bundling conventions.

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
| `expo-image` | images |
| `expo-haptics` | haptics |
| `expo-linking` | deep links |
| `expo-constants`, `expo-system-ui`, `expo-web-browser` | runtime/config |
| `expo-asset` | asset loading (also installed at root) |

## `app.json` config

- Plugins and deep-link configuration are defined by `apps/mobile/app.json`.
- Env is `EXPO_PUBLIC_*` only ([security-conventions.md](security-conventions.md)).

## Component conventions

- **Local UI kit** in `apps/mobile/components/ui/` (`Button`, `Badge`, `Divider`, `FadeIn`,
  `BottomNav`) and feature folders (`components/chat/`, `components/home/`), each with an
  `index.ts` barrel.
- **Shared design system** from `@prototype/ui-shared` (`ThemeProvider`, `SajiwaColors`,
  typography) — style from the theme, do not hardcode hex values.
- Font: Plus Jakarta Sans, loaded in the root layout via `useFonts`.
- Components are `PascalCase.tsx`; hooks are `useX.ts`.

## Data & state

- All network calls go through `@prototype/api-client` (`apiFetch`, `apiLogin`, `apiChatStream`, admin
  helpers, ...). Never call `fetch` directly in a screen.
- Auth state via `useAuth()` from `@prototype/ui-shared`.
- Chat logic lives in `apps/mobile/hooks/useChat.ts`.

## Env

`apps/mobile/.env` holds `EXPO_PUBLIC_*` vars only. `API_BASE_URL` in `api-client` defaults to
`http://localhost:8000` (Android emulator: `http://10.0.2.2:8000`) and can be overridden at build time
with `EXPO_PUBLIC_API_URL`. See [security-conventions.md](security-conventions.md) for what must never
be `EXPO_PUBLIC_`.

## Run

```bash
cd apps/mobile     && npx expo start   # a = Android, i = iOS, w = web
```

## Monorepo gotcha

The mobile app's `metro.config.js` sets `watchFolders = [workspaceRoot]`, `nodeModulesPaths` for root +
app, and `disableHierarchicalLookup = true`. Keep this when touching mobile bundler config so
`@prototype/*` resolves. See [npm-workspaces-conventions.md](npm-workspaces-conventions.md).
