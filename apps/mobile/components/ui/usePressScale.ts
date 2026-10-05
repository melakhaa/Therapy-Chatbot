// Press feedback shared by buttons and tappable cards: shrink a touch on press-in, settle
// back on release. Tuned to iOS rather than to "bouncy": both springs sit just under critical
// damping, so the release is quick and lively but never visibly overshoots — the old
// release (damping 10) wobbled past 1.0, which reads as a toy, not a native control.
// Runs on the UI thread; skipped when the OS asks for reduced motion.
import { useAnimatedStyle, useSharedValue, withSpring, useReducedMotion } from 'react-native-reanimated';

export function usePressScale(pressedScale = 0.96) {
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => { if (!reduce) scale.value = withSpring(pressedScale, { damping: 30, stiffness: 520, mass: 0.6 }); },
    onPressOut: () => { scale.value = withSpring(1, { damping: 24, stiffness: 340, mass: 0.7 }); },
  };
}
