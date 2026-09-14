// components/chat/StressBar.tsx
// Collapsible mental wellness indicator — calm, non-clinical language

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@prototype/ui-shared';
import { useTheme } from '@prototype/ui-shared';

interface Props {
  level: number;
  onSupportPress?: () => void;
}

type Tier = 'calm' | 'gentle' | 'heavy';

const TIER_CONFIG: Record<Tier, {
  label: string;
  icon: 'checkmark-circle-outline' | 'partly-sunny-outline' | 'rainy-outline';
  colorKey: 'stressLow' | 'stressMid' | 'stressHigh';
  bgKey: 'stressLowBg' | 'stressMidBg' | 'stressHighBg';
  message: string;
  suggestion: string;
  actionLabel: string;
  actionIcon: 'book-outline' | 'leaf-outline' | 'heart-outline';
}> = {
  calm: {
    label: 'Kondisi Baik',
    icon: 'checkmark-circle-outline',
    colorKey: 'stressLow',
    bgKey: 'stressLowBg',
    message: 'Kamu terlihat cukup tenang hari ini.',
    suggestion: 'Lanjutkan cerita, atau coba jurnal singkat.',
    actionLabel: 'Jurnal Hari Ini',
    actionIcon: 'book-outline',
  },
  gentle: {
    label: 'Butuh Perhatian',
    icon: 'partly-sunny-outline',
    colorKey: 'stressMid',
    bgKey: 'stressMidBg',
    message: 'Hari ini agak berat. Itu wajar.',
    suggestion: 'Mau coba latihan napas 1 menit?',
    actionLabel: 'Latihan Napas',
    actionIcon: 'leaf-outline',
  },
  heavy: {
    label: 'Butuh Dukungan',
    icon: 'rainy-outline',
    colorKey: 'stressHigh',
    bgKey: 'stressHighBg',
    message: 'Kamu tidak sendirian. Ada yang bisa bantu.',
    suggestion: 'Hubungi konselor atau terus cerita di sini.',
    actionLabel: 'Hubungi Dukungan',
    actionIcon: 'heart-outline',
  },
};

function getTier(level: number): Tier {
  if (level <= 3) return 'calm';
  if (level <= 6) return 'gentle';
  return 'heavy';
}

export const StressBar: React.FC<Props> = ({ level, onSupportPress }) => {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(10, level));
  const tier = getTier(clamped);
  const config = TIER_CONFIG[tier];

  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: expanded ? 1 : 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  if (dismissed && tier === 'calm') return null;

  const tierColor = colors[config.colorKey];
  const tierBg = colors[config.bgKey];

  return (
    <View style={[s.wrap, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant + '30' }]}>
      {/* Compact row */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        onLongPress={() => tier !== 'calm' && setDismissed(true)}
        style={s.compactRow}
        accessibilityRole="button"
        accessibilityLabel={`Kondisi mental: ${config.label}. Tekan untuk ${expanded ? 'menutup' : 'membuka'} detail.`}
      >
        <View style={[s.iconWrap, { backgroundColor: tierBg }]}>
          <Ionicons name={config.icon} size={16} color={tierColor} />
        </View>

        <View style={s.textGroup}>
          <Text style={[s.tierLabel, { color: colors.onSurface }]}>{config.label}</Text>
          <Text style={[s.tierMessage, { color: colors.onSurfaceVariant }]} numberOfLines={1}>{config.message}</Text>
        </View>

        <Animated.View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
          <Ionicons name="chevron-down" size={16} color={colors.outline} />
        </Animated.View>
      </Pressable>

      {/* Expanded content */}
      <Animated.View
        style={[
          s.expandedContent,
          {
            height: heightAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, tier !== 'calm' ? 136 : 80],
            }),
            opacity: heightAnim,
          },
        ]}
      >
        <View style={[s.divider, { backgroundColor: colors.outlineVariant + '40' }]} />
        <View style={s.expandedInner}>
          <Text style={[s.suggestion, { color: colors.onSurfaceVariant }]}>{config.suggestion}</Text>
          <View style={s.actionRow}>
            {tier !== 'calm' && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: tierColor }]}
                onPress={() => onSupportPress?.()}
                activeOpacity={0.8}
              >
                <Ionicons name={config.actionIcon} size={16} color="#fff" />
                <Text style={s.actionBtnText}>{config.actionLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.secondaryBtn, { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest }]}
              onPress={() => tier === 'calm' ? onSupportPress?.() : setExpanded(false)}
              activeOpacity={0.7}
            >
              <Ionicons name={tier === 'calm' ? config.actionIcon : 'chatbubble-outline'} size={15} color={colors.onSurface} />
              <Text style={[s.secondaryBtnText, { color: colors.onSurface }]}>
                {tier === 'calm' ? config.actionLabel : 'Lanjut Cerita'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 32, height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textGroup: { flex: 1, gap: 2 },
  tierLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  tierMessage: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  expandedContent: {
    overflow: 'hidden',
  },
  expandedInner: { gap: Spacing.sm },
  suggestion: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#fff',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
});

export default StressBar;