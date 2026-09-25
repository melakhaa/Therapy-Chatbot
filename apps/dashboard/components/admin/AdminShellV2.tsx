import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, Slot, usePathname, type Href } from 'expo-router';
import { adminTheme as c } from '@/constants/adminTheme';
import { Avatar, Button, ui } from '@/components/ui';
import { ADMIN_PREVIEW } from '@/services/adminData';
import { useAdminProfile, useLogout } from './AdminAuth';

type Icon = React.ComponentProps<typeof MaterialIcons>['name'];
const sections: { label: string; items: { label: string; path: string; icon: Icon }[] }[] = [
  { label: 'OVERVIEW', items: [{ label: 'Overview', path: '/overview', icon: 'space-dashboard' }] },
  { label: 'MONITORING', items: [
    { label: 'Assessment Monitoring', path: '/assessments', icon: 'assignment' },
    { label: 'High-Risk Monitoring', path: '/attention', icon: 'health-and-safety' },
    { label: 'Analytics & Reports', path: '/reports', icon: 'insights' },
  ] },
  { label: 'COUNSELING', items: [
    { label: 'Counseling Schedule', path: '/schedule', icon: 'calendar-month' },
    { label: 'Counselor Management', path: '/counselors', icon: 'supervisor-account' },
  ] },
  { label: 'MANAGEMENT', items: [
    { label: 'Student Management', path: '/students', icon: 'school' },
    { label: 'Hotline Management', path: '/hotlines', icon: 'support-agent' },
  ] },
  { label: 'SYSTEM', items: [{ label: 'Settings', path: '/settings', icon: 'settings' }] },
];

export default function AdminShellV2() {
  const profile = useAdminProfile();
  const logout = useLogout();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const compact = width < 940;
  const narrow = width < 700;
  const phone = width < 500;
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const current = sections.flatMap(section => section.items).find(item => pathname.startsWith(item.path));
  const sidebarWidth = collapsed && !compact ? 82 : 250;

  const sidebar = <ScrollView style={{ width: sidebarWidth, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={[s.sidebar, { width: sidebarWidth }]}>
    <View style={[ui.row, { paddingHorizontal: collapsed ? 4 : 2, paddingVertical: 8, flexWrap: 'nowrap' }]}>
      <View style={s.brandIcon}><MaterialIcons name="spa" size={24} color={c.surface} /></View>
      {!collapsed && <View style={{ flex: 1 }}><Text style={s.brand}>Sanctuary</Text><Text style={s.brandSub}>ADMIN DASHBOARD</Text></View>}
    </View>
    <View style={{ gap: 18, marginTop: 22 }}>{sections.map(section => <View key={section.label} style={{ gap: 6 }}>
      {!collapsed && <Text style={s.sectionLabel}>{section.label}</Text>}
      {section.items.map(item => {
        const active = pathname.startsWith(item.path);
        return <Pressable key={item.path} accessibilityRole="link" accessibilityLabel={item.label} accessibilityState={{ selected: active }}
          onPress={() => { setDrawer(false); router.push(item.path as Href); }}
          style={({ pressed }) => [s.navItem, collapsed && { justifyContent: 'center' }, active && s.navActive, pressed && { opacity: 0.72 }]}>
          <MaterialIcons name={item.icon} size={20} color={active ? c.primary : c.muted} />
          {!collapsed && <Text style={[s.navText, active && s.navTextActive]}>{item.label}</Text>}
          {!collapsed && active && <View style={s.activeDot} />}
        </Pressable>;
      })}
    </View>)}</View>
    <View style={{ flex: 1, minHeight: 28 }} />
    {!collapsed && <View style={s.profileCard}><View style={[ui.row, { flexWrap: 'nowrap' }]}><Avatar name={profile.nama} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={[ui.text, { fontWeight: '700' }]}>{profile.nama}</Text><Text style={[ui.muted, { fontSize: 10 }]}>Administrator</Text></View></View><Button label="Keluar" icon="logout" tone="quiet" onPress={() => { void logout(); }} /></View>}
    {collapsed && <Pressable accessibilityRole="button" accessibilityLabel="Keluar" onPress={() => { void logout(); }} style={s.iconButton}><MaterialIcons name="logout" size={20} color={c.muted} /></Pressable>}
    {compact && <Button label="Tutup navigasi" tone="quiet" onPress={() => setDrawer(false)} />}
  </ScrollView>;

  return <View style={s.root}>
    {!compact && sidebar}
    {compact && <Modal visible={drawer} transparent animationType="fade" onRequestClose={() => setDrawer(false)}><View style={s.drawerBackdrop}>{sidebar}<Pressable accessibilityRole="button" accessibilityLabel="Tutup navigasi" style={{ flex: 1 }} onPress={() => setDrawer(false)} /></View></Modal>}
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={[s.header, phone && { paddingHorizontal: 10, gap: 6 }]}>
        {compact ? <Pressable accessibilityRole="button" accessibilityLabel="Buka navigasi" onPress={() => setDrawer(true)} style={s.iconButton}><MaterialIcons name="menu" size={22} color={c.text} /></Pressable>
          : <Pressable accessibilityRole="button" accessibilityLabel={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'} onPress={() => setCollapsed(value => !value)} style={s.iconButton}><MaterialIcons name={collapsed ? 'last-page' : 'first-page'} size={20} color={c.muted} /></Pressable>}
        <View style={{ flex: 1 }}><Text style={s.context}>Sanctuary / {current?.label || 'Student Detail'}</Text>{!narrow && <Text style={s.contextSub}>Mental Health Early Warning & Counseling Operations Platform</Text>}</View>
        {ADMIN_PREVIEW && <View style={s.preview}><MaterialIcons name="science" size={14} color={c.warning} /><Text style={s.previewText}>{phone ? 'PREVIEW' : 'LOCAL PREVIEW — SYNTHETIC DATA'}</Text></View>}
        {!narrow && <View style={s.confidential}><MaterialIcons name="lock-outline" size={15} color={c.primary} /><Text style={s.confidentialText}>Confidential</Text></View>}
        {!narrow && <Avatar name={profile.nama} />}
      </View>
      <Slot />
    </View>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#f3f7f6' },
  sidebar: { flexGrow: 1, backgroundColor: c.surface, borderRightWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 18 },
  brandIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { color: c.primary, fontSize: 20, fontWeight: '800', letterSpacing: -0.7 },
  brandSub: { color: c.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1.4 },
  sectionLabel: { color: '#8a9aa1', fontSize: 9, fontWeight: '800', letterSpacing: 1.4, paddingHorizontal: 12 },
  navItem: { minHeight: 43, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  navActive: { backgroundColor: c.primarySoft },
  navText: { color: c.muted, fontSize: 12, fontWeight: '500', flex: 1 },
  navTextActive: { color: c.primary, fontWeight: '700' },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.primary },
  profileCard: { borderTopWidth: 1, borderColor: c.border, paddingTop: 16, gap: 11 },
  iconButton: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
  drawerBackdrop: { flex: 1, flexDirection: 'row', backgroundColor: c.overlay },
  header: { minHeight: 72, paddingHorizontal: 22, paddingVertical: 11, flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.97)', borderBottomWidth: 1, borderColor: c.border },
  context: { color: c.text, fontSize: 12, fontWeight: '700' },
  contextSub: { color: c.muted, fontSize: 9, marginTop: 2 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.warningSoft, borderColor: '#e6c57f', borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  previewText: { color: c.warning, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  confidential: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: c.primarySoft },
  confidentialText: { color: c.primary, fontSize: 10, fontWeight: '600' },
});
