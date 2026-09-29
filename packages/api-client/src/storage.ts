import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveToken(token: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem('sanctuary_token', token);
  } else {
    await AsyncStorage.setItem('sanctuary_token', token);
  }
}

export async function saveRefreshToken(token: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem('sanctuary_refresh_token', token);
  } else {
    await AsyncStorage.setItem('sanctuary_refresh_token', token);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('sanctuary_refresh_token');
  } else {
    return await AsyncStorage.getItem('sanctuary_refresh_token');
  }
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('sanctuary_token');
  } else {
    return await AsyncStorage.getItem('sanctuary_token');
  }
}

export async function saveUser(user: object) {
  if (Platform.OS === 'web') {
    localStorage.setItem('sanctuary_user', JSON.stringify(user));
  } else {
    await AsyncStorage.setItem('sanctuary_user', JSON.stringify(user));
  }
}

export async function getStoredUser<T = Record<string, unknown>>(): Promise<T | null> {
  let raw: string | null = null;
  if (Platform.OS === 'web') {
    raw = localStorage.getItem('sanctuary_user');
  } else {
    raw = await AsyncStorage.getItem('sanctuary_user');
  }
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuth() {
  if (Platform.OS === 'web') {
    localStorage.removeItem('sanctuary_token');
    localStorage.removeItem('sanctuary_refresh_token');
    localStorage.removeItem('sanctuary_user');
    localStorage.removeItem('sanctuary_chat_session');
  } else {
    await AsyncStorage.multiRemove([
      'sanctuary_token',
      'sanctuary_refresh_token',
      'sanctuary_user',
      'sanctuary_chat_session',
    ]);
  }
}

// ── Chat session pointer ──────────────────────────────────────────────────────
// Only the id lives on the device; the transcript stays encrypted in Postgres. Cleared on
// logout so the next student on a shared device never resumes someone else's session.

export async function saveChatSessionId(id: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem('sanctuary_chat_session', id);
  } else {
    await AsyncStorage.setItem('sanctuary_chat_session', id);
  }
}

export async function getChatSessionId(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('sanctuary_chat_session');
  }
  return await AsyncStorage.getItem('sanctuary_chat_session');
}

// Sync access for web dashboard that used sync calls
export function getStoredUserSync<T = Record<string, unknown>>(): T | null {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('sanctuary_user');
    return raw ? JSON.parse(raw) : null;
  }
  return null;
}

export function clearAuthSync() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sanctuary_token');
    localStorage.removeItem('sanctuary_refresh_token');
    localStorage.removeItem('sanctuary_user');
    localStorage.removeItem('sanctuary_chat_session');
  }
}
