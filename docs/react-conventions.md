# React conventions

**React 19** is used in both apps (and `react-dom` for web). Function components + hooks only.

## Conventions

- Function components, one per file, named after the file (`Button.tsx` → `export function Button`).
- Hooks: built-ins (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`); custom hooks are
  `useX` and live in `hooks/` or a shared package (`useAuth`, `useChat`, `useAnimatedEntrance`,
  `useColorScheme`, `useThemeColor`).
- Memoize callbacks passed to effects/children with `useCallback`; derive values with `useMemo`
  rather than recalculating in render.
- Global state via **React Context**, not a state library: `ThemeProvider` / `ThemeContext` in
  `@prototype/ui-shared`; consume with the exported hook.
- Effects that load persisted data run once on mount (see `useAuth`); always clean up subscriptions.
- `"use client"`-style directives are not used — the dashboard is Expo Router web, not Next.js.
- Dashboard enables the React Compiler experiment; avoid patterns that fight auto-memoization
  (don't hand-memoize everything).

## Component composition

- Presentational components in `components/`; feature folders (`components/chat/`, `components/home/`)
  re-export via `index.ts`.
- Screens own data-fetching (via `@prototype/api-client`) and pass props down.
- Prefer composition/props over inheritance or render-prop gymnastics; no class components.

Related: [react-native-conventions.md](react-native-conventions.md), [react-native-ui-conventions.md](react-native-ui-conventions.md).
