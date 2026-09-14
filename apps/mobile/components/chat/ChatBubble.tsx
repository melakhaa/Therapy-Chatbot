import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@prototype/ui-shared';
import type { Message } from '@prototype/utils';

interface Props { message: Message; index: number }

const fmt = (d: Date) =>
  d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });

export const ChatBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.sender === 'user';
  const { colors } = useTheme();

  const opacity = useRef(new Animated.Value(0)).current;
  const y       = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(y,       { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  if (!message.text) return null;

  if (isUser) {
    return (
      <Animated.View style={[s.rowUser, { opacity, transform: [{ translateY: y }] }]}>
        <View style={s.groupUser}>
          {/* Bubble first, time below */}
          <View style={[s.userBubble, { backgroundColor: colors.surfaceContainerLowest }]}>
            <Text style={[s.bubbleTxt, { color: colors.onSurface }]}>{message.text}</Text>
          </View>
          <Text style={[s.metaTime, { color: colors.outline }]}>{fmt(message.timestamp)}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[s.rowAI, { opacity, transform: [{ translateY: y }] }]}>
      {/* Small avatar */}
      <View style={[s.aiAvatar, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name="leaf-outline" size={13} color={colors.primary} />
      </View>

      <View style={s.groupAI}>
        <View style={[s.aiBubble, { backgroundColor: colors.surfaceContainerLow }]}>
          <Text style={[s.bubbleTxt, { color: colors.onSurface }]}>{message.text}</Text>
        </View>
        <Text style={[s.metaTime, { color: colors.outline }]}>{fmt(message.timestamp)}</Text>
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  /* User row — right-aligned */
  rowUser: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  groupUser: {
    alignItems: 'flex-end',
    maxWidth: '82%',
    gap: 4,
  },

  /* AI row — left-aligned with avatar */
  rowAI: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 10,
  },
  aiAvatar: {
    width: 30, height: 30,
    borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  groupAI: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 4,
  },

  /* Timestamp — below each bubble, minimal */
  metaTime: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_400Regular',
    letterSpacing: 0.2,
  },

  /* Bubbles */
  userBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#2b3437',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  aiBubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleTxt: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 23,
  },
});

export default ChatBubble;
