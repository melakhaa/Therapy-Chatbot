// Daily check-in: an evening notification in which Sajiwa asks how the student is doing.
// Its buttons answer right from the notification and open the chat with that answer in the
// composer, so the student only taps send (nothing is sent on their behalf).
// Local notifications only: no push server, works in Expo Go. Not on web.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from './notifications';
import { router } from 'expo-router';
import { useAuth } from '@prototype/ui-shared';

const KIND = 'checkin';
// Android fixes a channel's importance when it is first created, so raising it needs a new id
const CHANNEL = 'checkin-banner';
// One fixed time for now; add a setting when students ask for a different one
const HOUR = 19;
// Scheduled a week ahead and re-planned on every launch, so the greetings keep coming as long
// as the app is opened at least once a week, and stop for a student who has gone quiet.
const DAYS = 7;
// Testing knob: EXPO_PUBLIC_CHECKIN_TEST_SECONDS=10 in apps/mobile/.env also sends one greeting
// that many seconds after launch, so the notification can be checked without waiting for 19:00.
const TEST_SECONDS = Number(process.env.EXPO_PUBLIC_CHECKIN_TEST_SECONDS) || 0;

const PROMPTS: ((name: string) => { title: string; body: string })[] = [
  (n) => ({ title: `Hai ${n}, apa kabar hari ini?`, body: 'Gimana harimu? Cerita ke Sajiwa, sedikit juga boleh.' }),
  (n) => ({ title: `Sudah istirahat belum, ${n}?`, body: 'Tarik napas sebentar. Kalau ada yang mengganjal, Sajiwa siap dengar.' }),
  () => ({ title: 'Satu hal kecil yang bikin senyum hari ini?', body: 'Coba ingat satu momen baik hari ini, lalu ceritakan ke Sajiwa.' }),
  (n) => ({ title: `Lagi capek, ${n}?`, body: 'Wajar kok. Mau cerita apa yang paling menguras energimu hari ini?' }),
  () => ({ title: 'Cek kabar dulu, yuk', body: 'Dari 1 sampai 10, perasaanmu hari ini ada di angka berapa?' }),
  () => ({ title: 'Kamu sudah berusaha hari ini', body: 'Apa satu hal yang berhasil kamu lewati? Sajiwa pengen tahu.' }),
  (n) => ({ title: `Selamat malam, ${n}`, body: 'Sebelum tidur, mau cerita gimana perasaanmu hari ini?' }),
];

// Notification buttons → the message waiting in the chat composer. Android shows at most three.
const ANSWERS = [
  { id: 'baik', title: '😊 Baik', draft: 'Hari ini aku merasa cukup baik.' },
  { id: 'biasa', title: '😐 Biasa aja', draft: 'Hari ini rasanya biasa aja.' },
  { id: 'berat', title: '😔 Lagi berat', draft: 'Hari ini rasanya lagi berat buat aku.' },
];

const native = Platform.OS !== 'web';

if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
    }),
  });
}

async function plan(name: string) {
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') {
    console.warn('[check-in] notification permission not granted; nothing scheduled');
    return;
  }

  if (Platform.OS === 'android') {
    // HIGH: shown as a heads-up banner. DEFAULT only drops it silently into the shade.
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Sapaan harian', importance: Notifications.AndroidImportance.HIGH,
    });
  }
  // Without the buttons the greeting still arrives and still opens the chat
  await Notifications.setNotificationCategoryAsync(
    KIND,
    ANSWERS.map((a) => ({ identifier: a.id, buttonTitle: a.title, options: { opensAppToForeground: true } })),
  ).catch((e) => console.warn('[check-in] answer buttons unavailable', e));

  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = new Date();
  for (let d = 0; d <= DAYS; d++) {
    const at = new Date(now);
    at.setDate(now.getDate() + d);
    at.setHours(HOUR, 0, 0, 0);
    if (at <= now) continue;
    // Keyed to the date, so re-planning never changes the greeting a day already has
    const prompt = PROMPTS[Math.floor(at.getTime() / 86_400_000) % PROMPTS.length](name);
    await Notifications.scheduleNotificationAsync({
      content: { ...prompt, categoryIdentifier: KIND, data: { kind: KIND } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
  if (TEST_SECONDS > 0) {
    await Notifications.scheduleNotificationAsync({
      content: { ...PROMPTS[0](name), categoryIdentifier: KIND, data: { kind: KIND } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: TEST_SECONDS, channelId: CHANNEL },
    });
  }
  if (__DEV__) console.log(`[check-in] scheduled ${DAYS} evenings at ${HOUR}:00${TEST_SECONDS ? `, plus a test in ${TEST_SECONDS}s` : ''}`);
}

function open(response: Notifications.NotificationResponse) {
  if (response.notification.request.content.data?.kind !== KIND) return;
  const draft = ANSWERS.find((a) => a.id === response.actionIdentifier)?.draft;
  // replace, not push: chat is a tab, and tabs are siblings
  router.replace({ pathname: '/chat', params: draft ? { draft } : {} });
  Notifications.clearLastNotificationResponseAsync().catch(() => {});
}

/** `ready`: the navigator is mounted and the launch redirect is done, so opening chat sticks. */
export function useCheckIn(ready: boolean) {
  const { user, isLoading } = useAuth();
  const name = user?.name?.split(' ')[0] ?? '';
  const student = user?.role === 'mahasiswa';

  // Plan on sign-in and each launch; a sign-out (or a non-student account) clears the plan
  useEffect(() => {
    if (!native || isLoading) return;
    if (student) plan(name).catch((e) => console.warn('[check-in] scheduling failed', e));
    else Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  }, [isLoading, student, name]);

  useEffect(() => {
    if (!native || !ready || !student) return;
    // A tap that launched the app arrives before this listener exists
    Notifications.getLastNotificationResponseAsync().then((r) => r && open(r)).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready, student]);
}
