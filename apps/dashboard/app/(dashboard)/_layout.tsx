import { Slot, router, usePathname } from 'expo-router';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { getStoredUserSync, apiGetAttention } from '@prototype/api-client';
import { T, F, Neu, FACE } from '../../constants/sajiwa';

type Item = { icon: keyof typeof MaterialIcons.glyphMap; label: string; href?: string; match?: string; adminOnly?: boolean; badge?: 'crisis' };

const MENU: Item[] = [
  { icon: 'space-dashboard', label: 'Ringkasan', href: '/(dashboard)', match: '/' },
  { icon: 'event-note', label: 'Daftar Konsultasi', href: '/(dashboard)/schedule', match: 'schedule' },
  { icon: 'event-available', label: 'Atur Ketersediaan', href: '/(dashboard)/availability', match: 'availability' },
  { icon: 'notifications-active', label: 'Peringatan Krisis', href: '/(dashboard)/crisis', match: 'crisis', badge: 'crisis' },
  { icon: 'insights', label: 'Insight Mahasiswa', href: '/(dashboard)/insights', match: 'insights' },
  { icon: 'assessment', label: 'Laporan', href: '/(dashboard)/reports', match: 'reports', adminOnly: true },
  { icon: 'call', label: 'Hotline', href: '/(dashboard)/hotlines', match: 'hotlines', adminOnly: true },
];

const NavItem = ({ item, active, count = 0 }: { item: Item; active: boolean; count?: number }) => {
  const disabled = !item.href;
  return (
    <Pressable
      onPress={() => item.href && !active && router.push(item.href as any)}
      disabled={disabled}
      accessibilityRole="link"
      accessibilityState={{ selected: active, disabled }}
      style={(state: any) => [
        styles.navItem,
        active && { boxShadow: Neu.inset },
        !active && !disabled && state.hovered && { boxShadow: Neu.raisedSm },
      ]}
    >
      <MaterialIcons name={item.icon} size={20} color={active ? T.primary : disabled ? T.muted : T.sub} />
      <Text style={[styles.navText, active && styles.navTextActive, disabled && { color: T.muted }]}>{item.label}</Text>
      {disabled && <Text style={styles.soon}>Segera</Text>}
      {count > 0 && (
        <View style={styles.badge} accessibilityLabel={`${count} belum ditinjau`}>
          <Text style={styles.badgeTxt}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
};

export default function DashboardLayout() {
  const pathname = usePathname();
  const user = getStoredUserSync<{ nama?: string; role?: string }>();
  const isActive = (m?: string) =>
    m === '/' ? pathname === '/' || pathname === '/(dashboard)' : !!m && pathname.includes(m);
  const [crisis, setCrisis] = useState(0);
  // Unread crisis signals from the student app, refreshed on every page change
  useEffect(() => {
    apiGetAttention({ unreadOnly: true, pageSize: 1 }).then((r) => setCrisis(r.total)).catch(() => {});
  }, [pathname]);
  const isStaffAdmin = user?.role === 'admin' || user?.role === 'pemangku_jabatan';
  const initials = (user?.nama || 'S').split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        {/* Brand: same companion as the student app */}
        <View style={styles.brand}>
          <View style={styles.brandWell}>
            <Image source={FACE.senang} style={styles.brandFace} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.brandName}>Sajiwa</Text>
            <Text style={styles.brandSub}>Portal Konselor & Admin</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
          {MENU.filter((it) => !it.adminOnly || isStaffAdmin).map((it) => (
            <NavItem key={it.label} item={it} active={isActive(it.match)} count={it.badge === 'crisis' ? crisis : 0} />
          ))}
        </ScrollView>

        {/* Who is signed in */}
        {user && (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{user.nama}</Text>
              <Text style={styles.userRole}>{user.role === 'pemangku_jabatan' ? 'Pemangku jabatan' : user.role}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.main}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: T.bg },
  sidebar: {
    width: 264, height: '100%', backgroundColor: T.bg, paddingVertical: 28, paddingHorizontal: 18, zIndex: 50,
    boxShadow: '8px 0px 24px rgba(122,134,168,0.18)',
  },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30, paddingHorizontal: 4 },
  brandWell: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: T.bg, boxShadow: Neu.inset,
    alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden',
  },
  brandFace: { width: 58, height: 58, marginBottom: -4 },
  brandName: { fontSize: 20, fontFamily: F.extrabold, color: T.primary, letterSpacing: -0.5 },
  brandSub: { fontSize: 12, fontFamily: F.medium, color: T.sub, marginTop: 1 },

  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16 },
  navText: { flex: 1, fontSize: 14, fontFamily: F.medium, color: T.sub },
  navTextActive: { color: T.primary, fontFamily: F.bold },
  badge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: T.coral, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontSize: 11, fontFamily: F.extrabold, color: '#fff' },
  soon: { fontSize: 10, fontFamily: F.bold, color: T.muted, letterSpacing: 0.3 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 20,
    backgroundColor: T.bg, boxShadow: Neu.raisedSm,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: T.onPrimary, fontSize: 13, fontFamily: F.extrabold },
  userName: { fontSize: 13, fontFamily: F.bold, color: T.ink },
  userRole: { fontSize: 12, fontFamily: F.medium, color: T.sub, textTransform: 'capitalize' },

  main: { flex: 1, position: 'relative', backgroundColor: T.bg },
});
