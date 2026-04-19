import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { BottomNav, FadeIn } from '../components/ui';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, BorderRadius } from '../constants/theme';

const { width } = Dimensions.get('window');

const SPIRIT_MOODS = [
  {
    icon: 'water-outline',
    label: 'Calm',
    bg: '#cce5fd',     // primaryContainer
    iconColor: '#496175',
  },
  {
    icon: 'pulse-outline',
    label: 'Anxious',
    bg: '#fee2e1',
    iconColor: '#9f403d',
  },
  {
    icon: 'locate-outline',
    label: 'Focused',
    bg: '#d5dffd',     // tertiaryContainer
    iconColor: '#555f78',
  },
  {
    icon: 'moon-outline',
    label: 'Tired',
    bg: '#e3e9ec',     // surfaceContainerHigh
    iconColor: '#586064',
  },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
};

const formatDate = () =>
  new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  const calmW  = useRef(new Animated.Value(0)).current;
  const focusW = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.delay(600).start(() => {
      Animated.parallel([
        Animated.timing(calmW,  { toValue: 0.82, duration: 900, useNativeDriver: false }),
        Animated.timing(focusW, { toValue: 0.64, duration: 900, useNativeDriver: false }),
      ]).start();
    });
  }, []);

  const cardW = (width - Spacing.base * 2 - Spacing.base) / 2;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 72 }]}
      >
        {/* ── Sticky Nav – rendered outside scroll as overlay ── */}

        {/* ── Greeting ── */}
        <FadeIn delay={0}>
          <View style={s.greetRow}>
            <View style={s.greetLeft}>
              <Text style={[s.greetTitle, { color: colors.onSurface }]}>
                {getGreeting()}, Elias
              </Text>
              <Text style={[s.greetSub, { color: colors.onSurfaceVariant }]}>
                Bagaimana perasaanmu saat ini?
              </Text>
            </View>
            <View style={[s.dateBadge, { backgroundColor: colors.surfaceContainerLow }]}>
              <Text style={[s.dateText, { color: colors.primary }]}>{formatDate()}</Text>
            </View>
          </View>
        </FadeIn>

        {/* ── Spirit Card ── */}
        <FadeIn delay={80}>
          <View style={[s.card, { backgroundColor: colors.surfaceContainerLowest }]}>
            <Text style={[s.sectionEyebrow, { color: colors.outline }]}>SPIRIT</Text>
            {/* 2×2 grid */}
            <View style={s.moodGrid}>
              {SPIRIT_MOODS.map((m, i) => {
                const active = selectedMood === i;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      s.moodBtn,
                      active && { backgroundColor: colors.surfaceContainerLow },
                    ]}
                    onPress={() => setSelectedMood(i)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.moodCircle, { backgroundColor: m.bg }]}>
                      <Ionicons name={m.icon as any} size={28} color={m.iconColor} />
                    </View>
                    <Text style={[
                      s.moodLabel,
                      {
                        color: active ? colors.primary : colors.onSurface,
                        fontFamily: active ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_400Regular',
                      }
                    ]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </FadeIn>

        {/* ── Dialogue CTA Card ── */}
        <FadeIn delay={160}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/chat')} style={s.dialogWrap}>
            <LinearGradient
              colors={['#496175', '#3d5569']}
              style={s.dialogCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Background circle decoration */}
              <View style={s.dialogBlobLarge} />
              <View style={s.dialogBlobSmall} />

              {/* Text content */}
              <View style={s.dialogText}>
                <Text style={s.dialogTitle}>Butuh teman bicara?</Text>
                <Text style={s.dialogDesc}>
                  Asisten cerdas Sanctuary selalu siap mendengarkan cerita dan tantangan belajarmu.
                </Text>
                <TouchableOpacity
                  style={s.dialogBtn}
                  onPress={() => router.push('/chat')}
                  activeOpacity={0.85}
                >
                  <Text style={[s.dialogBtnText, { color: colors.primary }]}>Mulai Percakapan</Text>
                </TouchableOpacity>
              </View>

              {/* Icon circle on right */}
              <View style={s.dialogIconCircle}>
                <Ionicons name="chatbubble-outline" size={40} color="rgba(255,255,255,0.85)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </FadeIn>

        {/* ── Side-by-side: Quote + Progress ── */}
        <FadeIn delay={240}>
          <View style={s.twoCol}>
            {/* Daily Quote */}
            <View style={[s.quoteCard, { backgroundColor: colors.surfaceContainerLow, width: cardW }]}>
              {/* Decorative background icon */}
              <Ionicons
                name="chatbubble-ellipses"
                size={72}
                color={colors.primary + '14'}
                style={s.quoteBgIcon}
              />
              <Text style={[s.sectionEyebrow, { color: colors.outline }]}>KUTIPAN HARI INI</Text>
              <Text style={[s.quoteText, { color: colors.onSurface }]}>
                "Tidak apa-apa untuk beristirahat. Bunga pun butuh waktu untuk mekar kembali."
              </Text>
              <Text style={[s.quoteAuthor, { color: colors.primary }]}>— Sanctuary Journal</Text>
            </View>

            {/* Weekly Progress */}
            <View style={[s.progressCard, { backgroundColor: colors.surfaceContainerLowest, width: cardW }]}>
              <Text style={[s.sectionEyebrow, { color: colors.outline }]}>PROGRESS PEKANAN</Text>

              {[
                { label: 'Ketenangan', anim: calmW, pct: '82%' },
                { label: 'Fokus Belajar', anim: focusW, pct: '64%' },
              ].map((item, i) => (
                <View key={i} style={[s.progressItem, i > 0 && { marginTop: Spacing.base }]}>
                  <View style={s.progressMeta}>
                    <Text style={[s.progressLabel, { color: colors.onSurface }]}>{item.label}</Text>
                    <Text style={[s.progressPct, { color: colors.primary }]}>{item.pct}</Text>
                  </View>
                  <View style={[s.progressTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
                    <Animated.View
                      style={[
                        s.progressFill,
                        {
                          backgroundColor: colors.primary,
                          width: item.anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[s.reportBtn, { borderColor: colors.outlineVariant + '60' }]}
                onPress={() => router.push('/stats')}
                activeOpacity={0.75}
              >
                <Text style={[s.reportBtnText, { color: colors.onSurfaceVariant }]}>
                  Lihat Laporan Detail
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeIn>

        {/* ── Secondary Insights ── */}
        <FadeIn delay={320}>
          <Text style={[s.insightTitle, { color: colors.onSurface }]}>Untuk Kamu Hari Ini</Text>
          <View style={s.insightRow}>
            {[
              { title: 'Meditasi 5 Menit', desc: 'Temukan ketenangan di sela jadwal kuliah.', c1: '#496175', c2: '#3d5569' },
              { title: 'Tips Manajemen Stress', desc: 'Strategi menghadapi pekan ujian dengan tenang.', c1: '#555f78', c2: '#49536b' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.insightCard} activeOpacity={0.88}>
                <LinearGradient
                  colors={[item.c2, item.c1]}
                  style={s.insightGrad}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 0, y: 0 }}
                >
                  <Text style={s.insightCardTitle}>{item.title}</Text>
                  <Text style={s.insightCardDesc}>{item.desc}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </FadeIn>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Floating Nav Bar ── */}
      <View
        style={[
          s.navBar,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.background + 'E8',
            borderBottomColor: colors.outlineVariant + '20',
          }
        ]}
      >
        <View style={[s.navBarInner, { paddingBottom: 12 }]}>
          <TouchableOpacity style={[s.navAvatar, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Ionicons name="person" size={15} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={[s.navBrand, { color: colors.onSurface }]}>Sanctuary</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <BottomNav />
    </View>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  root:  { flex: 1 },
  scroll: { paddingHorizontal: Spacing.base },

  // Nav bar overlay
  navBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 50,
    borderBottomWidth: 1,
  },
  navBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  navAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  navBrand: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.4 },

  // Greeting
  greetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
    gap: 12,
  },
  greetLeft: { flex: 1 },
  greetTitle: {
    fontSize: 34,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -1,
    lineHeight: 40,
  },
  greetSub: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 4,
  },
  dateBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  dateText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.2 },

  // Card base
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#2b3437',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 20,
  },

  // Spirit 2×2 grid
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  moodBtn: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 16,
    gap: 12,
  },
  moodCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  moodLabel: { fontSize: 14, textAlign: 'center' },

  // Dialogue CTA
  dialogWrap: { marginBottom: 16 },
  dialogCard: {
    borderRadius: 24,
    padding: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    overflow: 'hidden',
    shadowColor: '#496175',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  dialogBlobLarge: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60, right: -40,
  },
  dialogBlobSmall: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -30, left: 80,
  },
  dialogText: { flex: 1, gap: 12 },
  dialogTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  dialogDesc: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  dialogBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dialogBtnText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  dialogIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  // Two-col row
  twoCol: { flexDirection: 'row', gap: 12, marginBottom: 16 },

  // Quote card
  quoteCard: {
    borderRadius: 24, padding: 24,
    overflow: 'hidden',
    shadowColor: '#2b3437',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 2,
  },
  quoteBgIcon: {
    position: 'absolute',
    top: -10, right: -10,
    transform: [{ rotate: '15deg' }],
  },
  quoteText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: 22,
    marginBottom: 12,
    zIndex: 1,
  },
  quoteAuthor: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },

  // Progress card
  progressCard: {
    borderRadius: 24, padding: 24,
    shadowColor: '#2b3437',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 2,
  },
  progressItem: {},
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  progressPct:   { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  progressTrack: { height: 5, borderRadius: 999, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 999 },
  reportBtn: {
    marginTop: 16, borderWidth: 1, borderRadius: 16,
    paddingVertical: 12, alignItems: 'center',
  },
  reportBtnText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },

  // Insight row
  insightTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.3,
    marginBottom: 12,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  insightRow: { flexDirection: 'row', gap: 12 },
  insightCard: { flex: 1, borderRadius: 24, overflow: 'hidden', height: 150 },
  insightGrad: { flex: 1, justifyContent: 'flex-end', padding: 20 },
  insightCardTitle: {
    fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff', marginBottom: 3,
  },
  insightCardDesc: {
    fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', color: 'rgba(255,255,255,0.75)',
  },
});
