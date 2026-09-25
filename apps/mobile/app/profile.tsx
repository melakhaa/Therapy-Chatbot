import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { apiGetChatSessions, apiGetJournals } from '@prototype/api-client';

import {
  BottomNav, FadeIn, NeuView, Button, ScreenHeader,
  Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../components/ui';
import { useTheme, useAuth, Neu, Spacing } from '@prototype/ui-shared';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { logout, user } = useAuth();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [stats, setStats] = useState({ chats: 0, journals: 0 });

  useEffect(() => {
    async function loadStats() {
      try {
        const [chatRes, journalRes] = await Promise.all([apiGetChatSessions(), apiGetJournals(100, 0)]);
        setStats({
          chats: chatRes.sessions?.length || 0,
          journals: journalRes.journals?.length || 0,
        });
      } catch (err) {
        console.error('Failed to load profile stats:', err);
      }
    }
    loadStats();
  }, []);

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace('/');
  };

  const initials = (user?.nama || 'S')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('');

  const menu = [
    { icon: 'time-outline', label: 'Riwayat chat', onPress: () => router.push('/chat-history') },
    { icon: 'stats-chart-outline', label: 'Laporan mingguan', onPress: () => router.push('/stats') },
    { icon: 'calendar-outline', label: 'Jadwal konseling', onPress: () => router.push('/schedule') },
    { icon: 'call-outline', label: 'Hotline darurat', onPress: () => router.push('/hotline') },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}
      >
        <ScreenHeader title="Profil" />

        {/* ── Identity ── */}
        <FadeIn delay={0}>
          <NeuView radius={28} style={s.identity}>
            <View style={[s.avatar, { backgroundColor: colors.background, boxShadow: Neu.inset }]}>
              <Text style={[s.avatarText, { color: colors.primary }]}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.name, { color: colors.onSurface }]} numberOfLines={2}>{user?.nama || 'Pengguna'}</Text>
              <Text style={[s.meta, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                {user?.nim ? `NIM ${user.nim}` : user?.email || ''}
              </Text>
            </View>
          </NeuView>
        </FadeIn>

        {/* ── Activity ── */}
        <FadeIn delay={80}>
          <View style={s.statsRow}>
            {[
              { icon: 'chatbubbles-outline', value: stats.chats, label: 'Sesi percakapan' },
              { icon: 'book-outline', value: stats.journals, label: 'Jurnal disimpan' },
            ].map((st) => (
              <NeuView key={st.label} radius={24} style={s.statCard}>
                <Ionicons name={st.icon as any} size={24} color={colors.primary} />
                <Text style={[s.statValue, { color: colors.onSurface }]}>{st.value}</Text>
                <Text style={[s.statLabel, { color: colors.onSurfaceVariant }]}>{st.label}</Text>
              </NeuView>
            ))}
          </View>
        </FadeIn>

        {/* ── Menu ── */}
        <FadeIn delay={160}>
          <NeuView radius={24} style={s.menuCard}>
            {menu.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                accessibilityRole="button"
                style={({ pressed }) => [s.menuItem, pressed && { backgroundColor: colors.background, boxShadow: Neu.inset }]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={item.icon === 'call-outline' ? colors.stressHigh : colors.primary}
                />
                <Text style={[s.menuLabel, { color: colors.onSurface }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </NeuView>
        </FadeIn>

        <FadeIn delay={240}>
          <Button
            label="Keluar"
            variant="secondary"
            onPress={() => setShowLogoutModal(true)}
            textStyle={{ color: colors.error }}
            icon={<Ionicons name="log-out-outline" size={18} color={colors.error} />}
          />
        </FadeIn>

        <Text style={[s.version, { color: colors.textMuted }]}>Sajiwa v1.0.0 Beta</Text>
      </ScrollView>

      <BottomNav />

      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogHeader>
          <DialogTitle>Keluar dari akun?</DialogTitle>
          <DialogDescription>Kamu perlu masuk lagi untuk membuka Sajiwa.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button label="Batal" variant="ghost" onPress={() => setShowLogoutModal(false)} style={{ flex: 1 }} />
          <Button label="Ya, keluar" variant="danger" onPress={confirmLogout} style={{ flex: 1 }} />
        </DialogFooter>
      </Dialog>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  name: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.4 },
  meta: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 16 },
  statCard: { flex: 1, padding: 20, gap: 6 },
  statValue: { fontSize: 30, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 8 },
  statLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' },

  menuCard: { padding: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold' },

  version: { textAlign: 'center', fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
});
