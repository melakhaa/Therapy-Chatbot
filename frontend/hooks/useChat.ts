// hooks/useChat.ts
// Encapsulates ALL chat state and side-effects.
// Screens only call the returned interface — no logic leaks out.

import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';
import { analyzeStress } from '../utils/stressDetection';
import { getAIResponse, QUICK_REPLIES } from '../utils/aiResponses';
import { sendChatMessage } from '../utils/api';
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
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stressLevel, setStressLevel] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [quickReplies, setQuickReplies] = useState(QUICK_REPLIES.initial);
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  const sendBtnScale = useRef(new Animated.Value(1)).current;

  // ── Send one AI message ──────────────────────────────────────
  const addAI = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `ai-${Date.now()}`, text, sender: 'ai', timestamp: new Date() },
    ]);
  }, []);

  // ── Greeting on mount (local, no API call needed) ────────────
  useEffect(() => {
    const t = setTimeout(() => {
      addAI(getAIResponse({ userText: '', stressLevel: 0, messageCount: 0 }));
    }, 600);
    return () => clearTimeout(t);
  }, [addAI]);

  // ── Re-analyze stress whenever messages change ───────────────
  useEffect(() => {
    const level = analyzeStress(messages);
    setStressLevel(level);

    if (level >= 7 && !alertTriggered) {
      const t = setTimeout(() => {
        setShowAlert(true);
        setAlertTriggered(true);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [messages, alertTriggered]);

  // ── Upgrade quick replies on mid-stress ─────────────────────
  useEffect(() => {
    if (stressLevel >= 4 && messages.length > 3) {
      setQuickReplies(QUICK_REPLIES.mid);
    }
  }, [stressLevel, messages.length]);

  // ── Send a user message + call backend API ──────────────────
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      const trimmed = text.trim();

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        text: trimmed,
        sender: 'user',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsTyping(true);
      setShowQuickReplies(false);

      // Call the backend API (async)
      sendChatMessage(trimmed)
        .then((apiResult) => {
          let reply: string;

          if (apiResult) {
            // ✅ Backend responded successfully
            reply = apiResult.response;

            // If backend flagged high-risk, trigger alert
            if (apiResult.is_high_risk && !alertTriggered) {
              setShowAlert(true);
              setAlertTriggered(true);
            }
          } else {
            // ⚠️ Backend unreachable — fallback to local mock response
            reply = getAIResponse({
              userText: trimmed,
              stressLevel: analyzeStress([...messages, userMsg]),
              messageCount: messages.length + 1,
            });
          }

          addAI(reply);
          setIsTyping(false);
          setShowQuickReplies(true);
        })
        .catch(() => {
          // Unexpected error — fallback to local
          const reply = getAIResponse({
            userText: trimmed,
            stressLevel: analyzeStress([...messages, userMsg]),
            messageCount: messages.length + 1,
          });
          addAI(reply);
          setIsTyping(false);
          setShowQuickReplies(true);
        });

      // Send button bounce
      Animated.sequence([
        Animated.spring(sendBtnScale, { toValue: 0.82, useNativeDriver: true }),
        Animated.spring(sendBtnScale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    },
    [addAI, sendBtnScale, messages, alertTriggered]
  );

  // ── Admin report confirmed ───────────────────────────────────
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
  };
}
