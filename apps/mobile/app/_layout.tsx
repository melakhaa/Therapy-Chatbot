import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { setUnauthorizedCallback } from '@prototype/api-client';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_700Bold_Italic,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '@prototype/ui-shared';
import { SajiwaColors } from '@prototype/ui-shared';
import { AnimatedSplashScreen } from '../components/AnimatedSplashScreen';
import { ToastProvider } from '../components/ui/Toast';
import { ConsentSheet } from '../components/ui/ConsentSheet';

SplashScreen.preventAutoHideAsync();

// Bottom-nav tabs switch instantly, the way a native tab bar does, and never swipe back
const TAB = { animation: 'none', gestureEnabled: false } as const;
// Auth screens replace each other rather than stacking, so they cross-fade
const AUTH = { animation: 'fade', gestureEnabled: false } as const;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_700Bold_Italic,
    PlusJakartaSans_800ExtraBold,
  });

  const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);

  useEffect(() => {
    setUnauthorizedCallback(() => {
      router.replace('/');
    });
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ToastProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: SajiwaColors.background },
            // Native stack: the push runs on the platform compositor, so it keeps
            // 60fps even while JS is busy. 'ios_from_right' gives Android the iOS push (the
            // screen underneath drifts left instead of sitting still) and resolves to the
            // native push on iOS itself.
            animation: 'ios_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            // Swipe back from anywhere on the screen, not just the 20pt left edge — how
            // iOS apps with a custom bar (no navigation bar) usually feel. Catch: a rightward
            // swipe anywhere now means "back", so a pushed screen that pages content
            // sideways (carousel, calendar, horizontal list) must set it false for itself.
            // Today those all live on TAB screens, where swipe-back is off anyway.
            fullScreenGestureEnabled: true,
          }}
        >
          <Stack.Screen name="index" options={AUTH} />
          <Stack.Screen name="register" options={AUTH} />
          <Stack.Screen name="home" options={TAB} />
          <Stack.Screen name="admin" options={AUTH} />
          <Stack.Screen name="chat" options={TAB} />
          <Stack.Screen name="journal" />
          <Stack.Screen name="assessment" />
          <Stack.Screen name="stats" />
          <Stack.Screen name="profile" options={TAB} />
          <Stack.Screen name="schedule" options={TAB} />
          <Stack.Screen name="journal-history" options={TAB} />
        </Stack>
        {/* Privacy consent, once per account, above every screen */}
        <ConsentSheet />
        {!splashAnimationFinished && (
          <AnimatedSplashScreen onAnimationComplete={() => setSplashAnimationFinished(true)} />
        )}
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

