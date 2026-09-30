import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';
import { analyzeStress, QUICK_REPLIES, reactToUserMessage, type Expression, type Message } from '@prototype/utils';
import {
  apiChatHistory,
  apiChatStream,
  apiReportToTeam,
  getChatSessionId,
  saveChatSessionId,
} from '@prototype/api-client';
import { useToast } from '../components/ui/Toast';

export interface UseChatReturn {
  messages: Message[];
  inputText: string;
  setInputText: (t: string) => void;
  isTyping: boolean;
  stressLevel: number;
  showAlert: boolean;
  closeAlert: () => void;
  setShowAlert: (v: boolean) => void;
  setAlertTriggered: (v: boolean) => void;
  quickReplies: string[];
  showQuickReplies: boolean;
  sendMessage: (text: string) => void;
  confirmReport: () => void;
  sendBtnScale: Animated.Value;
  /** Null until the stored id resolves; no consumer should send before it is set. */
  sessionId: string | null;
  isHighRisk: boolean;
  isLoadingHistory: boolean;
  expression: Expression;
}

// Session id lives in storage so a reload resumes the same conversation; the transcript
// itself stays encrypted in Postgres and is refetched from /chat/history.
function newSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Greeting lokal — tidak perlu hit backend
const GREETINGS = [
  'Hei, senang kamu di sini. Apa yang ingin kamu ceritakan hari ini?',
  'Halo! Aku siap mendengarkan. Bagaimana perasaanmu sekarang?',
  'Selamat datang. Ceritakan apa pun yang ada di pikiranmu.',
];
const pickGreeting = () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

export function useChat(initialSessionId?: string): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stressLevel, setStressLevel] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [quickReplies, setQuickReplies] = useState(QUICK_REPLIES.initial);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [isHighRisk, setIsHighRisk] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [expression, setExpression] = useState<Expression>('menyapa');

  const toast = useToast();
  // Null until storage resolves, so sendMessage can't fire against an unloaded id.
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const sendBtnScale = useRef(new Animated.Value(1)).current;
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Resume the stored session, or start one ────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let id = initialSessionId;
      if (!id) {
        const stored = await getChatSessionId();
        id = stored ?? newSessionId();
        if (!stored) await saveChatSessionId(id);
      }
      if (cancelled) return;
      setSessionId(id);

      try {
        const { messages: history } = await apiChatHistory(id);
        if (cancelled) return;
        let lastReaction: Expression = 'senang';
        const histMessages: Message[] = history.map((m, i) => {
          const isUser = m.role === 'user';
          if (isUser) lastReaction = reactToUserMessage(m.text, lastReaction);
          return {
            id: `hist-${i}-${m.created_at}`,
            text: m.text,
            sender: isUser ? 'user' : 'ai',
            timestamp: new Date(m.created_at),
            expression: isUser ? undefined : (m.route === 'guardrail' ? 'tenang' : lastReaction),
          };
        });
        setMessages(histMessages);
        if (histMessages.length > 0) {
          setExpression(lastReaction);
        }
      } catch {
        // Offline or expired token: start from the greeting, history is not critical.
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialSessionId]);

  // ── Add AI message ─────────────────────────────────────────────
  const addAI = useCallback((text: string, expr: Expression = 'menyapa') => {
    setMessages((prev) => [
      ...prev,
      { id: `ai-${Date.now()}`, text, sender: 'ai', timestamp: new Date(), expression: expr },
    ]);
  }, []);

  // ── Grow an AI bubble as tokens arrive ────────────────────────
  const upsertAI = useCallback((id: string, text: string, replace = false, expr: Expression = 'senang') => {
    setMessages((prev) => {
      if (!prev.some((m) => m.id === id)) {
        return [...prev, { id, text, sender: 'ai', timestamp: new Date(), expression: expr }];
      }
      return prev.map((m) =>
        m.id === id ? { ...m, text: replace ? text : m.text + text, expression: expr } : m
      );
    });
  }, []);

  // ── Greeting on mount, only when there is no history to show ───
  useEffect(() => {
    if (isLoadingHistory || messages.length > 0) return;
    const t = setTimeout(() => addAI(pickGreeting(), 'menyapa'), 600);
    return () => clearTimeout(t);
  }, [addAI, isLoadingHistory, messages.length]);

  // ── Abort stream on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // ── Re-analyze stress whenever messages change ─────────────────
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

    if (level < 7 && alertTriggered) {
      setAlertTriggered(false);
    }
  }, [messages, alertTriggered, isTyping]);

  // ── Upgrade/downgrade quick replies on stress change ──────────
  useEffect(() => {
    if (stressLevel >= 4 && messages.length > 3) {
      setQuickReplies(QUICK_REPLIES.mid);
    } else if (stressLevel < 4) {
      setQuickReplies(QUICK_REPLIES.initial);
    }
  }, [stressLevel, messages.length]);

  // ── Send message → SSE stream ─────────────────────────────────
  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !sessionId) return;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const reaction = reactToUserMessage(trimmed, expression);
      setExpression(reaction);

      const userMsg: Message = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        text: trimmed,
        sender: 'user',
        timestamp: new Date(),
      };

      const aiId = `ai-${Date.now()}`;
      const fallback = 'Maaf, aku sedang tidak bisa dihubungi. Coba lagi sebentar ya 🙏';

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsTyping(true);
      setShowQuickReplies(false);

      Animated.sequence([
        Animated.spring(sendBtnScale, { toValue: 0.82, useNativeDriver: true }),
        Animated.spring(sendBtnScale, { toValue: 1, useNativeDriver: true }),
      ]).start();

      apiChatStream(
        { message: trimmed, session_id: sessionId },
        (event) => {
          setIsTyping(false);
          if (event.is_high_risk || event.route === 'guardrail') {
            setExpression('tenang');
            setIsHighRisk(true);
            setShowAlert(true);
            setAlertTriggered(true);
          }
          if (event.token) {
            upsertAI(aiId, event.token, false, reaction);
          }
          if (event.error) {
            upsertAI(aiId, fallback, true, 'bingung');
          }
        },
        controller.signal
      )
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Chat stream error:', err);
            toast.show('Sajiwa belum bisa membalas. Periksa koneksimu lalu coba kirim lagi.', 'error');
            upsertAI(aiId, fallback, true, 'bingung');
          }
        })
        .finally(() => {
          setIsTyping(false);
          setShowQuickReplies(true);
        });
    },
    [expression, sendBtnScale, sessionId, toast, upsertAI]
  );

  // ── Report confirmed ──────────────────────────────────────────
  const confirmReport = useCallback(async () => {
    setShowAlert(false);
    setExpression('tenang');
    try {
      if (sessionId) {
        await apiReportToTeam(sessionId);
      }
      toast.show('Tim Sajiwa sudah dikabari.');
      addAI(
        'Kabarmu sudah diteruskan ke tim Sajiwa dan akan ditinjau oleh konselor. Sambil menunggu, ' +
          'kamu tetap bisa menghubungi hotline kapan saja. Kamu tidak sendirian.',
        'tenang'
      );
    } catch {
      toast.show('Kabar belum terkirim. Kalau mendesak, hubungi hotline langsung dari tombol telepon.', 'error');
    }
  }, [addAI, sessionId, toast]);

  return {
    messages,
    inputText,
    setInputText,
    isTyping,
    stressLevel,
    showAlert,
    closeAlert: () => setShowAlert(false),
    setShowAlert,
    setAlertTriggered,
    quickReplies,
    showQuickReplies,
    sendMessage,
    confirmReport,
    sendBtnScale,
    sessionId,
    isHighRisk,
    isLoadingHistory,
    expression,
  };
}
