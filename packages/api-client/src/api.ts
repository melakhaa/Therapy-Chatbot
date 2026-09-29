import { Platform } from 'react-native';
import { fetch as streamFetch } from 'expo/fetch';
import { getToken, saveToken, saveUser, saveRefreshToken, getRefreshToken, clearAuth } from './storage';

let unauthorizedCallback: (() => void) | null = null;

export function setUnauthorizedCallback(callback: () => void) {
  unauthorizedCallback = callback;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function getDevApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://127.0.0.1:8000';
  }

  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return 'http://localhost:8000';
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || (__DEV__
  ? getDevApiBaseUrl()
  : 'https://your-production-url.com');

interface FetchOptions extends RequestInit {
  auth?: boolean;
  base?: string;
  timeoutMs?: number;
}

const refreshPromises = new Map<string, Promise<LoginResponse>>();

async function authHeader(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { auth = true, base = API_BASE_URL, timeoutMs = 30000, ...fetchOpts } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(auth ? await authHeader() : {}),
    ...(fetchOpts.headers as Record<string, string> || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}${path}`, { ...fetchOpts, headers, signal: controller.signal });

    if (!res.ok) {
      if (res.status === 401 && auth && path !== '/auth/refresh') {
        let currentRefreshPromise = refreshPromises.get(path);
        if (!currentRefreshPromise) {
          const refreshToken = await getRefreshToken();
          if (refreshToken) {
            currentRefreshPromise = apiRefreshSession(refreshToken);
            refreshPromises.set(path, currentRefreshPromise);
          }
        }

        if (currentRefreshPromise) {
          try {
            const data = await currentRefreshPromise;
            const retryHeaders = {
              ...headers,
              Authorization: `Bearer ${data.access_token}`,
            };
            const retryRes = await fetch(`${base}${path}`, {
              ...fetchOpts,
              headers: retryHeaders,
              signal: controller.signal,
            });
            if (retryRes.ok) {
              return retryRes.json() as Promise<T>;
            }
          } catch (refreshErr) {
            console.error('Session refresh failed:', refreshErr);
          } finally {
            refreshPromises.delete(path);
          }
        }
      }

      if (res.status === 401 && auth) {
        await clearAuth();
        if (unauthorizedCallback) {
          unauthorizedCallback();
        }
      }

      let detail = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        detail = err.detail || JSON.stringify(err);
      } catch {}
      throw new ApiError(res.status, detail);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

//  Auth 

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    user_id: string;
    email: string;
    nama: string;
    nim?: string;
    role: 'mahasiswa' | 'konselor' | 'admin' | 'pemangku_jabatan';
  };
}

export async function apiLogin(payload: LoginPayload): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
  });
  await saveToken(data.access_token);
  await saveRefreshToken(data.refresh_token);
  await saveUser(data.user);
  return data;
}

export async function apiLogout(): Promise<void> {
  await clearAuth();
}

export async function apiRefreshSession(refreshToken: string): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
    auth: false,
  });
  await saveToken(data.access_token);
  await saveRefreshToken(data.refresh_token);
  await saveUser(data.user);
  return data;
}

export async function apiRegister(payload: any) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: false,
  });
}

export async function apiRequestPasswordReset(email: string) {
  return apiFetch('/auth/reset-password/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
    auth: false,
  });
}

export async function apiConfirmPasswordReset(email: string, otp: string, new_password: string) {
  return apiFetch('/auth/reset-password/confirm', {
    method: 'POST',
    body: JSON.stringify({ email, otp, new_password }),
    auth: false,
  });
}

//  Guardrail / Hotline 

export async function apiGetHotline() {
  return apiFetch<{ hotlines: { nama: string; nomor: string; deskripsi?: string }[] }>(
    '/guardrail/hotline',
    { auth: false }
  );
}

export async function apiCheckGuardrail(message: string) {
  return apiFetch<{ is_high_risk: boolean; route: string; response: string | null }>(
    '/guardrail/check',
    { method: 'POST', body: JSON.stringify({ message }) }
  );
}

//  Chat 

export interface ChatPayload {
  message: string;
  session_id?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  text: string;
  route: string | null;
  created_at: string;
}

/** The caller's own transcript, decrypted server-side. Scoped to the JWT identity. */
export async function apiChatHistory(
  sessionId: string,
  limit = 50
): Promise<{ session_id: string; messages: ChatHistoryMessage[] }> {
  return apiFetch(
    `/chat/history?session_id=${encodeURIComponent(sessionId)}&limit=${limit}`
  );
}

export interface ChatStreamEvent {
  /** One token, present on most frames. */
  token?: string;
  /** Only on the first frame. */
  route?: string;
  is_high_risk?: boolean;
  /** Only if generation failed mid-stream. */
  error?: string;
}

/**
 * Stream a reply. `onEvent` fires per frame; the promise resolves at `[DONE]`.
 *
 * Uses `expo/fetch` because React Native's global fetch buffers the whole response — on web
 * that module is just `globalThis.fetch`, so both platforms take this path.
 */
export async function apiChatStream(
  payload: ChatPayload,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await streamFetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  if (!res.body) throw new ApiError(res.status, 'Respons tidak bisa di-stream');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames end at a blank line; hold the trailing partial frame for the next read.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      const raw = line.slice(5).trim();
      if (raw === '[DONE]') return;
      try {
        onEvent(JSON.parse(raw) as ChatStreamEvent);
      } catch {
        // Keep-alive or partial frame: not an error.
      }
    }
  }
}

/** Crisis sheet "Kabari tim Sajiwa": logs an unread safety signal for counselors. */
export async function apiReportToTeam(session_id?: string) {
  return apiFetch<{ status: string }>('/chat/report', {
    method: 'POST',
    body: JSON.stringify({ session_id }),
  });
}

export async function apiGetChatSessions(): Promise<{ sessions: any[] }> {
  return apiFetch('/chat/sessions');
}

export async function apiGetChatHistory(session_id: string): Promise<{ messages: any[] }> {
  return apiFetch(`/chat/history/${session_id}`);
}


/**
 * SSE streaming chat with auto-reconnection.
 * Calls `onToken` for each text chunk, `onDone` when complete.
 * Returns a cleanup fn to abort the stream.
 */
export interface ChatStreamOptions {
  maxRetries?: number;
  baseRetryDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export function apiChatStream(
  payload: ChatPayload,
  onToken: (token: string) => void,
  onDone: (meta: { is_high_risk: boolean; route: string }) => void,
  onError?: (err: Error) => void,
  options: ChatStreamOptions = {}
): () => void {
  const {
    maxRetries = 3,
    baseRetryDelayMs = 1000,
    onRetry,
  } = options;

  const controller = new AbortController();
  let attempt = 0;
  let isAborted = false;

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const attemptStream = async (): Promise<void> => {
    while (attempt <= maxRetries && !isAborted) {
      try {
        const token = await getToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE_URL}/chat/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          // Don't retry on client errors (4xx) except 401/429
          if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429) {
            throw new Error(`HTTP ${res.status}`);
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let streamCompleted = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            try {
              const parsed = JSON.parse(data);
              if (parsed.done) {
                // Final metadata event
                onDone({ is_high_risk: parsed.is_high_risk ?? false, route: parsed.route ?? '' });
                streamCompleted = true;
                return;
              }
              if (parsed.token) onToken(parsed.token);
            } catch {
              // skip malformed SSE line
            }
          }
        }

        if (!streamCompleted && !isAborted) {
          onDone({ is_high_risk: false, route: '' });
        }
        return;

      } catch (err: unknown) {
        if (isAborted || (err as Error).name === 'AbortError') return;

        attempt++;
        if (attempt > maxRetries) {
          onError?.(err instanceof Error ? err : new Error(String(err)));
          onDone({ is_high_risk: false, route: '' });
          return;
        }

        // Exponential backoff with jitter
        const delay = baseRetryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
        onRetry?.(attempt, err instanceof Error ? err : new Error(String(err)));
        await sleep(delay);
      }
    }
  };

  attemptStream();

  return () => {
    isAborted = true;
    controller.abort();
  };
}

//  Assessment 

export interface AnswerItem {
  question_id: number;
  score: number;
}

export interface AssessmentPayload {
  answers: AnswerItem[];
  instrument_type: 'PHQ-9' | 'GAD-7' | 'SRQ' | 'custom';
  session_id?: string;
}

export async function apiSubmitAssessment(payload: AssessmentPayload) {
  return apiFetch('/assessment/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

//  Jadwal / Booking 

export async function apiBuatBooking(jadwal_id: string, catatan?: string) {
  return apiFetch('/booking', {
    method: 'POST',
    body: JSON.stringify({ jadwal_id, catatan }),
  });
}

export async function apiGetBookingSaya() {
  return apiFetch<{ bookings: object[] }>('/booking/saya');
}

//  Dashboard / Operator 

export interface DashboardData {
  total_assessments: number;
  severity_distribution: {
    minimal: number;
    mild: number;
    moderate: number;
    severe: number;
  };
  weekly_trend: { date: string; count: number }[];
  recent_severe: { assessment_id: string; user_id: string; score: number; taken_at: string }[];
  guardrail_trigger_count: number;
  pending_bookings: { booking_id: string; user_id: string; created_at: string }[];
}

export async function apiGetDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/dashboard/data');
}

export interface UserRow {
  user_id: string;
  nama: string;
  email: string;
  nim?: string;
  role: string;
  created_at: string;
}

export async function apiGetAccounts(): Promise<{ users: UserRow[]; total: number }> {
  return apiFetch<{ users: UserRow[]; total: number }>('/accounts');
}

//  Journaling 

export interface JournalPayload {
  content: string;
  mood?: 'Calm' | 'Anxious' | 'Focused' | 'Tired';
}

export async function apiSaveJournal(payload: JournalPayload) {
  return apiFetch('/journal', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiGetTodayJournal() {
  return apiFetch<{ journal: { content: string; mood: string } | null }>('/journal/today');
}

export async function apiGetJournals(limit: number = 20, offset: number = 0) {
  return apiFetch<{ journals: any[] }>(`/journal?limit=${limit}&offset=${offset}`);
}

export async function apiUpdateJournal(journal_id: string, payload: Partial<JournalPayload>) {
  return apiFetch(`/journal/${journal_id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteJournal(journal_id: string) {
  return apiFetch(`/journal/${journal_id}`, {
    method: 'DELETE',
  });
}

//  Jadwal Admin (typed) 

//  Jadwal & Booking 

export interface AdminBooking {
  booking_id: string;
  status: string;
  catatan?: string;
  created_at: string;
  mahasiswa: { nama: string; nim?: string; email?: string };
  konselor: { nama: string };
  jadwal?: { tanggal: string; waktu_mulai: string; waktu_selesai: string } | null;
}

export async function apiGetAdminBookings(): Promise<{ bookings: AdminBooking[] }> {
  return apiFetch('/booking/admin');
}

export async function apiUpdateBookingStatus(booking_id: string, status: 'menunggu' | 'dikonfirmasi' | 'selesai' | 'dibatalkan') {
  return apiFetch(`/booking/${booking_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export interface JadwalSlot {
  jadwal_id: string;
  konselor_id: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  status: string;
}

export async function apiGetJadwal(): Promise<{ jadwal: JadwalSlot[] }> {
  return apiFetch('/jadwal');
}

export async function apiGetJadwalSaya(): Promise<{ jadwal: JadwalSlot[] }> {
  return apiFetch('/jadwal/saya');
}

export async function apiBuatJadwal(payload: { tanggal: string; waktu_mulai: string; waktu_selesai: string }) {
  return apiFetch('/jadwal', { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiUpdateJadwalStatus(jadwal_id: string, status: 'tersedia' | 'dipesan' | 'selesai' | 'dibatalkan') {
  return apiFetch(`/jadwal/${jadwal_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function apiGetKonselor(): Promise<{ users: UserRow[] }> {
  return apiFetch<{ users: UserRow[] }>('/accounts/konselor');
}
//  Staff dashboard: data coming from the student app

export type SignalType = 'safety' | 'request' | 'assessment';

export interface AttentionSignal {
  log_id: string;
  user_id: string | null;
  assessment_id: string | null;
  is_read: boolean;
  notified_at: string;
  nama: string | null;
  nim: string | null;
  signal_type: SignalType;
}

export interface AttentionResponse {
  signals: AttentionSignal[];
  summary: { signal_type: SignalType; total: number; unread: number }[];
  total: number;
  page: number;
  page_size: number;
}

export async function apiGetAttention(opts: { signal?: SignalType; unreadOnly?: boolean; page?: number; pageSize?: number } = {}) {
  const q = new URLSearchParams();
  if (opts.signal) q.set('signal', opts.signal);
  if (opts.unreadOnly) q.set('unread_only', 'true');
  q.set('page', String(opts.page ?? 1));
  q.set('page_size', String(opts.pageSize ?? 20));
  return apiFetch<AttentionResponse>(`/admin/attention?${q}`);
}

export async function apiMarkAttentionRead(log_id: string) {
  return apiFetch(`/admin/attention/${log_id}/read`, { method: 'PATCH' });
}

export type MoodKey = 'Calm' | 'Focused' | 'Tired' | 'Anxious';

export interface StudentInsights {
  days: number;
  students_total: number;
  students_new: number;
  students_active: number;
  journals_total: number;
  checkins_total: number;
  chat_sessions_total: number;
  mood_distribution: Partial<Record<MoodKey, number>>;
  mood_daily: { date: string; mood: MoodKey; count: number }[];
  chat_daily: { date: string; count: number }[];
}

export async function apiGetInsights(days = 30) {
  return apiFetch<StudentInsights>(`/admin/insights?days=${days}`);
}

export interface AnalyticsResponse {
  date_from: string;
  date_to: string;
  registered_students: number;
  assessment_total: number;
  severity_distribution: { severity: string; count: number }[];
  assessment_trend: { date: string; count: number }[];
  booking_total: number;
  booking_status: { status: string; count: number }[];
}

export async function apiGetAnalytics(date_from?: string, date_to?: string) {
  const q = new URLSearchParams();
  if (date_from) q.set('date_from', date_from);
  if (date_to) q.set('date_to', date_to);
  return apiFetch<AnalyticsResponse>(`/admin/analytics?${q}`);
}

export interface OrgSchedule {
  jadwal_id: string;
  konselor_id: string;
  counselor_name: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  status: string;
  booking_id: string | null;
  booking_status: string | null;
}

export async function apiGetAdminSchedules(opts: { dateFrom?: string; dateTo?: string; counselorId?: string } = {}) {
  const q = new URLSearchParams();
  if (opts.dateFrom) q.set('date_from', opts.dateFrom);
  if (opts.dateTo) q.set('date_to', opts.dateTo);
  if (opts.counselorId) q.set('counselor_id', opts.counselorId);
  return apiFetch<{ schedules: OrgSchedule[]; total: number }>(`/admin/schedules?${q}`);
}

export async function apiCreateAdminSchedule(payload: { counselor_id: string; tanggal: string; waktu_mulai: string; waktu_selesai: string }) {
  return apiFetch('/admin/schedules', { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiUpdateAdminSchedule(jadwal_id: string, status: 'tersedia' | 'dipesan' | 'selesai' | 'dibatalkan') {
  return apiFetch(`/admin/schedules/${jadwal_id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export interface HotlineRow {
  hotline_id: string;
  nama: string;
  nomor: string;
  deskripsi: string | null;
  created_at: string;
}

export async function apiAdminGetHotlines() {
  return apiFetch<{ hotlines: HotlineRow[]; total: number }>('/admin/hotlines');
}

export async function apiAdminCreateHotline(payload: { nama: string; nomor: string; deskripsi?: string }) {
  return apiFetch<{ hotline: HotlineRow }>('/admin/hotlines', { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiAdminUpdateHotline(hotline_id: string, payload: { nama?: string; nomor?: string; deskripsi?: string }) {
  return apiFetch<{ hotline: HotlineRow }>(`/admin/hotlines/${hotline_id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function apiAdminDeleteHotline(hotline_id: string) {
  return apiFetch(`/admin/hotlines/${hotline_id}`, { method: 'DELETE' });
}
