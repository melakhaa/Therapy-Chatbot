import React, { createContext, useContext, type ReactNode } from 'react';
import { apiGetProfile, clearAuth, type Profile } from '@prototype/api-client';
import { useNavigation } from 'expo-router';
import { View } from 'react-native';
import { useAdminResource } from '@/hooks/useAdminResource';
import { Button, ErrorState, LoadingState } from '@/components/ui';
const Context = createContext<Profile | null>(null);
export function useAdminProfile() { const profile = useContext(Context); if (!profile) throw new Error('AdminAuth required'); return profile; }
export function canManageUsers(profile: Profile) { return profile.role === 'admin' || profile.role === 'pemangku_jabatan'; }
export function useLogout() {
  const navigation = useNavigation('/');
  return async () => {
    await clearAuth();
    // Target the root screen explicitly: both route groups contain an index.
    navigation.reset({ index: 0, routes: [{ name: 'index' as never }] });
  };
}
export function AdminAuth({ children }: { children: ReactNode }) {
  const logout = useLogout();
  const resource = useAdminResource(apiGetProfile);
  if (resource.loading) return <LoadingState />;
  if (resource.error || !resource.data || resource.data.role === 'mahasiswa') return <View style={{ padding: 30, gap: 20 }}><ErrorState message={resource.error || 'Portal ini hanya tersedia untuk admin, konselor, dan pemangku jabatan.'} retry={resource.reload} /><Button label="Kembali ke login" onPress={() => { void logout(); }} /></View>;
  return <Context.Provider value={resource.data}>{children}</Context.Provider>;
}
