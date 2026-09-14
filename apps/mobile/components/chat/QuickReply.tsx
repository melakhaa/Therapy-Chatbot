import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Spacing, BorderRadius } from '@prototype/ui-shared';
import { useTheme } from '@prototype/ui-shared';

interface Props { options: string[]; onSelect: (option: string) => void }

export const QuickReply: React.FC<Props> = ({ options, onSelect }) => {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[s.row, { paddingHorizontal: Spacing.md }]}
      style={s.wrap}
    >
      {options.map((opt, i) => (
        <TouchableOpacity
          key={i}
          style={[
            s.chip,
            {
              borderColor: colors.outlineVariant,
              backgroundColor: colors.surfaceContainerLowest,
            },
          ]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.7}
        >
          <Text style={[s.chipText, { color: colors.onSurface }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  wrap: { paddingBottom: 0 },
  row: { gap: Spacing.xs + 2, flexDirection: 'row', alignItems: 'center' },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    letterSpacing: 0.1,
  },
});

export default QuickReply;
