// Profil's notification card: is Sajiwa allowed to notify on this phone, how to keep this
// brand's battery manager from swallowing greetings, and a button to see one right now.
import React, { useCallback, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useTheme, Neu } from '@prototype/ui-shared';
import * as Notifications from '../hooks/notifications';
import { sendSampleCheckIn } from '../hooks/useCheckIn';
import { notificationTips } from '../hooks/notificationTips';
import { Button, useToast } from './ui';

// Android reports the maker (e.g. "Xiaomi"); iOS has none to report, and on web the whole object is
// missing. Read at import, so it must not throw there: the card itself only hides on web later.
const constants = Platform.constants as { Brand?: string; Manufacturer?: string } | undefined;
const brand = constants?.Brand ?? constants?.Manufacturer ?? null;

export function NotificationSettings() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const tips = notificationTips(Platform.OS, brand);

  // Rechecked on return from the system settings, where the student may have just switched it on
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    Notifications.getPermissionsAsync().then((p) => setAllowed(p.status === 'granted')).catch(() => setAllowed(null));
  }, []));
  if (Platform.OS === 'web') return null;

  const sample = async () => {
    setSending(true);
    try {
      const sent = await sendSampleCheckIn(user?.name?.split(' ')[0] ?? '');
      setAllowed(sent);
      toast.show(sent ? 'Sapaan contoh dikirim. Cek bagian atas layar HP-mu.' : 'Izinkan notifikasi Sajiwa dulu di pengaturan.', sent ? 'success' : 'error');
    } finally { setSending(false); }
  };

  return <View style={{ gap: 12 }}>
    <Text style={[s.title, { color: colors.onSurface }]} accessibilityRole="header">Notifikasi</Text>
    <View style={[s.card, { backgroundColor: colors.background, boxShadow: Neu.raisedSm }]}>
      <View style={s.status}>
        <Ionicons name={allowed ? 'notifications' : 'notifications-off-outline'} size={20} color={allowed ? colors.primary : colors.stressHigh} />
        <Text style={[s.statusText, { color: colors.onSurface }]}>
          {allowed === null ? 'Memeriksa izin…' : allowed ? 'Aktif di HP ini: sapaan jam 19.00 dan kabar konseling' : 'Notifikasi Sajiwa belum diizinkan'}
        </Text>
      </View>
      <Text style={[s.label, { color: colors.onSurfaceVariant }]}>Agar tidak terlewat di {tips.label}</Text>
      {tips.steps.map((step, i) => <View key={step} style={s.step}>
        <Text style={[s.stepNo, { color: colors.primary }]}>{i + 1}</Text>
        <Text style={[s.stepText, { color: colors.onSurfaceVariant }]}>{step}</Text>
      </View>)}
      <View style={s.actions}>
        <Button label="Coba sapaan" variant="secondary" loading={sending} onPress={sample} style={{ flex: 1 }} />
        <Button label="Buka pengaturan" variant="ghost" onPress={() => { Linking.openSettings().catch(() => {}); }} style={{ flex: 1 }} />
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  title: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.3 },
  card: { borderRadius: 24, padding: 18, gap: 10 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: 'PlusJakartaSans_700Bold' },
  label: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 4 },
  step: { flexDirection: 'row', gap: 10 },
  stepNo: { width: 14, fontSize: 13, lineHeight: 19, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: 'PlusJakartaSans_500Medium' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
});
