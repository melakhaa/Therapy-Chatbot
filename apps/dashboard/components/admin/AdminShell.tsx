import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, Slot, usePathname, type Href } from 'expo-router';
import { adminTheme as c } from '@/constants/adminTheme';
import { Avatar, Button, ui } from '@/components/ui';
import { useLogout, useAdminProfile } from './AdminAuth';
const nav: { label: string; path: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { label: 'Overview', path: '/overview', icon: 'dashboard' },
  { label: 'Risk Monitoring', path: '/risk', icon: 'monitor-heart' },
  { label: 'Students', path: '/students', icon: 'people-outline' },
  { label: 'Analytics', path: '/analytics', icon: 'bar-chart' },
  { label: 'Counseling', path: '/counseling', icon: 'event-note' },
  { label: 'User Management', path: '/users', icon: 'manage-accounts' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
];
export default function AdminShell() {
  const logout = useLogout();
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const [open, setOpen] = useState(false);
  const profile = useAdminProfile();
  const pathname = usePathname();
  const current = nav.find(n => pathname.startsWith(n.path))?.label || 'Student Detail';
  const sidebar = <ScrollView style={{ width: 224, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={[s.sidebar, { flexGrow: 1 }]}>
    <View style={[ui.row, { paddingVertical: 12 }]}><MaterialIcons name="spa" size={31} color={c.primary} /><View><Text style={s.brand}>Sanctuary</Text><Text style={[ui.muted, { fontSize: 9 }]}>A Safer Mind, A Brighter Tomorrow</Text></View></View>
    <Text style={[ui.muted, { fontSize: 10, letterSpacing: 1.5, marginTop: 24, marginBottom: 12 }]}>ADMIN WORKSPACE</Text>
    <View style={{ gap: 5 }}>{nav.map(item => { const active = pathname.startsWith(item.path); return <Pressable key={item.path} accessibilityRole="link" accessibilityLabel={item.label} accessibilityState={{ selected: active }} onPress={() => { setOpen(false); router.push(item.path as Href); }}
      style={({ pressed }) => [s.navItem, { backgroundColor: active ? c.primarySoft : pressed ? c.background : c.surface }]}>
      <MaterialIcons name={item.icon} size={19} color={active ? c.primary : c.muted} /><Text style={{ color: active ? c.primary : c.muted, fontSize: 12, fontWeight: active ? '700' : '500' }}>{item.label}</Text>
    </Pressable>; })}</View>
    <View style={{ flex: 1 }} />
    <View style={{ backgroundColor: c.primarySoft, padding: 16, borderRadius: 14, marginVertical: 20 }}><MaterialIcons name="eco" color={c.primary} size={24} /><Text style={{ color: c.primary, fontSize: 13, lineHeight: 21, marginTop: 8 }}>Mahasiswa lebih sehat. Komunitas lebih kuat.</Text></View>
    <View style={[ui.row, { borderTopWidth: 1, borderColor: c.border, paddingTop: 20 }]}><Avatar name={profile.nama} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={[ui.text, { fontWeight: '600' }]}>{profile.nama}</Text><Text style={[ui.muted, { fontSize: 10 }]}>{profile.role.replaceAll('_', ' ')}</Text></View></View>
    <Button icon="logout" label="Keluar" tone="quiet" onPress={() => { void logout(); }} />
    {compact && <Button label="Tutup navigasi" tone="quiet" onPress={() => setOpen(false)} />}
  </ScrollView>;
  return <View style={s.root}>
    {!compact && sidebar}
    {compact && <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.overlay }}>{sidebar}<Pressable accessibilityRole="button" accessibilityLabel="Tutup navigasi" style={{ flex: 1 }} onPress={() => setOpen(false)} /></View></Modal>}
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={s.header}>{compact && <Button label="Menu" icon="menu" tone="quiet" onPress={() => setOpen(true)} />}<View style={{ flex: 1 }}><Text style={[ui.text, { fontWeight: '600' }]}>{current}</Text><Text style={[ui.muted, { fontSize: 10 }]}>Support. Monitor. Empower.</Text></View><MaterialIcons name="lock-outline" size={16} color={c.primary} />{width > 650 && <Text style={ui.muted}>Area rahasia</Text>}<Avatar name={profile.nama} /></View>
      <Slot />
    </View>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: c.background },
  sidebar: { width: 224, backgroundColor: c.surface, borderRightWidth: 1, borderColor: c.border, paddingHorizontal: 18, paddingVertical: 18, gap: 10 },
  brand: { fontSize: 21, fontWeight: '700', color: c.primary, letterSpacing: -0.8 },
  navItem: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8 },
  header: { minHeight: 70, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.surface, borderBottomWidth: 1, borderColor: c.border },
});
