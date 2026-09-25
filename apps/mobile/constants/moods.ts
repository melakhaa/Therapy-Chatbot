// Journal moods. DB stores the English `key`; UI shows the Indonesian label.
// Colors are darkened so they pass 4.5:1 as text on the #FFF2F2 background.
import type { Expression } from '@prototype/utils';

export type Mood = 'Calm' | 'Anxious' | 'Focused' | 'Tired';

export const MOODS: { key: Mood; label: string; icon: any; color: string }[] = [
  { key: 'Calm',    label: 'Tenang', icon: 'leaf-outline',         color: '#3B7A56' },
  { key: 'Focused', label: 'Fokus',  icon: 'disc-outline',         color: '#2D336B' },
  { key: 'Tired',   label: 'Lelah',  icon: 'battery-half-outline', color: '#8A6710' },
  { key: 'Anxious', label: 'Cemas',  icon: 'cloud-outline',        color: '#9f403d' },
];

export const moodOf = (key?: string | null) => MOODS.find((m) => m.key === key);
export const moodColor = (key?: string | null) => moodOf(key)?.color;

// How the companion responds to a mood: its face, what it says while you write,
// and how it reflects on an entry you wrote earlier.
export const MOOD_COMPANION: Record<Mood, { face: Expression; writing: string; looking: string }> = {
  Calm: {
    face: 'senang',
    writing: 'Senang dengarnya. Apa yang bikin harimu terasa tenang?',
    looking: 'Hari itu kamu merasa tenang. Momen seperti ini layak diingat.',
  },
  Focused: {
    face: 'semangat',
    writing: 'Mantap! Apa yang sedang kamu kerjakan dengan sepenuh hati?',
    looking: 'Hari itu kamu fokus dan terarah. Ingat lagi apa yang membantumu.',
  },
  Tired: {
    face: 'mengantuk',
    writing: 'Capek itu wajar. Tulis sedikit saja juga sudah cukup.',
    looking: 'Hari itu kamu lelah. Semoga sekarang kamu sudah lebih beristirahat.',
  },
  Anxious: {
    face: 'tenang',
    writing: 'Aku di sini. Tulis pelan-pelan apa yang membuatmu cemas.',
    looking: 'Hari itu terasa berat. Terima kasih sudah jujur menuliskannya.',
  },
};
