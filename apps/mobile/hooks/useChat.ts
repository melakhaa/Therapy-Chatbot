// hooks/useChat.ts
// Encapsulates ALL chat state and side-effects.
// Screens only call the returned interface — no logic leaks out.
// v2: hits backend /chat endpoint instead of local AI responses.

import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';
import { analyzeStress, QUICK_REPLIES } from '@prototype/utils';
import { apiChatHistory, apiChatStream, getChatSessionId, saveChatSessionId } from '@prototype/api-client';
import type { Message } from '../components/chat/ChatBubble';

export interface UseChatReturn {
  messages: Message[];
  inputText: string;
  setInputText: (t: string) => void;
  isTyping: boolean;
  stressLevel: number;
  showAlert: boolean;
  closeAlert: () => void;
  quickReplies: string[];
  showQuickReplies: boolean;
  sendMessage: (text: string) => void;
  confirmReport: () => void;
  sendBtnScale: Animated.Value;
  /** Null until the stored id resolves; no consumer should send before it is set. */
  sessionId: string | null;
  isHighRisk: boolean;
  isLoadingHistory: boolean;
}

// Session id lives in storage so a reload resumes the same conversation; the transcript
// itself stays encrypted in Postgres and is refetched from /chat/history.
function newSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Greeting lokal — tidak perlu hit backend
const GREETINGS = [
  'Hei, senang kamu di sini 💙 Apa yang ingin kamu ceritakan hari ini?',
  'Halo! Aku siap mendengarkan. Bagaimana perasaanmu sekarang?',
  'Selamat datang ☀️ Ceritakan apapun yang ada di pikiranmu.',
];
const pickGreeting = () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

export function useChat(): UseChatReturn {
  const [messages, setMessages]         = useState<Message[]>([]);
  const [inputText, setInputText]       = useState('');
  const [isTyping, setIsTyping]         = useState(false);
  const [stressLevel, setStressLevel]   = useState(0);
  const [showAlert, setShowAlert]       = useState(false);
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [quickReplies, setQuickReplies] = useState(QUICK_REPLIES.initial);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [isHighRisk, setIsHighRisk]     = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Null until storage resolves, so sendMessage can't fire against an unloaded id.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sendBtnScale = useRef(new Animated.Value(1)).current;

  // ── Resume the stored session, or start one ────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await getChatSessionId();
      if (cancelled) return;
      const id = stored ?? newSessionId();
      if (!stored) await saveChatSessionId(id);
      setSessionId(id);

      if (!stored) {
        setIsLoadingHistory(false);
        return;
      }

      try {
        const { messages: history } = await apiChatHistory(id);
        if (cancelled) return;
        setMessages(
          history.map((m, i) => ({
            id: `hist-${i}-${m.created_at}`,
            text: m.text,
            sender: m.role === 'user' ? 'user' : 'ai',
            timestamp: new Date(m.created_at),
          }))
        );
      } catch {
        // Offline or expired token: start from the greeting, history is not critical.
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Add AI message ─────────────────────────────────────────────
  const addAI = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `ai-${Date.now()}`, text, sender: 'ai', timestamp: new Date() },
    ]);
  }, []);

  // ── Grow an AI bubble as tokens arrive ────────────────────────
  // `replace` swaps the text (stream failed after partial output) instead of appending.
  const upsertAI = useCallback((id: string, text: string, replace = false) => {
    setMessages((prev) => {
      if (!prev.some((m) => m.id === id)) {
        return [...prev, { id, text, sender: 'ai', timestamp: new Date() }];
      }
      return prev.map((m) => (m.id === id ? { ...m, text: replace ? text : m.text + text } : m));
    });
  }, []);

  // ── Greeting on mount, only when there is no history to show ───
  useEffect(() => {
    if (isLoadingHistory || messages.length > 0) return;
    const t = setTimeout(() => addAI(pickGreeting()), 600);
    return () => clearTimeout(t);
  }, [addAI, isLoadingHistory, messages.length]);

  // ── Re-analyze stress whenever messages change ─────────────────
  // Skipped while a reply streams in: every token would otherwise re-run the analysis.
  useEffect(() => {
    if (isTyping) return;

    const level = analyzeStress(messages);
    setStressLevel(level);

    if (level >= 7 && !alertTriggered) {
      const t = setTimeout(() => {
        setShowAlert(true);
        setAlertTriggered(true);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [messages, alertTriggered, isTyping]);

  // ── Upgrade quick replies on mid-stress ───────────────────────
  useEffect(() => {
    if (stressLevel >= 4 && messages.length > 3) {
      setQuickReplies(QUICK_REPLIES.mid);
    }
  }, [stressLevel, messages.length]);

  // ── Send message → backend ────────────────────────────────────
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !sessionId) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        text: text.trim(),
        sender: 'user',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsTyping(true);
      setShowQuickReplies(false);

      // Send button bounce
      Animated.sequence([
        Animated.spring(sendBtnScale, { toValue: 0.82, useNativeDriver: true }),
        Animated.spring(sendBtnScale, { toValue: 1, useNativeDriver: true }),
      ]).start();

      // Stream the reply: the bubble grows as tokens arrive, then the server persists the turn.
      const aiId = `ai-${Date.now()}`;
      const fallback = 'Maaf, aku sedang tidak bisa dihubungi. Coba lagi sebentar ya 🙏';

      apiChatStream({ message: text.trim(), session_id: sessionId }, (event) => {
        if (event.is_high_risk) {
          setIsHighRisk(true);
          setShowAlert(true);
          setAlertTriggered(true);
        }
        if (event.token) upsertAI(aiId, event.token);
        if (event.error) upsertAI(aiId, fallback, true);
      })
        .catch(() => upsertAI(aiId, fallback, true))
        .finally(() => {
          setIsTyping(false);
          setShowQuickReplies(true);
        });
    },
    [addAI, sendBtnScale, sessionId, upsertAI]
  );

  // ── Report confirmed ──────────────────────────────────────────
  const confirmReport = useCallback(() => {
    setShowAlert(false);
    addAI(
      '🔔 Informasimu telah dikirim ke tim Sanctuary. Seseorang akan menghubungimu. Kamu tidak sendirian 💙'
    );
  }, [addAI]);

  return {
    messages,
    inputText,
    setInputText,
    isTyping,
    stressLevel,
    showAlert,
    closeAlert: () => setShowAlert(false),
    quickReplies,
    showQuickReplies,
    sendMessage,
    confirmReport,
    sendBtnScale,
    sessionId,
    isHighRisk,
    isLoadingHistory,
  };
}


