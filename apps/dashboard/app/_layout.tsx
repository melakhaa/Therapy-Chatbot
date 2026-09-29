import { Slot, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  useFonts,
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { T } from '../constants/sajiwa';
import { getStoredUserSync } from '@prototype/api-client';

/**
 * Root layout — handles auth gate.
 * If token exists in localStorage → show dashboard.
 * If not → show login (index).
 * This prevents the "flash login on refresh" problem.
 */
export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const segments = useSegments();
  // Same typeface as the mobile app
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });

  // Check auth on mount (synchronous localStorage read — fast)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Same keys the api-client writes on login (was reading 'sajiwa_*', which never exist)
      const token = localStorage.getItem('sanctuary_token');
      const user = getStoredUserSync<{ role: string }>();
      if (token && user && ['admin', 'pemangku_jabatan', 'konselor'].includes(user.role)) {
        setIsLoggedIn(true);
      }
    }
    setIsReady(true);
  }, []);

  // Route protection: redirect based on auth state
  useEffect(() => {
    if (!isReady) return;

    const inDashboard = segments[0] === '(dashboard)';

    if (isLoggedIn && !inDashboard) {
      // Logged in but on login page → go to dashboard
      router.replace('/(dashboard)');
    } else if (!isLoggedIn && inDashboard) {
      // Not logged in but on dashboard → go to login
      router.replace('/');
    }
  }, [isReady, isLoggedIn, segments]);

  // Show loading while checking auth
  if (!isReady || !fontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  return (
    <>
      <Slot />
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bg,
  },
});
