// Privacy consent, shown once per account before the app is used.
// Presented as an iOS-style sheet: a dimmed backdrop, rounded top corners, a grabber,
// and a spring that carries it up from the bottom edge. Themed like the rest of Sajiwa.
//
// Every claim below is checked against what the backend actually does; see the comments
// next to each point. Do not soften or extend them without re-checking the code.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, Pressable, Animated, Easing,
  useWindowDimensions, AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Neu, useAuth } from '@prototype/ui-shared';
// Direct file import: going through the chat barrel would cycle back into ui/index
import { Companion } from '../chat/Companion';
import { Button } from './Button';

const KEY = (userId: string) => `sajiwa_consent_v1:${userId}`;

type Point = { icon: keyof typeof Ionicons.glyphMap; tone: 'sage' | 'navy' | 'amber'; title: string; body: string };

const POINTS: Point[] = [
  {
    icon: 'lock-closed',
    tone: 'sage',
    // routes/chat.py encrypts message content with Fernet before it is stored
    title: 'Ceritamu disimpan terenkripsi',
    body: 'Isi percakapan dengan Sajiwa diacak sebelum disimpan, jadi tidak bisa dibaca begitu saja dari database.',
  },
  {
    icon: 'book',
    tone: 'sage',
    // db/init/01_schema.sql: policy "mahasiswa_own_journals" limits rows to the owner
    title: 'Jurnalmu hanya milikmu',
    body: 'Catatan jurnal hanya bisa dibuka lewat akunmu sendiri. Konselor dan admin tidak bisa membacanya.',
  },
  {
    icon: 'alert-circle',
    tone: 'amber',
    // routes/chat.py logs a guardrail signal; /admin/attention returns name + time only
    title: 'Tanda bahaya diteruskan, isinya tidak',
    body: 'Kalau aplikasi mendeteksi tanda krisis, konselor kampus menerima namamu dan waktunya saja, demi keselamatanmu. Isi pesanmu tidak ikut dikirim.',
  },
  {
    icon: 'clipboard',
    tone: 'navy',
    // routes/admin.py list_assessments exposes severity + identity, not per-item answers
    title: 'Hasil asesmen dilihat konselor',
    body: 'Skor dan tingkat hasil asesmenmu bisa dilihat konselor kampus agar mereka bisa menindaklanjuti.',
  },
  {
    icon: 'heart',
    tone: 'navy',
    title: 'Sajiwa bukan pengganti tenaga profesional',
    body: 'Sajiwa menemani, bukan memberi diagnosis. Dalam keadaan darurat, hubungi 112 atau IGD terdekat.',
  },
];

export const ConsentSheet: React.FC = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current; // 0 offscreen, 1 settled
  const reduceMotion = useRef(false);

  const userId = (user as { user_id?: string } | null)?.user_id;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((rm) => { reduceMotion.current = !!rm; });
  }, []);

  // Ask once per account, the first time that account opens the app
  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn || !userId) { setOpen(false); return; }
    AsyncStorage.getItem(KEY(userId))
      .then((saved) => { if (!cancelled && !saved) setOpen(true); })
      .catch(() => {}); // storage unavailable: don't block the app
    return () => { cancelled = true; };
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (!open) return;
    anim.setValue(reduceMotion.current ? 1 : 0);
    if (reduceMotion.current) return;
    // The iOS sheet feel: quick to arrive, settles without bouncing past the edge
    Animated.spring(anim, { toValue: 1, damping: 22, stiffness: 190, mass: 0.9, useNativeDriver: true }).start();
  }, [open, anim]);

  const close = useCallback((after: () => void) => {
    if (reduceMotion.current) { setOpen(false); after(); return; }
    Animated.timing(anim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true })
      .start(() => { setOpen(false); after(); });
  }, [anim]);

  const accept = () => {
    if (userId) AsyncStorage.setItem(KEY(userId), new Date().toISOString()).catch(() => {});
    close(() => {});
  };

  // Consent has to be refusable, or it is not consent
  const decline = () => close(() => { logout(); });

  if (!open) return null;

  const TONE = { sage: colors.sage, navy: colors.primary, amber: colors.amber };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={decline}>
      <Animated.View style={[s.backdrop, { opacity: anim }]} />
      <Animated.View
        style={[
          s.sheet,
          {
            backgroundColor: colors.background,
            maxHeight: height * 0.88,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }],
          },
        ]}
      >
        <View style={[s.grabber, { backgroundColor: colors.outlineVariant }]} />

        <View style={s.head}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[s.eyebrow, { color: colors.textMuted }]}>Sebelum mulai</Text>
            <Text style={[s.title, { color: colors.onSurface }]} accessibilityRole="header">
              Privasi ceritamu
            </Text>
          </View>
          <Companion expression="tenang" size={84} />
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollBody} showsVerticalScrollIndicator={false}>
          {POINTS.map((p) => (
            <View key={p.title} style={s.point}>
              <View style={[s.pointIcon, { backgroundColor: TONE[p.tone] + '1F' }]}>
                <Ionicons name={p.icon} size={18} color={TONE[p.tone]} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[s.pointTitle, { color: colors.onSurface }]}>{p.title}</Text>
                <Text style={[s.pointBody, { color: colors.onSurfaceVariant }]}>{p.body}</Text>
              </View>
            </View>
          ))}
          <Text style={[s.footnote, { color: colors.textMuted }]}>
            Kamu bisa menghapus jurnal kapan saja lewat halaman Jurnal.
          </Text>
        </ScrollView>

        <View style={[s.actions, { borderTopColor: colors.outlineVariant }]}>
          <Button label="Saya mengerti dan setuju" onPress={accept} />
          <Pressable onPress={decline} accessibilityRole="button" style={s.decline} hitSlop={8}>
            <Text style={[s.declineText, { color: colors.onSurfaceVariant }]}>Belum sekarang, keluar dulu</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,22,44,0.42)' },
  // Corners only at the top, the way a sheet meets the bottom edge on iOS
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 22, paddingTop: 10,
    boxShadow: '0px -10px 34px rgba(16,22,44,0.22)',
  },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 12, opacity: 0.9 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  eyebrow: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontSize: 26, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.8 },

  scroll: { flexGrow: 0 },
  scrollBody: { gap: 16, paddingVertical: 10 },
  point: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  pointIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pointTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
  pointBody: { fontSize: 13.5, lineHeight: 20, fontFamily: 'PlusJakartaSans_400Regular' },
  footnote: { fontSize: 12, lineHeight: 18, fontFamily: 'PlusJakartaSans_500Medium', paddingTop: 2 },

  actions: { gap: 4, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  decline: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  declineText: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' },
});

export default ConsentSheet;
