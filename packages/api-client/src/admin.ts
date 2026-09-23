import { apiFetch, type UserRow, type LoginResponse } from './api';

export type Role = LoginResponse['user']['role'];
export type Severity = 'minimal' | 'mild' | 'moderate' | 'severe';
export interface Profile extends UserRow { role: Role }
export interface AssessmentRow {
  assessment_id: string; user_id: string; instrument_type: string;
  score: number; severity: Severity; taken_at: string | null; nama?: string | null; nim?: string | null;
}
export interface AssessmentPage { assessments: AssessmentRow[]; total: number; page: number; page_size: number }
export interface BookingHistory {
  booking_id: string; status: BookingStatus; tanggal: string; waktu_mulai: string; waktu_selesai: string;
}
export interface BookingPage { bookings: BookingHistory[]; total: number; page: number; page_size: number }
export type BookingStatus = 'menunggu' | 'dikonfirmasi' | 'selesai' | 'dibatalkan';
export interface Schedule {
  jadwal_id: string; tanggal: string; waktu_mulai: string; waktu_selesai: string;
  status: 'tersedia' | 'dipesan' | 'selesai' | 'dibatalkan';
}
export interface IncomingBooking {
  booking_id: string; jadwal_id: string; status: BookingStatus; catatan: string | null;
  created_at: string; jadwal_konsultasi: Omit<Schedule, 'jadwal_id' | 'status'> & { konselor_id: string };
}
export interface AccountInput { nama: string; email: string; password: string; nim?: string; role: Role }
export type AccountUpdate = Pick<AccountInput, 'nama' | 'nim' | 'role'>;
export interface AssessmentFilters {
  search?: string; severity?: string; instrument?: string; date_from?: string; date_to?: string; page?: number;
}
export function apiGetProfile() { return apiFetch<Profile>('/auth/me'); }
export function apiGetAdminAssessments(filters: AssessmentFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, String(value)); });
  return apiFetch<AssessmentPage>('/admin/assessments?' + params);
}
export function apiGetUserDetail(id: string) { return apiFetch<{ user: Profile }>('/admin/users/' + encodeURIComponent(id)); }
export function apiGetUserAssessments(id: string, page = 1) {
  return apiFetch<AssessmentPage>('/admin/users/' + encodeURIComponent(id) + '/assessments?page=' + page);
}
export function apiGetUserBookings(id: string, page = 1) {
  return apiFetch<BookingPage>('/admin/users/' + encodeURIComponent(id) + '/bookings?page=' + page);
}
export function apiCreateAccount(data: AccountInput) {
  return apiFetch('/accounts', { method: 'POST', body: JSON.stringify(data) });
}
export function apiUpdateAccount(id: string, data: AccountUpdate) {
  return apiFetch('/accounts/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(data) });
}
export function apiDeleteAccount(id: string) {
  return apiFetch('/accounts/' + encodeURIComponent(id), { method: 'DELETE' });
}
export function apiGetOwnSchedules() { return apiFetch<{ jadwal: Schedule[] }>('/jadwal/saya'); }
export function apiGetIncomingBookings() { return apiFetch<{ bookings: IncomingBooking[] }>('/booking/masuk'); }
export function apiCreateSchedule(data: Pick<Schedule, 'tanggal' | 'waktu_mulai' | 'waktu_selesai'>) {
  return apiFetch('/jadwal', { method: 'POST', body: JSON.stringify(data) });
}
export function apiUpdateBooking(id: string, status: BookingStatus) {
  return apiFetch('/booking/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ status }) });
}
