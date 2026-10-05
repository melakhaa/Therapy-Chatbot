import type { Appointment, AppointmentPayload, AppointmentStatus, AvailabilityRule, BlockedPeriod, CounselingRequest } from './types';

export const JAKARTA_TIME_ZONE = 'Asia/Jakarta';
export type SessionDisplayStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'no_show';

export function jakartaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: JAKARTA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function weekRange(anchor: string): { start: string; end: string; days: string[] } {
  const [year, month, day] = anchor.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const offset = (date.getUTCDay() + 6) % 7;
  const start = addDays(anchor, -offset);
  return { start, end: addDays(start, 6), days: Array.from({ length: 7 }, (_, index) => addDays(start, index)) };
}

export function deriveSessionStatus(appointment: Appointment, now: Date): SessionDisplayStatus {
  if (appointment.status === 'cancelled') return 'cancelled';
  if (appointment.status === 'no_show') return 'no_show';
  if (appointment.status === 'completed') return 'completed';
  const start = Date.parse(appointment.starts_at);
  const end = Date.parse(appointment.ends_at);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'scheduled';
  if (now.getTime() >= end) return 'completed';
  if (now.getTime() >= start) return 'ongoing';
  return 'scheduled';
}

export function localSchedulePayload(counselorId: string, date: string, startTime: string, endTime: string): AppointmentPayload | null {
  if (!counselorId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return null;
  const startsAt = new Date(`${date}T${startTime}:00+07:00`);
  const endsAt = new Date(`${date}T${endTime}:00+07:00`);
  if (!Number.isFinite(startsAt.getTime()) || endsAt <= startsAt) return null;
  return { counselor_id: counselorId, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() };
}

export function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return Date.parse(startA) < Date.parse(endB) && Date.parse(endA) > Date.parse(startB);
}

export function hasObviousConflict(payload: AppointmentPayload, appointments: Appointment[], blocks: BlockedPeriod[], excludeAppointmentId?: string, studentId?: string): boolean {
  return appointments.some((item) => item.appointment_id !== excludeAppointmentId && (item.counselor_id === payload.counselor_id || (!!studentId && item.student_id === studentId)) && ['confirmed', 'rescheduled'].includes(item.status) && overlaps(payload.starts_at, payload.ends_at, item.starts_at, item.ends_at))
    || blocks.some((item) => item.counselor_id === payload.counselor_id && overlaps(payload.starts_at, payload.ends_at, item.starts_at, item.ends_at));
}

export function filterAppointments(appointments: Appointment[], counselorId: string, status: '' | AppointmentStatus): Appointment[] {
  return appointments.filter((item) => (!counselorId || item.counselor_id === counselorId) && (!status || item.status === status));
}

export function normalizeRequests(response: { requests: CounselingRequest[] }): CounselingRequest[] {
  return response.requests.map(({ counseling_request_id, student_id, status, created_at, nama, nim, faculty_name, academic_unit_name }) => ({ counseling_request_id, student_id, status, created_at, nama, nim, faculty_name, academic_unit_name }));
}

export function activeAvailability(rules: AvailabilityRule[], counselorId = ''): AvailabilityRule[] {
  return rules.filter((rule) => rule.active && (!counselorId || rule.counselor_id === counselorId));
}
