# React Native conventions

**React Native 0.81.5** with React 19, via **Expo SDK 54**. Styling is `StyleSheet.create`; layout is
Flexbox. Mobile: `newArchEnabled: false`; dashboard web: `newArchEnabled: true`.

## Platform handling

- Branch with `Platform.OS === 'web'` when APIs differ — the canonical case is storage:
  `localStorage` on web vs `AsyncStorage` on native (`@prototype/api-client/src/storage.ts`).
- Base URLs differ: Android emulator reaches the host at `10.0.2.2`, others `localhost`
  (see `API_BASE_URL` in `api-client`).
- `react-native-web` renders the dashboard; avoid native-only APIs there.

## Core libraries

| Library | Use |
|---------|-----|
| `react-native-safe-area-context` | safe areas (use the provider/hook, not `SafeAreaView` from RN) |
| `react-native-screens` | native screen optimization (managed by expo-router) |
| `@react-native-async-storage/async-storage` | persistent key/value on native |
| `react-native-reanimated` + `react-native-worklets` | animations |
| `react-native-gesture-handler` | gestures (root wrapped in `GestureHandlerRootView`) |
| `react-native-svg` | vector rendering (charts, custom graphics) |
| `react-native-chart-kit` | dashboard charts |

## Conventions

- Styles via `StyleSheet.create` at the bottom of the file; pull colors from the theme
  ([react-native-ui-conventions.md](react-native-ui-conventions.md)), don't hardcode.
- Use `Pressable`/`TouchableOpacity` and `Text`/`View` — no HTML tags (`div`, `span`).
- Images via `expo-image` on the dashboard; static assets in the app's `assets/`.
- Keep animations on the UI thread with Reanimated worklets; don't animate with `setState` in a loop.

Related: [expo-conventions.md](expo-conventions.md), [react-conventions.md](react-conventions.md).
