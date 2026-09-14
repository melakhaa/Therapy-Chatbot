import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useChat } from '../hooks/useChat';
import { ChatBubble, TypingIndicator, StressBar, QuickReply, AlertModal } from '../components/chat';
import { useTheme } from '@prototype/ui-shared';
import { Spacing, BorderRadius } from '@prototype/ui-shared';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const { colors } = useTheme();

  const params = useLocalSearchParams();
  const initialSessionId = params.sessionId as string | undefined;

  const {
    messages,
    inputText, setInputText,
    isTyping,
    stressLevel,
    showAlert, closeAlert, confirmReport,
    quickReplies, showQuickReplies,
    sendMessage,
    sendBtnScale,
    isLoadingHistory,
    setShowAlert,
    setAlertTriggered,
  } = useChat(initialSessionId);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, isTyping]);

  const canSend = inputText.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* ── Header: flows in document order, not absolute ── */}
      <View
        style={[
          s.header,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: colors.background,
            borderBottomColor: colors.outlineVariant + '25',
          },
        ]}
      >
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surfaceContainerLow }]}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/home');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color={colors.onSurface} />
        </TouchableOpacity>

        <View style={s.navCenter}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDim]}
            style={s.navAvatar}
          >
            <Ionicons name="leaf-outline" size={11} color="#fff" />
          </LinearGradient>
          <Text style={[s.navBrand, { color: colors.onSurface }]}>Sanctuary</Text>
          <View style={[s.onlineDot, { backgroundColor: colors.stressLow }]} />
        </View>

        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* ── Wellness indicator: normal flow, not absolute ── */}
      <StressBar
        level={stressLevel}
        onSupportPress={() => {
          if (stressLevel >= 7) {
            setShowAlert(true);
            setAlertTriggered(true);
          } else {
            router.push('/journal');
          }
        }}
      />

      {/* ── Message List ── */}
      {isLoadingHistory ? (
        <LoadingState color={colors.onSurfaceVariant} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item, index }) => <ChatBubble message={item} index={index} />}
          contentContainerStyle={s.msgList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />
      )}

      {/* ── Bottom: Quick Replies + Input Bar (fused, no gap) ── */}
      <View
        style={[
          s.bottomContainer,
          {
            paddingBottom: insets.bottom + Spacing.sm,
            backgroundColor: colors.background,
            borderTopColor: colors.outlineVariant + '20',
          },
        ]}
      >
        {showQuickReplies && messages.length < 16 && (
          <QuickReply
            options={quickReplies}
            onSelect={(t) => { sendMessage(t); Keyboard.dismiss(); }}
          />
        )}

        <View style={s.inputRow}>
          <View
            style={[
              s.inputPill,
              {
                backgroundColor: colors.surfaceContainerLow,
                borderColor: colors.outlineVariant + '60',
              },
            ]}
          >
            <TextInput
              style={[s.textInput, { color: colors.onSurface }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Tulis sesuatu..."
              placeholderTextColor={colors.outline}
              multiline
              maxLength={500}
            />
          </View>

          <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
            <TouchableOpacity
              onPress={() => sendMessage(inputText)}
              disabled={!canSend}
              activeOpacity={0.8}
              style={[
                s.sendBtn,
                { backgroundColor: canSend ? colors.primary : colors.surfaceContainerHigh },
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={canSend ? '#fff' : colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      <AlertModal
        visible={showAlert}
        stressLevel={Math.round(stressLevel)}
        onDismiss={closeAlert}
        onConfirmReport={confirmReport}
      />
    </KeyboardAvoidingView>
  );
}

/* ── Loading skeleton ── */
const LoadingState: React.FC<{ color: string }> = ({ color }) => (
  <View style={s.centered}>
    <Text style={[s.loadingTxt, { color }]}>Memuat riwayat...</Text>
  </View>
);

/* ── Empty state: editorial, left-aligned, generous whitespace ── */
const EmptyState: React.FC = () => {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        s.empty,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={[s.emptyAvatar, { backgroundColor: colors.primaryContainer }]}>
        <Ionicons name="leaf-outline" size={22} color={colors.primary} />
      </View>
      <Text style={[s.emptyTitle, { color: colors.onSurface }]}>
        Ruang Refleksimu
      </Text>
      <Text style={[s.emptySub, { color: colors.onSurfaceVariant }]}>
        Ceritakan apapun. Sanctuary mendengarkan dengan penuh empati, tanpa penghakiman.
      </Text>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },

  /* Header — normal document flow */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  navCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navAvatar: {
    width: 22, height: 22,
    borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  navBrand: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.2,
  },
  onlineDot: {
    width: 7, height: 7,
    borderRadius: 3.5,
  },

  /* Message list */
  msgList: {
    paddingVertical: Spacing.sm,
    flexGrow: 1,
  },

  /* Bottom container: chips + input, no gap between them */
  bottomContainer: {
    borderTopWidth: 1,
    paddingTop: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    gap: Spacing.sm,
  },
  inputPill: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : 7,
    maxHeight: 120,
  },
  textInput: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 100,
    padding: 0, margin: 0,
  },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  /* Loading */
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTxt: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    letterSpacing: 0.5,
  },

  /* Empty state — left-aligned editorial */
  empty: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  emptyAvatar: {
    width: 48, height: 48,
    borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  emptySub: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 24,
    maxWidth: '88%',
  },
});
