import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, Slot, usePathname, type Href } from 'expo-router';
import { adminTheme as c } from '@/constants/adminTheme';
import { Avatar, Button, EmptyState, FilterControl, ui } from '@/components/ui';
import { previewNotifications, type NotificationCategory } from '@/services/adminProductData';
import { useAdminProfile, useLogout } from './AdminAuth';
import { useAdminExperience } from './AdminExperience';
import { BackendPending, SegmentedControl } from './ProductPrimitives';

type Icon = React.ComponentProps<typeof MaterialIcons>['name'];
const sections: { key: string; items: { key: string; path: string; icon: Icon }[] }[] = [
  { key: 'overview', items: [{ key: 'overview', path: '/overview', icon: 'space-dashboard' }] },
  { key: 'monitoring', items: [{ key: 'assessments', path: '/assessments', icon: 'assignment' }, { key: 'attention', path: '/attention', icon: 'health-and-safety' }, { key: 'reports', path: '/reports', icon: 'insights' }] },
  { key: 'counseling', items: [{ key: 'schedule', path: '/schedule', icon: 'calendar-month' }, { key: 'counselors', path: '/counselors', icon: 'supervisor-account' }] },
  { key: 'management', items: [{ key: 'students', path: '/students', icon: 'school' }, { key: 'hotlines', path: '/hotlines', icon: 'support-agent' }] },
  { key: 'system', items: [{ key: 'settings', path: '/settings', icon: 'settings' }] },
];
const categoryIcon: Record<NotificationCategory, Icon> = { assessment: 'assignment-late', safety: 'health-and-safety', counseling: 'forum', schedule: 'event-busy', system: 'dns' };

export default function AdminShellV2() {
  const profile = useAdminProfile();
  const logout = useLogout();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { language, setLanguage, themeMode, setThemeMode, t } = useAdminExperience();
  const compact = width < 1040, narrow = width < 720, phone = width < 500;
  const [drawer, setDrawer] = useState(false), [collapsed, setCollapsed] = useState(false), [notificationsOpen, setNotificationsOpen] = useState(false), [profileOpen, setProfileOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [read, setRead] = useState<string[]>([]);
  useEffect(() => { if (false && typeof window !== 'undefined') setRead(JSON.parse(window.localStorage.getItem('sanctuary_preview_notification_read') || '[]')); }, []);
  const saveRead = (ids: string[]) => { setRead(ids); if (false && typeof window !== 'undefined') window.localStorage.setItem('sanctuary_preview_notification_read', JSON.stringify(ids)); };
  const visibleNotifications = useMemo(() => previewNotifications.filter(item => category === 'all' || item.category === category), [category]);
  const unreadCount = false ? previewNotifications.filter(item => !read.includes(item.id)).length : 0;
  const current = sections.flatMap(section => section.items).find(item => pathname.startsWith(item.path));
  const sidebarWidth = collapsed && !compact ? 82 : 264;

  const sidebar = <ScrollView style={{ width: sidebarWidth, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={[s.sidebar, { width: sidebarWidth }]}>
    <View style={[ui.row, { paddingHorizontal: collapsed ? 4 : 3, paddingVertical: 8, flexWrap: 'nowrap' }]}>
      <View style={s.brandIcon}><MaterialIcons name="spa" size={24} color="#fff" /></View>
      {!collapsed && <View style={{ flex: 1 }}><Text style={s.brand}>Sanctuary</Text><Text style={s.brandSub}>ADMIN OPERATIONS</Text></View>}
    </View>
    <View style={{ gap: 18, marginTop: 24 }}>{sections.map(section => <View key={section.key} style={{ gap: 5 }}>
      {!collapsed && <Text style={s.sectionLabel}>{t('group.' + section.key)}</Text>}
      {section.items.map(item => {
        const active = pathname.startsWith(item.path);
        return <Pressable key={item.path} accessibilityRole="link" accessibilityLabel={t('nav.' + item.key)} accessibilityState={{ selected: active }} onPress={() => { setDrawer(false); router.push(item.path as Href); }} style={({ pressed }) => [s.navItem, collapsed && { justifyContent: 'center' }, active && s.navActive, pressed && s.pressed]}>
          <MaterialIcons name={item.icon} size={20} color={active ? c.primary : c.muted} />
          {!collapsed && <Text style={[s.navText, active && s.navTextActive]}>{t('nav.' + item.key)}</Text>}
          {!collapsed && active && <View style={s.activeMark} />}
        </Pressable>;
      })}
    </View>)}</View>
    <View style={{ flex: 1, minHeight: 28 }} />
    {!collapsed && <View style={s.sidebarFoot}><View style={[ui.row, { flexWrap: 'nowrap' }]}><Avatar name={profile.nama} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={[ui.text, { fontWeight: '800' }]}>{profile.nama}</Text><Text style={[ui.muted, { fontSize: 10 }]}>Administrator</Text></View></View><Button label={language === 'id' ? 'Keluar' : 'Sign out'} icon="logout" tone="quiet" onPress={() => { void logout(); }} /></View>}
  </ScrollView>;

  return <View style={s.root}>
    {!compact && sidebar}
    {compact && <Modal visible={drawer} transparent animationType="fade" onRequestClose={() => setDrawer(false)}><View style={s.drawerBackdrop}>{sidebar}<Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={{ flex: 1 }} onPress={() => setDrawer(false)} /></View></Modal>}
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={[s.header, phone && { paddingHorizontal: 8, gap: 4 }]}>
        {compact ? <IconButton label="Open navigation" icon="menu" onPress={() => setDrawer(true)} /> : <IconButton label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} icon={collapsed ? 'last-page' : 'first-page'} onPress={() => setCollapsed(value => !value)} />}
        <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={s.breadcrumb}>Sanctuary / {current ? t('nav.' + current.key) : t('nav.students')}</Text>{!narrow && <Text style={s.contextSub}>Mental Health Early Warning & Counseling Operations</Text>}</View>
        {false && !phone && <View style={s.preview}><MaterialIcons name="science" size={14} color={c.warning} /><Text style={s.previewText}>{t('preview.label')}</Text></View>}
        {!phone && <SegmentedControl value={language} onChange={value => setLanguage(value as 'id' | 'en')} options={[{ value: 'id', label: 'ID' }, { value: 'en', label: 'EN' }]} />}
        <IconButton label={language === 'id' ? 'Ubah tema' : 'Change theme'} icon={themeMode === 'dark' ? 'dark-mode' : themeMode === 'light' ? 'light-mode' : 'brightness-auto'} onPress={() => setThemeMode(themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system')} />
        <View><IconButton label={t('shell.notifications')} icon="notifications-none" onPress={() => setNotificationsOpen(true)} />{unreadCount > 0 && <View style={s.unreadBadge}><Text style={s.unreadText}>{unreadCount}</Text></View>}</View>
        {!narrow && <Pressable accessibilityRole="button" accessibilityLabel={t('shell.profile')} onPress={() => setProfileOpen(true)}><Avatar name={profile.nama} /></Pressable>}
      </View>
      {false && phone && <View style={s.mobilePreview}><Text style={s.previewText}>{t('preview.label')}</Text></View>}
      <Slot />
    </View>

    <Modal visible={notificationsOpen} transparent animationType="fade" onRequestClose={() => setNotificationsOpen(false)}>
      <Pressable style={s.modalBackdrop} onPress={() => setNotificationsOpen(false)}>
        <Pressable style={[s.panel, phone && { width: '94%', maxHeight: '88%' }]} onPress={() => undefined}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}><View><Text style={ui.heading}>{t('shell.notifications')}</Text><Text style={ui.muted}>{false ? (language === 'id' ? 'Riwayat sintetis untuk tinjauan UX' : 'Synthetic history for UX review') : t('status.backendPending')}</Text></View><IconButton label={t('common.close')} icon="close" onPress={() => setNotificationsOpen(false)} /></View>
          {false ? <>
            <FilterControl label={language === 'id' ? 'Kategori' : 'Category'} value={category} onChange={setCategory} options={[{ value: 'all', label: t('common.all') }, { value: 'assessment', label: 'Assessment' }, { value: 'safety', label: 'Safety' }, { value: 'counseling', label: 'Counseling' }, { value: 'schedule', label: 'Schedule' }, { value: 'system', label: 'System' }]} />
            <View style={[ui.row, { justifyContent: 'flex-end' }]}><Button label={language === 'id' ? 'Tandai semua dibaca' : 'Mark all read'} tone="quiet" onPress={() => saveRead(previewNotifications.map(item => item.id))} /></View>
            <ScrollView contentContainerStyle={{ gap: 8 }}>{visibleNotifications.map(item => {
              const isRead = read.includes(item.id);
              return <Pressable key={item.id} onPress={() => { saveRead([...new Set([...read, item.id])]); setNotificationsOpen(false); router.push(item.route as Href); }} style={[s.notification, !isRead && s.notificationUnread]}>
                <View style={[s.notificationIcon, { backgroundColor: item.category === 'safety' ? c.dangerSoft : c.primarySoft }]}><MaterialIcons name={categoryIcon[item.category]} size={19} color={item.category === 'safety' ? c.danger : c.primary} /></View>
                <View style={{ flex: 1, gap: 3 }}><Text style={[ui.text, { fontWeight: isRead ? '600' : '800' }]}>{item.title}</Text><Text style={ui.muted}>{item.detail}</Text><Text style={[ui.muted, { fontSize: 10 }]}>{item.time}</Text></View>{!isRead && <View style={s.dot} />}
              </Pressable>;
            })}</ScrollView>
          </> : <><BackendPending detail={language === 'id' ? 'API notifikasi persisten belum tersedia. Gangguan koneksi tetap ditampilkan sebagai status sistem sementara.' : 'Persistent notification APIs are unavailable. Connectivity failures remain transient system status.'} /><EmptyState message={language === 'id' ? 'Belum ada riwayat notifikasi persisten.' : 'No persistent notification history is available.'} /></>}
        </Pressable>
      </Pressable>
    </Modal>

    <Modal visible={profileOpen} transparent animationType="fade" onRequestClose={() => setProfileOpen(false)}><Pressable style={s.modalBackdrop} onPress={() => setProfileOpen(false)}><Pressable style={[s.panel, { maxWidth: 380 }]} onPress={() => undefined}><View style={[ui.row, { flexWrap: 'nowrap' }]}><Avatar name={profile.nama} /><View style={{ flex: 1 }}><Text style={ui.heading}>{profile.nama}</Text><Text style={ui.muted}>{profile.email}</Text></View></View><View style={s.confidential}><MaterialIcons name="lock-outline" size={16} color={c.primary} /><Text style={s.confidentialText}>{t('shell.confidential')}</Text></View><Button label={t('nav.settings')} tone="quiet" onPress={() => { setProfileOpen(false); router.push('/settings' as Href); }} /></Pressable></Pressable></Modal>
  </View>;
}

function IconButton({ label, icon, onPress }: { label: string; icon: Icon; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.iconButton, pressed && s.pressed]}><MaterialIcons name={icon} size={21} color={c.text} /></Pressable>;
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: c.background },
  sidebar: { flexGrow: 1, backgroundColor: c.surface, borderRightWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 18 },
  brandIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { color: c.primary, fontSize: 21, fontWeight: '900', letterSpacing: -0.8 }, brandSub: { color: c.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  sectionLabel: { color: c.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, paddingHorizontal: 12 },
  navItem: { minHeight: 44, paddingHorizontal: 12, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 11 }, navActive: { backgroundColor: c.primarySoft },
  navText: { color: c.muted, fontSize: 12, fontWeight: '600', flex: 1 }, navTextActive: { color: c.primary, fontWeight: '800' }, activeMark: { width: 3, height: 20, borderRadius: 2, backgroundColor: c.primary },
  pressed: { opacity: 0.7 }, sidebarFoot: { borderTopWidth: 1, borderColor: c.border, paddingTop: 16, gap: 11 },
  iconButton: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceMuted, borderWidth: 1, borderColor: c.border },
  drawerBackdrop: { flex: 1, flexDirection: 'row', backgroundColor: c.overlay },
  header: { minHeight: 72, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', gap: 9, alignItems: 'center', backgroundColor: c.surface, borderBottomWidth: 1, borderColor: c.border },
  breadcrumb: { color: c.text, fontSize: 12, fontWeight: '800' }, contextSub: { color: c.muted, fontSize: 9, marginTop: 3 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.warningSoft, borderColor: c.warning, borderWidth: 1, borderRadius: 18, paddingHorizontal: 9, paddingVertical: 6 }, previewText: { color: c.warning, fontSize: 9, fontWeight: '900', letterSpacing: 0.35 },
  mobilePreview: { backgroundColor: c.warningSoft, borderBottomWidth: 1, borderColor: c.warning, padding: 5, alignItems: 'center' },
  unreadBadge: { position: 'absolute', right: -2, top: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }, unreadText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: c.overlay, alignItems: 'flex-end', justifyContent: 'flex-start', padding: 16 },
  panel: { width: 440, maxWidth: '100%', maxHeight: '92%', backgroundColor: c.surfaceElevated, borderRadius: 18, borderWidth: 1, borderColor: c.borderStrong, padding: 18, gap: 15 },
  notification: { flexDirection: 'row', gap: 11, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceMuted, alignItems: 'center' }, notificationUnread: { backgroundColor: c.primarySoft, borderColor: c.primary },
  notificationIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
  confidential: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 11, borderRadius: 10, backgroundColor: c.primarySoft }, confidentialText: { color: c.primary, fontSize: 11, fontWeight: '700' },
});
