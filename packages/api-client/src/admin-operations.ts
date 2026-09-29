import { apiFetch } from './api';
import type { BookingStatus, Role, Severity } from './admin';

export type SignalType = 'assessment' | 'safety' | 'request';

export interface AttentionSignal {
  log_id: string;
  user_id: string | null;
  assessment_id: string | null;
  is_read: boolean;
  notified_at: string | null;
  nama: string | null;
  nim: string | null;
  signal_type: SignalType;
}

export interface AttentionPage {
  signals: AttentionSignal[];
  summary: { signal_type: SignalType; total: number; unread: number }[];
  total: number;
  page: number;
  page_size: number;
}
export type AttentionResponse = AttentionPage;

export interface OrganizationSchedule {
  jadwal_id: string;
  konselor_id: string;
  counselor_name: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  status: 'tersedia' | 'dipesan' | 'selesai' | 'dibatalkan';
  booking_id: string | null;
  booking_status: BookingStatus | null;
}
export type OrgSchedule = OrganizationSchedule;

export interface HotlineRow {
  hotline_id: string;
  nama: string;
  nomor: string;
  deskripsi: string | null;
  created_at: string | null;
}

export interface AnalyticsData {
  date_from: string;
  date_to: string;
  registered_students: number;
  assessment_total: number;
  severity_distribution: { severity: Severity; count: number }[];
  assessment_trend: { date: string; count: number }[];
  booking_total: number;
  booking_status: { status: BookingStatus; count: number }[];
}
export type AnalyticsResponse = AnalyticsData;

export interface AccountDraft {
  nama: string;
  email: string;
  password: string;
  nim?: string;
  role: Role;
}

export function apiGetAttention(
  params: {
    signal?: SignalType | string;
    unread_only?: boolean;
    unreadOnly?: boolean;
    page?: number;
    pageSize?: number;
    page_size?: number;
  } = {}
) {
  const query = new URLSearchParams();
  if (params.signal) query.set('signal', params.signal);
  if (params.unread_only || params.unreadOnly) query.set('unread_only', 'true');
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize || params.page_size) {
    query.set('page_size', String(params.pageSize || params.page_size));
  }
  return apiFetch<AttentionPage>('/admin/attention?' + query);
}

export function apiMarkAttentionRead(id: string) {
  return apiFetch('/admin/attention/' + encodeURIComponent(id) + '/read', { method: 'PATCH' });
}

export function apiGetOrganizationSchedules(
  params: { date_from?: string; dateFrom?: string; date_to?: string; dateTo?: string; counselor_id?: string; counselorId?: string } = {}
) {
  const query = new URLSearchParams();
  const dFrom = params.date_from || params.dateFrom;
  const dTo = params.date_to || params.dateTo;
  const cId = params.counselor_id || params.counselorId;
  if (dFrom) query.set('date_from', dFrom);
  if (dTo) query.set('date_to', dTo);
  if (cId) query.set('counselor_id', cId);
  return apiFetch<{ schedules: OrganizationSchedule[]; total: number }>('/admin/schedules?' + query);
}
export const apiGetAdminSchedules = apiGetOrganizationSchedules;

export function apiCreateOrganizationSchedule(data: {
  counselor_id?: string;
  counselorId?: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
}) {
  const payload = {
    counselor_id: data.counselor_id || data.counselorId,
    tanggal: data.tanggal,
    waktu_mulai: data.waktu_mulai,
    waktu_selesai: data.waktu_selesai,
  };
  return apiFetch('/admin/schedules', { method: 'POST', body: JSON.stringify(payload) });
}
export const apiCreateAdminSchedule = apiCreateOrganizationSchedule;

export function apiUpdateOrganizationSchedule(id: string, status: OrganizationSchedule['status']) {
  return apiFetch('/admin/schedules/' + encodeURIComponent(id), {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
export const apiUpdateAdminSchedule = apiUpdateOrganizationSchedule;

export function apiGetHotlines() {
  return apiFetch<{ hotlines: HotlineRow[]; total: number }>('/admin/hotlines');
}
export const apiAdminGetHotlines = apiGetHotlines;

export function apiCreateHotline(data: { nama: string; nomor: string; deskripsi?: string | null }) {
  return apiFetch<{ hotline: HotlineRow }>('/admin/hotlines', { method: 'POST', body: JSON.stringify(data) });
}
export const apiAdminCreateHotline = apiCreateHotline;

export function apiUpdateHotline(id: string, data: { nama?: string; nomor?: string; deskripsi?: string | null }) {
  return apiFetch<{ hotline: HotlineRow }>('/admin/hotlines/' + encodeURIComponent(id), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
export const apiAdminUpdateHotline = apiUpdateHotline;

export function apiDeleteHotline(id: string) {
  return apiFetch('/admin/hotlines/' + encodeURIComponent(id), { method: 'DELETE' });
}
export const apiAdminDeleteHotline = apiDeleteHotline;

export function apiGetAnalytics(date_from?: string, date_to?: string) {
  const query = new URLSearchParams();
  if (date_from) query.set('date_from', date_from);
  if (date_to) query.set('date_to', date_to);
  return apiFetch<AnalyticsData>('/admin/analytics?' + query);
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
