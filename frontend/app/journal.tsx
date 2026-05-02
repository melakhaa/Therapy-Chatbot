import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { BottomNav } from '../components/ui';
import { useTheme } from '../constants/ThemeContext';
import { Spacing, BorderRadius } from '../constants/theme';

type Question = { id: number; text: string; options: string[] };

const QUESTIONS: Question[] = [
  { id: 1,  text: 'Seberapa sering kamu merasa cemas minggu ini?',        options: ['Tidak pernah', 'Beberapa hari', 'Lebih dari separuh minggu', 'Hampir setiap hari'] },
  { id: 2,  text: 'Seberapa baik kualitas tidurmu minggu ini?',           options: ['Sangat baik', 'Cukup baik', 'Kurang baik', 'Sangat buruk'] },
  { id: 3,  text: 'Apakah kamu merasa sulit untuk fokus belajar?',         options: ['Tidak sama sekali', 'Beberapa hari', 'Lebih dari separuh waktu', 'Hampir selalu'] },
  { id: 4,  text: 'Seberapa sering kamu merasa lelah tanpa alasan jelas?', options: ['Tidak pernah', 'Sesekali', 'Cukup sering', 'Hampir setiap hari'] },
  { id: 5,  text: 'Apakah kamu merasa punya dukungan sosial yang cukup?',  options: ['Sangat merasa didukung', 'Cukup terdukung', 'Kurang terdukung', 'Tidak merasa didukung'] },
  { id: 6,  text: 'Seberapa sering kamu kehilangan minat pada hal yang kamu suka?', options: ['Tidak pernah', 'Beberapa kali', 'Cukup sering', 'Hampir selalu'] },
  { id: 7,  text: 'Apakah kamu bisa mengelola stres dengan baik minggu ini?', options: ['Sangat bisa', 'Cukup bisa', 'Kurang bisa', 'Tidak bisa sama sekali'] },
  { id: 8,  text: 'Seberapa baik pola makanmu minggu ini?',                 options: ['Sangat baik', 'Cukup baik', 'Tidak teratur', 'Sangat buruk'] },
  { id: 9,  text: 'Seberapa sering kamu melakukan aktivitas fisik?',        options: ['Setiap hari', '3–4 kali seminggu', '1–2 kali seminggu', 'Hampir tidak pernah'] },
  { id: 10, text: 'Apakah kamu merasa hidupmu bermakna dan bertujuan?',     options: ['Sangat bermakna', 'Cukup bermakna', 'Kurang bermakna', 'Tidak bermakna'] },
  { id: 11, text: 'Seberapa sering kamu merasa kesepian?',                  options: ['Tidak pernah', 'Kadang-kadang', 'Sering', 'Hampir selalu'] },
  { id: 12, text: 'Secara keseluruhan, bagaimana kondisi kesehatan mentalmu minggu ini?', options: ['Sangat baik', 'Baik', 'Kurang baik', 'Butuh perhatian segera'] },
];

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers]   = useState<(number|null)[]>(new Array(QUESTIONS.length).fill(null));

  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim    = useRef(new Animated.Value(1)).current;

  const question = QUESTIONS[currentQ];
  const selected  = answers[currentQ];
  const progress  = (currentQ + 1) / QUESTIONS.length;

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 500, useNativeDriver: false }).start();
  }, [currentQ]);

  const animateSlide = (dir: 'next' | 'prev', cb: () => void) => {
    const outVal = dir === 'next' ? 0 : 2;
    const inVal  = dir === 'next' ? 2 : 0;
    Animated.timing(slideAnim, { toValue: outVal, duration: 130, useNativeDriver: true }).start(() => {
      slideAnim.setValue(inVal);
      cb();
      Animated.timing(slideAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const slideStyle = {
    opacity: slideAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
    transform: [{
      translateX: slideAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [-20, 0, 20] }),
    }],
  };

  const handleSelect = (idx: number) => {
    const a = [...answers];
    a[currentQ] = idx;
    setAnswers(a);
  };

  const handleNext = () => {
    if (currentQ < QUESTIONS.length - 1) animateSlide('next', () => setCurrentQ(q => q + 1));
    else router.push('/home');
  };

  const handleBack = () => {
    if (currentQ > 0) animateSlide('prev', () => setCurrentQ(q => q - 1));
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Decorative blob */}
      <View style={[s.blob, { backgroundColor: colors.primaryContainer + '20' }]} />

      {/* Nav bar */}
      <View style={[s.navBar, { paddingTop: insets.top + 12, borderBottomColor: colors.outlineVariant + '20' }]}>
        <Text style={[s.navBrand, { color: colors.onSurface }]}>Sanctuary</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 72 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress section */}
        <View style={s.progressSection}>
          <View style={s.progressMeta}>
            <Text style={[s.progressLabel, { color: colors.primary }]}>EVALUASI MINGGUAN</Text>
            <Text style={[s.progressCount, { color: colors.onSurfaceVariant }]}>{currentQ + 1}/{QUESTIONS.length}</Text>
          </View>
          <View style={[s.progressTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Animated.View
              style={[
                s.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </View>
        </View>

        {/* Question */}
        <Animated.View style={[s.qSection, slideStyle]}>
          <Text style={[s.qText, { color: colors.onSurface }]}>{question.text}</Text>
          <Text style={[s.qSub, { color: colors.onSurfaceVariant }]}>
            Pilih jawaban yang paling mencerminkan kondisi perasaanmu dalam 7 hari terakhir.
          </Text>
        </Animated.View>

        {/* Options */}
        <Animated.View style={[{ gap: 12 }, slideStyle]}>
          {question.options.map((opt, idx) => {
            const active = selected === idx;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSelect(idx)}
                activeOpacity={0.75}
                style={[
                  s.optionBtn,
                  {
                    backgroundColor: active ? colors.surfaceContainerLowest : colors.surfaceContainerLow,
                    borderColor: active ? colors.primary : 'transparent',
                    borderWidth: 2,
                    // shadow for selected
                    shadowColor: active ? colors.primary : 'transparent',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: active ? 0.15 : 0,
                    shadowRadius: 12,
                    elevation: active ? 4 : 0,
                  },
                ]}
              >
                {/* Custom radio */}
                <View
                  style={[
                    s.radio,
                    {
                      borderColor: active ? colors.primary : colors.outlineVariant,
                      backgroundColor: active ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {active && <View style={s.radioDot} />}
                </View>

                <Text style={[
                  s.optionText,
                  {
                    color: colors.onSurface,
                    fontFamily: active ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_500Medium',
                  }
                ]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* ── Footer Actions ── */}
      <View
        style={[
          s.footer,
          {
            paddingBottom: insets.bottom + 72, // above bottom nav
            backgroundColor: colors.background + 'F5',
            borderTopColor: colors.outlineVariant + '20',
          }
        ]}
      >
        <TouchableOpacity
          style={s.backBtn}
          onPress={handleBack}
          disabled={currentQ === 0}
          activeOpacity={0.7}
        >
          <Text style={[s.backBtnText, { color: currentQ === 0 ? colors.outlineVariant : colors.primary }]}>
            Kembali
          </Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.88} onPress={handleNext} style={s.nextBtnWrap}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDim]}
            style={s.nextBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[s.nextBtnText, { color: colors.onPrimary }]}>
              {currentQ === QUESTIONS.length - 1 ? 'Selesai' : 'Lanjutkan'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <BottomNav />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  blob: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    bottom: '15%', right: -100,
  },

  navBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 50, alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1,
  },
  navBrand: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.4 },

  scroll: { paddingHorizontal: 24, flexGrow: 1 },

  progressSection: { marginBottom: 40 },
  progressMeta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  progressLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 2 },
  progressCount: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  progressTrack: { height: 6, borderRadius: 999, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 999 },

  qSection: { marginBottom: 36 },
  qText: {
    fontSize: 26,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.4,
    lineHeight: 34,
    marginBottom: 10,
  },
  qSub: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 22,
  },

  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  optionText: { fontSize: 15, flex: 1, lineHeight: 22 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  backBtn: { paddingHorizontal: 24, paddingVertical: 14 },
  backBtnText: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
  nextBtnWrap: { borderRadius: 24, overflow: 'hidden' },
  nextBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 24 },
  nextBtnText: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
});
