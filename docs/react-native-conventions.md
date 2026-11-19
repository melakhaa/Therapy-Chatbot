# React Native conventions

**React Native 0.81.5** with React 19, via **Expo SDK 54** (`newArchEnabled: false`). Styling is
`StyleSheet.create`; layout is Flexbox.

## Platform handling

- Branch with `Platform.OS === 'web'` when APIs differ — the canonical case is storage:
  `localStorage` on web vs `AsyncStorage` on native (`@prototype/api-client/src/storage.ts`).
- Base URLs differ: Android emulator reaches the host at `10.0.2.2`, others `localhost`
  (see `API_BASE_URL` in `api-client`).
- `react-native-web` also runs the app as a website; avoid native-only APIs there.

## Core libraries

| Library | Use |
|---------|-----|
| `react-native-safe-area-context` | safe areas (use the provider/hook, not `SafeAreaView` from RN) |
| `react-native-screens` | native screen optimization (managed by expo-router) |
| `@react-native-async-storage/async-storage` | persistent key/value on native |
| `react-native-reanimated` + `react-native-worklets` | animations |
| `react-native-gesture-handler` | gestures (root wrapped in `GestureHandlerRootView`) |

## Conventions

- Styles via `StyleSheet.create` at the bottom of the file; pull colors from the theme
  ([react-native-ui-conventions.md](react-native-ui-conventions.md)), don't hardcode.
- Use `Pressable`/`TouchableOpacity` and `Text`/`View` — no HTML tags (`div`, `span`).
- Keep animations on the UI thread with Reanimated worklets; don't animate with `setState` in a loop.

## Streaming chat

The reply arrives as SSE frames: metadata first (`route`, `is_high_risk`), then a `token`
frame with the complete reply, then `[DONE]`. Two client rules still apply:

- **Clear `isTyping` on the first `token`, not on the first event.** The metadata frame lands in
  ~80ms while the first token waits for retrieval and prompt processing (measured 4.3s warm, much
  longer cold). Clearing on any event left the typing indicator and the `berpikir` face visible
  for a blink, then a blank screen for the whole wait.
- **Memoise message bubbles.** Changes to the active message should not re-render every
  settled bubble and replay list animations.

Related: [expo-conventions.md](expo-conventions.md), [react-conventions.md](react-conventions.md).
