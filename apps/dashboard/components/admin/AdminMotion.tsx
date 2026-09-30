import React, { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

export const adminMotion = {
  fast: 120,
  normal: 220,
  slow: 360,
  easing: Easing.bezier(0.2, 0.8, 0.2, 1),
};

export function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

export function MotionSurface({ children, style, distance = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; distance?: number }) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduced ? 0 : distance)).current;
  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: adminMotion.normal, easing: adminMotion.easing, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: adminMotion.normal, easing: adminMotion.easing, useNativeDriver: true }),
    ]).start();
  }, [distance, opacity, reduced, translateY]);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
