import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { BottomNav, FadeIn } from '../components/ui';
import { useTheme, useAuth } from '@prototype/ui-shared';
import { Spacing, BorderRadius } from '@prototype/ui-shared';
import { apiSaveJournal, apiGetJournals } from '@prototype/api-client';


const { width } = Dimensions.get('window');

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
  const { user } = useAuth();
  const [selectedMood, setSelectedMood] = useState<'Calm' | 'Anxious' | 'Focused' | 'Tired' | null>(null);
  const [journalText, setJournalText] = useState('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [journals, setJournals] = useState<any[]>([]);

  const fetchJournals = useCallback(async () => {
    try {
      const res = await apiGetJournals(30, 0);
      setJournals(res.journals || []);
    } catch (err) {
      console.warn('Failed to load journals for home:', err);
    }
  }, []);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  const handleSaveJournal = async () => {
    if (!journalText.trim() || !selectedMood) {
      Alert.alert('Perhatian', 'Pilih mood dan tulis jurnal terlebih dahulu.');
      return;
    }
    setIsSavingJournal(true);
    try {
      await apiSaveJournal({ content: journalText, mood: selectedMood });
      Alert.alert('Tersimpan', 'Jurnal kamu berhasil disimpan.');
      setJournalText('');
      setSelectedMood(null);
      await fetchJournals();
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Gagal menyimpan jurnal.');
    } finally {
      setIsSavingJournal(false);
    }
  };

  const weeklyData = React.useMemo(() => {
    const daysShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const today = new Date();
    const daysList = [];
    const counts: Record<string, number> = { Calm: 0, Focused: 0, Tired: 0, Anxious: 0 };
    let totalRecorded = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = i === 0;

      const dayJournals = journals.filter((j: any) => j.created_at?.startsWith(dateStr));
      let dominantMood: 'Calm' | 'Focused' | 'Tired' | 'Anxious' | null = null;
      let score = 0;

      if (dayJournals.length > 0) {
        const dayCounts: Record<string, number> = {};
        dayJournals.forEach((j: any) => {
          if (j.mood) {
            dayCounts[j.mood] = (dayCounts[j.mood] || 0) + 1;
            if (counts[j.mood] !== undefined) {
              counts[j.mood]++;
              totalRecorded++;
            }
          }
        });
        dominantMood = Object.keys(dayCounts).sort((a, b) => dayCounts[b] - dayCounts[a])[0] as any;
        if (dominantMood === 'Calm') score = 95;
        else if (dominantMood === 'Focused') score = 80;
        else if (dominantMood === 'Tired') score = 55;
        else if (dominantMood === 'Anxious') score = 35;
      }

      daysList.push({
        dayName: isToday ? 'Hari ini' : daysShort[d.getDay()],
        dateNum: d.getDate(),
        isToday,
        mood: dominantMood,
        score,
      });
    }

    let dominantTendency = 'Belum Ada Data';
    let tendencyColor = colors.primary;
    let tendencyIcon: any = 'leaf-outline';
    let tendencyInsight = 'Mulai catat perasaanmu di bagian Self-Journaling di atas untuk melihat dinamika emosimu.';

    if (totalRecorded > 0) {
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const top = sorted[0];
      if (top && top[1] > 0) {
        if (top[0] === 'Calm') {
          dominantTendency = 'Dominan Tenang';
          tendencyColor = '#4D9B6F';
          tendencyIcon = 'leaf-outline';
          tendencyInsight = 'Kondisi emosimu cenderung stabil dan damai dalam 7 hari ini. Teruskan ritme positif ini!';
        } else if (top[0] === 'Focused') {
          dominantTendency = 'Fokus & Terarah';
          tendencyColor = '#496175';
          tendencyIcon = 'disc-outline';
          tendencyInsight = 'Pikiranmu produktif dan jernih. Jangan lupa sisihkan waktu rehat di sela aktivitas.';
        } else if (top[0] === 'Tired') {
          dominantTendency = 'Kecenderungan Lelah';
          tendencyColor = '#D4A843';
          tendencyIcon = 'battery-charging-outline';
          tendencyInsight = 'Ada tanda kelelahan fisik/mental yang terkumpul. Prioritaskan tidur cukup malam ini.';
        } else if (top[0] === 'Anxious') {
          dominantTendency = 'Kecenderungan Cemas';
          tendencyColor = '#9f403d';
          tendencyIcon = 'cloud-outline';
          tendencyInsight = 'Tingkat kecemasanmu sedang meningkat. Coba latihan napas atau ceritakan ke Sanctuary AI.';
        }
      }
    }

    return {
      daysList,
      counts,
      totalRecorded,
      dominantTendency,
      tendencyColor,
      tendencyIcon,
      tendencyInsight,
    };
  }, [journals, colors]);

  const cardW = (width - Spacing.base * 2 - Spacing.base) / 2;

  const navItems = [
    { icon: 'chatbubble-outline', label: 'Chat', route: '/chat' },
    { icon: 'time-outline', label: 'Riwayat', route: '/chat-history' },
    { icon: 'stats-chart-outline', label: 'laporan mingguan', route: '/stats' },
    // { icon: 'call-outline', label: 'Hotline', route: '/hotline' },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 72 }]}
      >
        {/* ── Greeting ── */}
        <FadeIn delay={0}>
          <View style={s.greetRow}>
            <View style={s.greetLeft}>
              <Text style={[s.greetTitle, { color: colors.onSurface }]}>
                {getGreeting()}{user?.nama ? `, ${user.nama.split(' ')[0]}` : ''}
              </Text>
              <Text style={[s.greetSub, { color: colors.onSurfaceVariant }]}>
                A quiet space for your thoughts to settle.
              </Text>
            </View>
          </View>
        </FadeIn>

        {/* ── Navigation Icons ── */}
        <FadeIn delay={80}>
          <View style={s.navIconsRow}>
            {navItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[s.navIconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                onPress={() => router.push(item.route)}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={24} color={colors.primary} />
                <Text style={[s.navIconLabel, { color: colors.onSurface }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FadeIn>

        {/* ── Main CTA: Enter the Dialogue ── */}
        <FadeIn delay={160}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/chat')} style={s.dialogWrap}>
            <LinearGradient
              colors={['#496175', '#3d5569']}
              style={s.dialogCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={s.dialogBlobLarge} />
              <View style={s.dialogBlobSmall} />
              <View style={s.dialogText}>
                <Text style={s.dialogTitle}>Mulai cerita</Text>
                <Text style={s.dialogDesc}>
                  AI teman Ceritamu.
                </Text>
              </View>
              <TouchableOpacity
                style={s.dialogBtn}
                onPress={() => router.push('/chat')}
                activeOpacity={0.85}
              >
                <Text style={[s.dialogBtnText, { color: colors.primary }]}>Start Conversation →</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        </FadeIn>

        {/* ── Quotes Section 1 ── */}
        {/* <FadeIn delay={200}>
          <View style={[s.card, { backgroundColor: colors.surfaceContainerLowest }]}>
            <Text style={[s.sectionEyebrow, { color: colors.outline }]}>MINDFUL QUOTE</Text>
            <View style={s.quoteBgWrapper}>
              <Ionicons
                name="chatbubble-outline"
                size={64}
                color={colors.primary + '15'}
                style={s.quoteBgIcon}
              />
              <Text style={[s.quoteText, { color: colors.onSurface }]}>
                "The soul always knows what to do to heal itself. The challenge is to silence the mind."
              </Text>
            </View>
            <Text style={[s.quoteAuthor, { color: colors.primary }]}>— CAROLINE MYSS</Text>
          </View>
        </FadeIn> */}

        {/* ── Self-Journaling Section ── */}
        {/* ── Self-Journaling Section ── */}
        <FadeIn delay={240}>
          <View style={[s.card, { backgroundColor: colors.surfaceContainerLowest, padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 24 }}>
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => router.push('/journal')}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}
              >
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={[s.sectionEyebrow, { color: colors.outline, marginBottom: 4 }]}>SELF-JOURNALING</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: colors.onSurfaceVariant, lineHeight: 20 }}>
                    Jernihkan pikiranmu melalui tulisan hari ini.
                  </Text>
                </View>
                <MaterialIcons name="edit-note" size={28} color={colors.outline + '80'} />
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {['Calm', 'Anxious', 'Focused', 'Tired'].map(mood => (
                  <TouchableOpacity
                    key={mood}
                    onPress={() => setSelectedMood(mood as any)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                      backgroundColor: selectedMood === mood ? colors.primary : colors.surfaceContainerHigh,
                    }}
                  >
                    <Text style={{ 
                      fontSize: 12, 
                      fontFamily: 'PlusJakartaSans_600SemiBold', 
                      color: selectedMood === mood ? '#fff' : colors.onSurface 
                    }}>
                      {mood}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ position: 'relative', marginBottom: 24 }}>
                <TextInput
                  style={[
                    s.journalInput,
                    {
                      backgroundColor: colors.surfaceContainerLow,
                      color: colors.onSurface,
                    }
                  ]}
                  placeholderTextColor={colors.outlineVariant}
                  placeholder="Apa yang sedang kamu pikirkan?"
                  multiline
                  textAlignVertical="top"
                  value={journalText}
                  onChangeText={setJournalText}
                />
                <View style={{ position: 'absolute', bottom: 12, right: 16 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'PlusJakartaSans_700Bold', color: colors.outline, letterSpacing: 1, textTransform: 'uppercase' }}>
                    Auto-save aktif
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <View style={[s.journalTipIcon, { backgroundColor: colors.primary + '15' }]}>
                  <MaterialIcons name="auto-awesome" size={16} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: colors.onSurfaceVariant, flex: 1, marginLeft: 12, lineHeight: 16 }}>
                  Menulis teratur dapat menurunkan tingkat stres hingga 30%.
                </Text>
              </View>

              <TouchableOpacity
                style={[s.journalBtn, { backgroundColor: colors.primary, opacity: (journalText.trim() && selectedMood) ? 1 : 0.5, width: '100%' }]}
                onPress={handleSaveJournal}
                disabled={!journalText.trim() || !selectedMood || isSavingJournal}
              >
                {isSavingJournal ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.journalBtnText}>Simpan Jurnal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </FadeIn>

        {/* ── Quotes Section 2 ── */}
        <FadeIn delay={280}>
          <View style={[s.card, { backgroundColor: colors.surfaceContainerLowest }]}>
            <View style={s.quoteBgWrapper}>
              <Ionicons
                name="chatbubble-outline"
                size={64}
                color={colors.primary + '15'}
                style={s.quoteBgIcon}
              />
              <Text style={[s.quoteText, { color: colors.onSurface }]}>
                "Tidak ada apa-apa untuk berteriak. Bunga pun butuh waktu untuk mekar kembali."
              </Text>
            </View>
            <Text style={[s.quoteAuthor, { color: colors.primary }]}>— STEPHEN LEVINE</Text>
          </View>
        </FadeIn>

        {/* ── Dinamika & Kecenderungan Mood Section ── */}
        <FadeIn delay={320}>
          <View style={[s.card, { backgroundColor: colors.surfaceContainerLowest, padding: 20 }]}>
            {/* Header row */}
            <View style={s.moodHeaderRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[s.sectionEyebrow, { color: colors.outline, marginBottom: 2 }]}>
                  DINAMIKA & TREN EMOSI
                </Text>
                <Text style={[s.moodSectionTitle, { color: colors.onSurface }]}>
                  Kondisi 7 Hari Terakhir
                </Text>
              </View>
              <View
                style={[
                  s.moodBadge,
                  {
                    backgroundColor: weeklyData.tendencyColor + '18',
                    borderColor: weeklyData.tendencyColor + '40',
                  },
                ]}
              >
                <Ionicons name={weeklyData.tendencyIcon} size={13} color={weeklyData.tendencyColor} />
                <Text style={[s.moodBadgeText, { color: weeklyData.tendencyColor }]}>
                  {weeklyData.dominantTendency}
                </Text>
              </View>
            </View>

            {/* Insight Box */}
            <View
              style={[
                s.insightBox,
                {
                  backgroundColor: colors.surfaceContainerLow,
                  borderColor: colors.outlineVariant + '30',
                },
              ]}
            >
              <View style={[s.insightIconWrap, { backgroundColor: weeklyData.tendencyColor + '22' }]}>
                <Ionicons name={weeklyData.tendencyIcon} size={18} color={weeklyData.tendencyColor} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.insightTitle, { color: colors.onSurface }]}>
                  Kecenderungan Mood
                </Text>
                <Text style={[s.insightDesc, { color: colors.onSurfaceVariant }]}>
                  {weeklyData.tendencyInsight}
                </Text>
              </View>
            </View>

            {/* Grafik Dinamika Mood (7 Hari) */}
            <View style={s.chartSection}>
              <View style={s.chartHeaderRow}>
                <Text style={[s.chartLabel, { color: colors.onSurfaceVariant }]}>
                  Fluktuasi Harian
                </Text>
                <Text style={[s.chartSubLabel, { color: colors.outline }]}>
                  {weeklyData.totalRecorded > 0 ? `${weeklyData.totalRecorded} catatan minggu ini` : 'Belum ada data'}
                </Text>
              </View>

              <View style={s.barsContainer}>
                {weeklyData.daysList.map((item, idx) => {
                  const hasData = item.mood !== null;
                  const barColor =
                    item.mood === 'Calm'
                      ? '#4D9B6F'
                      : item.mood === 'Focused'
                      ? '#496175'
                      : item.mood === 'Tired'
                      ? '#D4A843'
                      : item.mood === 'Anxious'
                      ? '#9f403d'
                      : colors.outlineVariant + '40';
                  const barHeight = hasData ? Math.max(22, (item.score / 100) * 76) : 8;

                  return (
                    <View key={idx} style={s.barCol}>
                      {/* Mood dot on top */}
                      <View
                        style={[
                          s.barDot,
                          {
                            backgroundColor: hasData ? barColor : 'transparent',
                          },
                        ]}
                      />

                      {/* Bar Pillar */}
                      <View style={[s.barTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <View
                          style={[
                            s.barFill,
                            {
                              height: barHeight,
                              backgroundColor: barColor,
                              opacity: hasData ? 1 : 0.35,
                            },
                          ]}
                        />
                      </View>

                      {/* Day Label */}
                      <Text
                        style={[
                          s.barDayLabel,
                          {
                            color: item.isToday ? colors.primary : colors.onSurfaceVariant,
                            fontFamily: item.isToday ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_500Medium',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.dayName}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Mood breakdown chips */}
            <View style={s.breakdownRow}>
              {[
                { label: 'Tenang', key: 'Calm', color: '#4D9B6F' },
                { label: 'Fokus', key: 'Focused', color: '#496175' },
                { label: 'Lelah', key: 'Tired', color: '#D4A843' },
                { label: 'Cemas', key: 'Anxious', color: '#9f403d' },
              ].map((m) => {
                const count = weeklyData.counts[m.key] || 0;
                return (
                  <View
                    key={m.key}
                    style={[
                      s.breakdownPill,
                      {
                        backgroundColor: colors.surfaceContainerLow,
                        borderColor: colors.outlineVariant + '25',
                      },
                    ]}
                  >
                    <View style={[s.miniColorDot, { backgroundColor: m.color }]} />
                    <Text style={[s.breakdownText, { color: colors.onSurfaceVariant }]}>
                      {m.label} ({count})
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Detail Report CTA */}
            <TouchableOpacity
              style={[
                s.reportBtn,
                {
                  borderColor: colors.outlineVariant + '50',
                  backgroundColor: colors.surfaceContainerLow,
                  flexDirection: 'row',
                  justifyContent: 'center',
                },
              ]}
              onPress={() => router.push('/stats')}
              activeOpacity={0.75}
            >
              <Ionicons name="stats-chart-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[s.reportBtnText, { color: colors.primary }]}>
                Buka Analisis & Statistik Lengkap →
              </Text>
            </TouchableOpacity>
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
    fontSize: 32,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -1,
    lineHeight: 38,
  },
  greetSub: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 6,
  },
  dateBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  dateText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.2 },

  // Navigation Icons Row
  navIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 32,
  },
  navIconBtn: {
    flex: 1,
    height: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  navIconLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign: 'center',
  },

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
    marginBottom: 16,
  },

  // Dialogue CTA
  dialogWrap: { marginBottom: 24 },
  dialogCard: {
    borderRadius: 24,
    padding: 28,
    flexDirection: 'column',
    gap: 16,
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
  dialogText: { gap: 12, zIndex: 1 },
  dialogTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  dialogDesc: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  dialogBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  dialogBtnText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },

  // Quote
  quoteBgWrapper: {
    position: 'relative',
    marginBottom: 12,
    overflow: 'hidden',
  },
  quoteBgIcon: {
    position: 'absolute',
    top: -20, right: -10,
    opacity: 0.15,
  },
  quoteText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    lineHeight: 24,
    marginBottom: 0,
    zIndex: 1,
  },
  quoteAuthor: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.5,
  },

  // Inspirational text
  inspirationalText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: 22,
    marginBottom: 4,
  },

  // Mood dynamics & tendency section
  moodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  moodSectionTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.2,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  moodBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.1,
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: 2,
  },
  insightDesc: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 18,
  },
  chartSection: {
    marginBottom: 14,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  chartSubLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 115,
    paddingTop: 8,
    paddingBottom: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginBottom: 4,
  },
  barTrack: {
    width: 24,
    height: 80,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barDayLabel: {
    fontSize: 10,
    marginTop: 6,
    letterSpacing: -0.2,
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  breakdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  breakdownText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  reportBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reportBtnText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Journal Button & Input
  journalBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  journalBtnText: { color: '#fff', fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  journalInput: {
    height: 100,
    borderRadius: 16,
    padding: 16,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  journalTipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

