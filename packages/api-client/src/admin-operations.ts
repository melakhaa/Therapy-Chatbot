import { apiFetch } from './api';
import type { BookingStatus, Role, Severity } from './admin';

export interface AttentionSignal {
  log_id: string; user_id: string | null; assessment_id: string | null;
  is_read: boolean; notified_at: string | null; nama: string | null; nim: string | null;
  signal_type: 'assessment' | 'safety';
}
export interface AttentionPage {
  signals: AttentionSignal[];
  summary: { signal_type: 'assessment' | 'safety'; total: number; unread: number }[];
  total: number; page: number; page_size: number;
}
export interface OrganizationSchedule {
  jadwal_id: string; konselor_id: string; counselor_name: string;
  tanggal: string; waktu_mulai: string; waktu_selesai: string;
  status: 'tersedia' | 'dipesan' | 'selesai' | 'dibatalkan';
  booking_id: string | null; booking_status: BookingStatus | null;
}
export interface HotlineRow {
  hotline_id: string; nama: string; nomor: string; deskripsi: string | null; created_at: string | null;
}
export interface AnalyticsData {
  date_from: string; date_to: string; registered_students: number; assessment_total: number;
  severity_distribution: { severity: Severity; count: number }[];
  assessment_trend: { date: string; count: number }[];
  booking_total: number; booking_status: { status: BookingStatus; count: number }[];
}
export interface AccountDraft { nama: string; email: string; password: string; nim?: string; role: Role }

export function apiGetAttention(params: { signal?: string; unread_only?: boolean; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.signal) query.set('signal', params.signal);
  if (params.unread_only) query.set('unread_only', 'true');
  if (params.page) query.set('page', String(params.page));
  return apiFetch<AttentionPage>('/admin/attention?' + query);
}
export function apiMarkAttentionRead(id: string) {
  return apiFetch('/admin/attention/' + encodeURIComponent(id) + '/read', { method: 'PATCH' });
}
export function apiGetOrganizationSchedules(params: { date_from?: string; date_to?: string; counselor_id?: string } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) query.set(key, value); });
  return apiFetch<{ schedules: OrganizationSchedule[]; total: number }>('/admin/schedules?' + query);
}
export function apiCreateOrganizationSchedule(data: { counselor_id: string; tanggal: string; waktu_mulai: string; waktu_selesai: string }) {
  return apiFetch('/admin/schedules', { method: 'POST', body: JSON.stringify(data) });
}
export function apiUpdateOrganizationSchedule(id: string, status: OrganizationSchedule['status']) {
  return apiFetch('/admin/schedules/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ status }) });
}
export function apiGetHotlines() { return apiFetch<{ hotlines: HotlineRow[]; total: number }>('/admin/hotlines'); }
export function apiCreateHotline(data: Pick<HotlineRow, 'nama' | 'nomor' | 'deskripsi'>) {
  return apiFetch('/admin/hotlines', { method: 'POST', body: JSON.stringify(data) });
}
export function apiUpdateHotline(id: string, data: Pick<HotlineRow, 'nama' | 'nomor' | 'deskripsi'>) {
  return apiFetch('/admin/hotlines/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(data) });
}
export function apiDeleteHotline(id: string) {
  return apiFetch('/admin/hotlines/' + encodeURIComponent(id), { method: 'DELETE' });
}
export function apiGetAnalytics(date_from?: string, date_to?: string) {
  const query = new URLSearchParams();
  if (date_from) query.set('date_from', date_from);
  if (date_to) query.set('date_to', date_to);
  return apiFetch<AnalyticsData>('/admin/analytics?' + query);
}
