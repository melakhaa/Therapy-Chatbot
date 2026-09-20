# React Navigation conventions

**React Navigation 7** (`@react-navigation/native`, `bottom-tabs`, `elements`) is a dependency of the
dashboard. It is the engine **underneath expo-router**, not a separate navigation stack.

## Rules

- Do **not** create a `NavigationContainer` or `createNativeStackNavigator` manually — expo-router
  owns the navigation tree ([expo-router-conventions.md](expo-router-conventions.md)).
- Use React Navigation packages only where expo-router exposes them:
  - `@react-navigation/bottom-tabs` for tab bar behavior/options.
  - `@react-navigation/elements` for themed header primitives.
  - `@react-navigation/native` for hooks/theme types if needed.
- Bottom navigation on mobile is the app's own `components/ui/BottomNav.tsx`; the dashboard's tab
  experience is driven by expo-router's `<Tabs>` with React Navigation options.
- Prefer `useRouter()` / `useLocalSearchParams()` from `expo-router` over React Navigation's
  `useNavigation()` in screens.
- If a feature genuinely needs a custom navigator, wrap it in an expo-router layout rather than
  mounting a second container.

Related: [react-native-conventions.md](react-native-conventions.md), [expo-router-conventions.md](expo-router-conventions.md).
