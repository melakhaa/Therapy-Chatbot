import type { ApiRequestOptions } from './api/client';
import type { StudentAssessment, StudentRow, SupportProfileState } from '../features/students/types';
import type { AcademicUnit, Faculty } from '../features/monitoring/types';
import type { AttentionSignal } from '../features/overview/types';
import type { Appointment, AvailabilityRule, BlockedPeriod, Counselor, CounselingRequest } from '../features/counseling/types';
import type { HotlineRecord, HotlineStatus } from '../features/hotline/types';
import type { Instrument, InstrumentDetail, InstrumentStatus, QuestionDraft } from '../features/instruments/types';

const DAY = 86_400_000;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const key = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const day = (offset = 0) => key(new Date(Date.now() + offset * DAY));
const at = (offset: number, hour: number, minute = 0) => new Date(`${day(offset)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+07:00`).toISOString();
const page = <T>(rows: T[], pageNumber: number, pageSize: number) => rows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

type PreviewFaculty = Faculty & { source_url: null };
type PreviewUnit = AcademicUnit & { degree_level: string | null; source_url: null };

const faculties: PreviewFaculty[] = [
  { faculty_id: 'preview-faculty-engineering', code: 'FT-P', name: 'Fakultas Rekayasa Sintetis', active: true, source_url: null },
  { faculty_id: 'preview-faculty-health', code: 'FK-P', name: 'Fakultas Kesehatan Sintetis', active: true, source_url: null },
  { faculty_id: 'preview-faculty-social', code: 'FS-P', name: 'Fakultas Sosial Sintetis', active: false, source_url: null },
];

const units: PreviewUnit[] = [
  { academic_unit_id: 'preview-unit-computing', faculty_id: faculties[0].faculty_id, faculty_name: faculties[0].name, code: 'IF-P', name: 'Program Studi Komputasi Contoh', unit_type: 'study_program', degree_level: 'S1', active: true, source_url: null },
  { academic_unit_id: 'preview-unit-industry', faculty_id: faculties[0].faculty_id, faculty_name: faculties[0].name, code: 'SI-P', name: 'Program Studi Sistem Industri Contoh', unit_type: 'study_program', degree_level: 'S1', active: true, source_url: null },
  { academic_unit_id: 'preview-unit-care', faculty_id: faculties[1].faculty_id, faculty_name: faculties[1].name, code: 'KP-P', name: 'Program Studi Perawatan Contoh', unit_type: 'study_program', degree_level: 'S1', active: true, source_url: null },
  { academic_unit_id: 'preview-unit-policy', faculty_id: faculties[2].faculty_id, faculty_name: faculties[2].name, code: 'KB-P', name: 'Departemen Kebijakan Contoh', unit_type: 'department', degree_level: null, active: false, source_url: null },
];

let students: Array<StudentRow & { support_condition: SupportProfileState; support_disability: SupportProfileState }> = [
  { user_id: 'preview-student-01', nama: 'Ayu Simulasi', email: 'ayu.simulasi@example.invalid', nim: 'PREVIEW-26001', role: 'mahasiswa', created_at: at(-210, 9), faculty_id: faculties[0].faculty_id, faculty_name: faculties[0].name, academic_unit_id: units[0].academic_unit_id, academic_unit_name: units[0].name, unit_type: 'study_program', support_condition: 'none', support_disability: 'none' },
  { user_id: 'preview-student-02', nama: 'Bima Contoh', email: 'bima.contoh@example.invalid', nim: 'PREVIEW-26002', role: 'mahasiswa', created_at: at(-180, 10), faculty_id: faculties[1].faculty_id, faculty_name: faculties[1].name, academic_unit_id: units[2].academic_unit_id, academic_unit_name: units[2].name, unit_type: 'study_program', support_condition: 'present', support_disability: 'prefer_not_to_say' },
  { user_id: 'preview-student-03', nama: 'Citra Demo', email: 'citra.demo@example.invalid', nim: 'PREVIEW-26003', role: 'mahasiswa', created_at: at(-150, 11), faculty_id: faculties[0].faculty_id, faculty_name: faculties[0].name, academic_unit_id: units[1].academic_unit_id, academic_unit_name: units[1].name, unit_type: 'study_program', support_condition: 'unknown', support_disability: 'none' },
  { user_id: 'preview-student-04', nama: 'Damar Uji', email: 'damar.uji@example.invalid', nim: 'PREVIEW-26004', role: 'mahasiswa', created_at: at(-120, 8), faculty_id: faculties[2].faculty_id, faculty_name: faculties[2].name, academic_unit_id: units[3].academic_unit_id, academic_unit_name: units[3].name, unit_type: 'department', support_condition: 'prefer_not_to_say', support_disability: 'unknown' },
];

const assessments: Record<string, StudentAssessment[]> = {
  'preview-student-01': [{ assessment_id: 'preview-assessment-01', user_id: 'preview-student-01', instrument_type: 'DASS-21', instrument_version_id: 'preview-dass-v1', score: 62, severity: 'severe', taken_at: at(0, 8, 20), category_results: [{ category: 'depression', severity: 'severe', scaled_score: 24 }, { category: 'anxiety', severity: 'moderate', scaled_score: 18 }, { category: 'stress', severity: 'moderate', scaled_score: 20 }] }],
  'preview-student-02': [{ assessment_id: 'preview-assessment-02', user_id: 'preview-student-02', instrument_type: 'DASS-21', instrument_version_id: 'preview-dass-v1', score: 78, severity: 'extremely_severe', taken_at: at(-1, 14, 10), category_results: [{ category: 'depression', severity: 'extremely_severe', scaled_score: 30 }, { category: 'anxiety', severity: 'severe', scaled_score: 22 }, { category: 'stress', severity: 'severe', scaled_score: 26 }] }],
  'preview-student-03': [{ assessment_id: 'preview-assessment-03', user_id: 'preview-student-03', instrument_type: 'DASS-21', instrument_version_id: 'preview-dass-v1', score: 34, severity: 'moderate', taken_at: at(-4, 9, 15), category_results: [{ category: 'depression', severity: 'mild', scaled_score: 12 }, { category: 'anxiety', severity: 'moderate', scaled_score: 12 }, { category: 'stress', severity: 'mild', scaled_score: 10 }] }],
};

const bookings: Record<string, unknown[]> = {
  'preview-student-01': [{ booking_id: 'preview-booking-01', status: 'menunggu', tanggal: day(1), waktu_mulai: '10:00:00', waktu_selesai: '11:00:00' }],
  'preview-student-02': [{ booking_id: 'preview-booking-02', status: 'dikonfirmasi', tanggal: day(2), waktu_mulai: '13:00:00', waktu_selesai: '14:00:00' }, { booking_id: 'preview-booking-old', status: 'selesai', tanggal: day(-12), waktu_mulai: '09:00:00', waktu_selesai: '10:00:00' }],
  'preview-student-03': [{ booking_id: 'preview-booking-03', status: 'selesai', tanggal: day(-3), waktu_mulai: '15:00:00', waktu_selesai: '16:00:00' }],
};

let signals: AttentionSignal[] = [
  { log_id: 'preview-safety-01', user_id: students[1].user_id, assessment_id: null, is_read: false, notified_at: at(0, 10, 14), nama: students[1].nama, nim: students[1].nim, signal_type: 'safety', assessment_categories: null, assessment_category_results: null },
  { log_id: 'preview-assessment-signal-01', user_id: students[0].user_id, assessment_id: 'preview-assessment-01', is_read: false, notified_at: at(0, 8, 23), nama: students[0].nama, nim: students[0].nim, signal_type: 'assessment', assessment_categories: 'depression,anxiety,stress', assessment_category_results: assessments['preview-student-01'][0].category_results },
  { log_id: 'preview-assessment-signal-02', user_id: students[2].user_id, assessment_id: 'preview-assessment-03', is_read: true, notified_at: at(-4, 9, 20), nama: students[2].nama, nim: students[2].nim, signal_type: 'assessment', assessment_categories: 'depression,anxiety,stress', assessment_category_results: assessments['preview-student-03'][0].category_results },
];

let requests: CounselingRequest[] = [
  { counseling_request_id: 'preview-request-01', student_id: students[0].user_id, status: 'requested', created_at: at(0, 8, 45), nama: students[0].nama, nim: students[0].nim, faculty_name: students[0].faculty_name, academic_unit_name: students[0].academic_unit_name },
  { counseling_request_id: 'preview-request-02', student_id: students[3].user_id, status: 'requested', created_at: at(-2, 13, 30), nama: students[3].nama, nim: students[3].nim, faculty_name: students[3].faculty_name, academic_unit_name: students[3].academic_unit_name },
];

let counselors: Counselor[] = [
  { user_id: 'preview-counselor-01', nama: 'Dr. Nara Fiktif', email: 'nara.fiktif@example.invalid', title: 'Psikolog Kampus (Preview)', specialization: 'Penyesuaian akademik', active: true },
  { user_id: 'preview-counselor-02', nama: 'Konselor Raka Sintetis', email: 'raka.sintetis@example.invalid', title: 'Konselor Mahasiswa (Preview)', specialization: 'Keterampilan belajar', active: true },
  { user_id: 'preview-counselor-03', nama: 'Dr. Sinta Contoh', email: 'sinta.contoh@example.invalid', title: 'Psikolog Kampus (Preview)', specialization: 'Relasi sosial', active: false },
];

let availability: AvailabilityRule[] = [
  { availability_rule_id: 'preview-rule-01', counselor_id: counselors[0].user_id, day_of_week: 0, start_time: '09:00:00', end_time: '12:00:00', timezone: 'Asia/Jakarta', effective_from: day(-30), effective_to: null, active: true },
  { availability_rule_id: 'preview-rule-02', counselor_id: counselors[0].user_id, day_of_week: 2, start_time: '13:00:00', end_time: '16:00:00', timezone: 'Asia/Jakarta', effective_from: day(-30), effective_to: null, active: true },
  { availability_rule_id: 'preview-rule-03', counselor_id: counselors[1].user_id, day_of_week: 1, start_time: '10:00:00', end_time: '14:00:00', timezone: 'Asia/Jakarta', effective_from: day(-20), effective_to: null, active: true },
];

let appointments: Appointment[] = [
  { appointment_id: 'preview-appointment-01', counseling_request_id: null, student_id: students[2].user_id, student_name: students[2].nama, nim: students[2].nim, counselor_id: counselors[0].user_id, counselor_name: counselors[0].nama, starts_at: at(0, 9), ends_at: at(0, 10), status: 'completed' },
  { appointment_id: 'preview-appointment-02', counseling_request_id: null, student_id: students[1].user_id, student_name: students[1].nama, nim: students[1].nim, counselor_id: counselors[1].user_id, counselor_name: counselors[1].nama, starts_at: at(0, 13), ends_at: at(0, 14), status: 'confirmed' },
  { appointment_id: 'preview-appointment-03', counseling_request_id: null, student_id: students[3].user_id, student_name: students[3].nama, nim: students[3].nim, counselor_id: counselors[0].user_id, counselor_name: counselors[0].nama, starts_at: at(2, 10), ends_at: at(2, 11), status: 'rescheduled' },
];

let blocks: BlockedPeriod[] = [{ blocked_period_id: 'preview-block-01', counselor_id: counselors[0].user_id, counselor_name: counselors[0].nama, starts_at: at(1, 14), ends_at: at(1, 16), reason: 'Pengecualian jadwal sintetis' }];

const answerOptions = () => [{ position: 0, label: 'Tidak pernah', score: 0 }, { position: 1, label: 'Kadang-kadang', score: 1 }, { position: 2, label: 'Cukup sering', score: 2 }, { position: 3, label: 'Sangat sering', score: 3 }];
const standardQuestions: QuestionDraft[] = Array.from({ length: 21 }, (_, index) => ({ item_key: `DASS21-${String(index + 1).padStart(2, '0')}`, category: ['stress', 'anxiety', 'depression'][index % 3], position: index + 1, wording: `Pernyataan standar DASS-21 ${index + 1} (preview konfigurasi)`, active: true, options: answerOptions() }));
const customQuestions: QuestionDraft[] = [{ item_key: 'SKM-01', category: 'kesiapan', position: 1, wording: 'Saya dapat mengenali dukungan akademik yang saya perlukan.', active: true, options: answerOptions() }, { item_key: 'SKM-02', category: 'dukungan', position: 2, wording: 'Saya mengetahui layanan kampus yang dapat saya hubungi.', active: true, options: answerOptions() }];
const instruments: Instrument[] = [
  { instrument_id: 'preview-instrument-dass21', code: 'DASS-21', name: 'DASS-21 Standard', description: 'Instrumen standar terlindungi untuk preview konfigurasi.', active: true, language: 'id', instrument_kind: 'standard', derived_from_instrument_id: null, norms_enabled: true, provenance: { synthetic_preview: true }, versions: [{ instrument_version_id: 'preview-dass-v1', version_number: 1, status: 'published', authoritative_config: true, updated_at: at(-40, 9), published_at: at(-40, 9) }] },
  { instrument_id: 'preview-instrument-draft', code: 'SKM-PREVIEW', name: 'Skrining Kesiapan Mahasiswa (Preview)', description: 'Contoh instrumen custom untuk demonstrasi builder.', active: true, language: 'id', instrument_kind: 'custom', derived_from_instrument_id: null, norms_enabled: false, provenance: { synthetic_preview: true }, versions: [{ instrument_version_id: 'preview-draft-v1', version_number: 1, status: 'draft', authoritative_config: false, updated_at: at(-1, 15), published_at: null }] },
  { instrument_id: 'preview-instrument-published', code: 'ADAPT-PREVIEW', name: 'Adaptasi Kampus Sintetis', description: 'Contoh custom yang telah dipublikasikan.', active: true, language: 'id', instrument_kind: 'custom', derived_from_instrument_id: null, norms_enabled: false, provenance: { synthetic_preview: true }, versions: [{ instrument_version_id: 'preview-published-v1', version_number: 1, status: 'published', authoritative_config: false, updated_at: at(-20, 11), published_at: at(-20, 11) }] },
];

const version = (instrument: Instrument, versionId: string, status: InstrumentStatus, revision: number, questions: QuestionDraft[]): InstrumentDetail => ({ version: { ...instrument.versions[0], instrument_version_id: versionId, status, instrument_id: instrument.instrument_id, code: instrument.code, name: instrument.name, language: instrument.language, instrument_kind: instrument.instrument_kind, norms_enabled: instrument.norms_enabled, provenance: instrument.provenance, derived_from_instrument_id: null, expected_question_count: questions.length, definition_revision: revision, scoring_config: instrument.instrument_kind === 'standard' ? { strategy: 'dass21' } : { strategy: 'sum_by_dimension' }, created_at: at(-30, 9), created_by_name: 'Preview Administrator', updated_by_name: 'Preview Administrator', published_by_name: status === 'published' ? 'Konselor Preview' : null }, questions, dimensions: (instrument.instrument_kind === 'standard' ? ['depression', 'anxiety', 'stress'] : ['kesiapan', 'dukungan']).map((code, index) => ({ code, name: code, position: index + 1, multiplier: instrument.instrument_kind === 'standard' ? 2 : 1, interpretation_bands: [] })), reviews: status === 'draft' ? [{ review_id: 'preview-review-01', definition_revision: revision, status: 'pending' }] : [] });
const instrumentDetails: Record<string, InstrumentDetail> = {
  'preview-dass-v1': version(instruments[0], 'preview-dass-v1', 'published', 1, standardQuestions),
  'preview-draft-v1': version(instruments[1], 'preview-draft-v1', 'draft', 3, customQuestions),
  'preview-published-v1': version(instruments[2], 'preview-published-v1', 'published', 2, customQuestions),
};

let hotlines: HotlineRecord[] = [
  { hotline_id: 'preview-hotline-01', nama: 'Layanan Dukungan Sintetis', nomor: '0800-PREVIEW-01', deskripsi: 'Kontak demonstrasi yang tidak terhubung ke layanan nyata.', service_type: 'Dukungan psikologis', operational_hours: 'Sen–Jum, 08.00–17.00', coverage: 'Kampus', verification_status: 'active', verified_at: at(-5, 10), verified_by: 'Preview Administrator', verification_note: 'Verifikasi sintetis untuk demonstrasi.', created_at: at(-30, 9), updated_at: at(-5, 10), updated_by: 'Preview Administrator' },
  { hotline_id: 'preview-hotline-02', nama: 'Pusat Bantuan Contoh', nomor: '0800-PREVIEW-02', deskripsi: 'Nomor fiktif untuk status perlu verifikasi.', service_type: 'Krisis nasional', operational_hours: '24 jam', coverage: 'Seluruh Indonesia', verification_status: 'verification_required', verified_at: null, verified_by: null, verification_note: 'Menunggu pemeriksaan ulang dalam preview.', created_at: at(-20, 9), updated_at: at(-2, 11), updated_by: 'Preview Administrator' },
  { hotline_id: 'preview-hotline-03', nama: 'Kontak Arsip Demo', nomor: '0800-PREVIEW-03', deskripsi: 'Entri nonaktif sintetis.', verification_status: 'inactive', verified_at: at(-60, 9), verified_by: 'Preview Administrator', verification_note: 'Dinonaktifkan untuk demonstrasi.', created_at: at(-90, 9), updated_at: at(-10, 9), updated_by: 'Preview Administrator' },
];

function attention() {
  const summary = ['assessment', 'safety'].map((signal_type) => ({ signal_type, total: signals.filter((row) => row.signal_type === signal_type).length, unread: signals.filter((row) => row.signal_type === signal_type && !row.is_read).length }));
  return { signals: clone(signals), summary, total: signals.length, page: 1, page_size: 100 };
}

function analytics(url: URL) {
  const from = url.searchParams.get('date_from') ?? day(-29); const to = url.searchParams.get('date_to') ?? day();
  const selectedFacultyIds = url.searchParams.getAll('faculty_id'); const selectedUnitIds = url.searchParams.getAll('academic_unit_id');
  const selected = selectedUnitIds.length ? units.filter((row) => selectedUnitIds.includes(row.academic_unit_id)) : faculties.filter((row) => selectedFacultyIds.includes(row.faculty_id));
  const scopes = selected.length ? selected.map((row) => ({ scope_id: 'academic_unit_id' in row ? row.academic_unit_id : row.faculty_id, scope_label: row.name })) : [{ scope_id: null, scope_label: 'Universitas Preview' }];
  const dates = [from, day(-14), to].filter((value, index, all) => all.indexOf(value) === index).sort();
  const severity = { minimal: 42, mild: 23, moderate: 20, severe: 10, extremely_severe: 5 };
  return { mode: selected.length ? (selectedUnitIds.length ? 'academic_unit' : 'faculty') : 'university', date_from: from, date_to: to, selected_scopes: scopes,
    assessment_trend: scopes.flatMap((scope, scopeIndex) => dates.map((date, index) => ({ ...scope, date, assessment_count: [28, 34, 38][index] + scopeIndex * 3 }))),
    severity_distribution: scopes.flatMap((scope) => Object.entries(severity).map(([severityName, count]) => ({ ...scope, severity: severityName, count }))),
    category_trends: scopes.flatMap((scope) => ['depression', 'anxiety', 'stress'].flatMap((category, categoryIndex) => dates.map((date, index) => ({ ...scope, category, date, score: 8 + categoryIndex * 2 + index, submission_count: [28, 34, 38][index] })))),
    category_severity_distribution: scopes.flatMap((scope) => ['depression', 'anxiety', 'stress'].flatMap((category) => Object.entries(severity).map(([severityName, count]) => ({ ...scope, category, severity: severityName, count })))),
    counseling_utilization: scopes.flatMap((scope) => [{ ...scope, status: 'completed', count: 42 }, { ...scope, status: 'confirmed', count: 18 }, { ...scope, status: 'cancelled', count: 6 }, { ...scope, status: 'no_show', count: 4 }]),
    attention_counts: scopes.flatMap((scope) => [{ ...scope, signal_type: 'assessment', count: 12 }, { ...scope, signal_type: 'safety', count: 3 }]) };
}

export async function previewRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const url = new URL(path, 'http://preview.sajiwa.local'); const method = (options.method ?? 'GET').toUpperCase(); const body = (options.body ?? {}) as Record<string, unknown>;
  let result: unknown;

  if (path.startsWith('/admin/attention')) {
    const match = url.pathname.match(/^\/admin\/attention\/([^/]+)\/read$/);
    if (match && method === 'PATCH') { signals = signals.map((row) => row.log_id === decodeURIComponent(match[1]) ? { ...row, is_read: true } : row); result = { message: 'Preview attention marked reviewed' }; }
    else result = attention();
  } else if (url.pathname === '/admin/academic/faculties') {
    const mapped = faculties.map((row) => ({ ...row, unit_count: units.filter((unit) => unit.faculty_id === row.faculty_id).length, student_count: students.filter((student) => student.faculty_id === row.faculty_id).length }));
    if (method === 'POST') { const row = { faculty_id: `preview-faculty-${Date.now()}`, code: body.code as string | null, name: body.name as string, active: body.active as boolean, source_url: null }; faculties.push(row); result = { faculty: { ...row, unit_count: 0, student_count: 0 } }; } else result = { faculties: mapped };
  } else if (/^\/admin\/academic\/faculties\//.test(url.pathname) && method === 'PUT') {
    const id = decodeURIComponent(url.pathname.split('/').at(-1)!); const index = faculties.findIndex((row) => row.faculty_id === id); faculties[index] = { ...faculties[index], code: body.code as string | null, name: body.name as string, active: body.active as boolean }; result = { faculty: { ...faculties[index], unit_count: units.filter((row) => row.faculty_id === id).length, student_count: students.filter((row) => row.faculty_id === id).length } };
  } else if (url.pathname === '/admin/academic/units') {
    const mapped = units.map((row) => ({ ...row, student_count: students.filter((student) => student.academic_unit_id === row.academic_unit_id).length }));
    if (method === 'POST') { const faculty = faculties.find((row) => row.faculty_id === body.faculty_id); const row: PreviewUnit = { academic_unit_id: `preview-unit-${Date.now()}`, faculty_id: body.faculty_id as string, faculty_name: faculty?.name ?? 'Preview', code: body.code as string | null, name: body.name as string, unit_type: body.unit_type as PreviewUnit['unit_type'], degree_level: body.degree_level as string | null, active: body.active as boolean, source_url: null }; units.push(row); result = { academic_unit: { ...row, student_count: 0 } }; } else result = { academic_units: mapped };
  } else if (/^\/admin\/academic\/units\//.test(url.pathname) && method === 'PUT') {
    const id = decodeURIComponent(url.pathname.split('/').at(-1)!); const index = units.findIndex((row) => row.academic_unit_id === id); const faculty = faculties.find((row) => row.faculty_id === body.faculty_id); units[index] = { ...units[index], faculty_id: body.faculty_id as string, faculty_name: faculty?.name ?? units[index].faculty_name, code: body.code as string | null, name: body.name as string, unit_type: body.unit_type as PreviewUnit['unit_type'], degree_level: body.degree_level as string | null, active: body.active as boolean }; result = { academic_unit: { ...units[index], student_count: students.filter((row) => row.academic_unit_id === id).length } };
  } else if (url.pathname === '/admin/students') {
    const search = (url.searchParams.get('search') ?? '').toLowerCase(); const facultyId = url.searchParams.get('faculty_id'); const unitId = url.searchParams.get('academic_unit_id'); const pageNumber = Number(url.searchParams.get('page') ?? 1); const pageSize = Number(url.searchParams.get('page_size') ?? 25);
    const rows = students.filter((row) => (!search || [row.nama, row.nim, row.email].some((value) => value?.toLowerCase().includes(search))) && (!facultyId || row.faculty_id === facultyId) && (!unitId || row.academic_unit_id === unitId)); result = { students: page(rows, pageNumber, pageSize), total: rows.length, page: pageNumber, page_size: pageSize };
  } else if (/^\/admin\/users\/[^/]+\/assessments$/.test(url.pathname)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]); const rows = assessments[id] ?? []; const pageNumber = Number(url.searchParams.get('page') ?? 1); const pageSize = Number(url.searchParams.get('page_size') ?? 20); result = { assessments: page(rows, pageNumber, pageSize), total: rows.length, page: pageNumber, page_size: pageSize };
  } else if (/^\/admin\/users\/[^/]+\/bookings$/.test(url.pathname)) {
    const id = decodeURIComponent(url.pathname.split('/')[3]); const rows = bookings[id] ?? []; const pageNumber = Number(url.searchParams.get('page') ?? 1); const pageSize = Number(url.searchParams.get('page_size') ?? 20); result = { bookings: page(rows, pageNumber, pageSize), total: rows.length, page: pageNumber, page_size: pageSize };
  } else if (/^\/admin\/users\//.test(url.pathname)) {
    const id = decodeURIComponent(url.pathname.split('/').at(-1)!); result = { user: students.find((row) => row.user_id === id) };
  } else if (/^\/accounts\//.test(url.pathname) && method === 'PUT') {
    const id = decodeURIComponent(url.pathname.split('/').at(-1)!); students = students.map((row) => row.user_id === id ? { ...row, nama: body.nama as string, nim: (body.nim as string | undefined) ?? row.nim } : row); result = { message: 'Preview identity updated', user_id: id };
  } else if (/^\/admin\/students\/[^/]+\/academic-profile$/.test(url.pathname) && method === 'PUT') {
    const id = decodeURIComponent(url.pathname.split('/')[3]); const faculty = faculties.find((row) => row.faculty_id === body.faculty_id); const unit = units.find((row) => row.academic_unit_id === body.academic_unit_id); students = students.map((row) => row.user_id === id ? { ...row, faculty_id: faculty?.faculty_id ?? null, faculty_name: faculty?.name ?? null, academic_unit_id: unit?.academic_unit_id ?? null, academic_unit_name: unit?.name ?? null, unit_type: unit?.unit_type ?? null } : row); result = { academic_profile: { user_id: id, faculty_id: faculty?.faculty_id ?? null, academic_unit_id: unit?.academic_unit_id ?? null } };
  } else if (url.pathname === '/admin/counselors') {
    result = { counselors, total: counselors.length };
  } else if (/^\/admin\/counselors\/[^/]+\/profile$/.test(url.pathname) && method === 'PUT') {
    const id = decodeURIComponent(url.pathname.split('/')[3]); counselors = counselors.map((row) => row.user_id === id ? { ...row, title: body.title as string | null, specialization: body.specialization as string | null, active: body.active as boolean } : row); result = { message: 'Preview counselor updated' };
  } else if (url.pathname === '/admin/counseling/availability') {
    if (method === 'POST') { availability.push({ availability_rule_id: `preview-rule-${Date.now()}`, counselor_id: body.counselor_id as string, day_of_week: body.day_of_week as number, start_time: body.start_time as string, end_time: body.end_time as string, timezone: body.timezone as string, effective_from: body.effective_from as string | null, effective_to: body.effective_to as string | null, active: true }); result = { message: 'Preview availability created' }; }
    else { const counselorId = url.searchParams.get('counselor_id'); const rows = availability.filter((row) => !counselorId || row.counselor_id === counselorId); result = { availability: rows, total: rows.length }; }
  } else if (/^\/admin\/counseling\/availability\//.test(url.pathname) && method === 'DELETE') {
    const id = decodeURIComponent(url.pathname.split('/').at(-1)!); availability = availability.map((row) => row.availability_rule_id === id ? { ...row, active: false } : row); result = { message: 'Preview availability deactivated' };
  } else if (url.pathname === '/admin/counseling/requests') {
    const rows = requests.filter((row) => row.status === (url.searchParams.get('status') ?? 'requested')); const pageNumber = Number(url.searchParams.get('page') ?? 1); const pageSize = Number(url.searchParams.get('page_size') ?? 100); result = { requests: page(rows, pageNumber, pageSize), total: rows.length, page: pageNumber, page_size: pageSize };
  } else if (/^\/admin\/counseling\/requests\/[^/]+\/assign$/.test(url.pathname) && method === 'POST') {
    const id = decodeURIComponent(url.pathname.split('/')[4]); const request = requests.find((row) => row.counseling_request_id === id)!; const counselor = counselors.find((row) => row.user_id === body.counselor_id)!; const appointment: Appointment = { appointment_id: `preview-appointment-${Date.now()}`, counseling_request_id: id, student_id: request.student_id, student_name: request.nama, nim: request.nim, counselor_id: counselor.user_id, counselor_name: counselor.nama, starts_at: body.starts_at as string, ends_at: body.ends_at as string, status: 'confirmed' }; appointments.push(appointment); requests = requests.map((row) => row.counseling_request_id === id ? { ...row, status: 'confirmed' } : row); result = { appointment };
  } else if (url.pathname === '/admin/counseling/calendar/multi') {
    const from = url.searchParams.get('date_from') ?? day(-7); const to = url.searchParams.get('date_to') ?? day(7); const counselorId = url.searchParams.get('counselor_id'); const inRange = (value: string) => key(new Date(value)) >= from && key(new Date(value)) <= to; result = { counselors, appointments: appointments.filter((row) => inRange(row.starts_at) && (!counselorId || row.counselor_id === counselorId)), availability: availability.filter((row) => !counselorId || row.counselor_id === counselorId), blocked_periods: blocks.filter((row) => inRange(row.starts_at) && (!counselorId || row.counselor_id === counselorId)) };
  } else if (/^\/admin\/counseling\/appointments\//.test(url.pathname) && method === 'PATCH') {
    const id = decodeURIComponent(url.pathname.split('/').at(-1)!); appointments = appointments.map((row) => row.appointment_id === id ? { ...row, ...body } : row); result = { appointment: appointments.find((row) => row.appointment_id === id) };
  } else if (url.pathname === '/admin/counseling/blocked-periods' && method === 'POST') {
    const counselor = counselors.find((row) => row.user_id === body.counselor_id); blocks.push({ blocked_period_id: `preview-block-${Date.now()}`, counselor_id: body.counselor_id as string, counselor_name: counselor?.nama ?? 'Preview Counselor', starts_at: body.starts_at as string, ends_at: body.ends_at as string, reason: (body.reason as string | undefined) ?? null }); result = { message: 'Preview exception created' };
  } else if (/^\/admin\/counseling\/blocked-periods\//.test(url.pathname) && method === 'DELETE') {
    const id = decodeURIComponent(url.pathname.split('/').at(-1)!); blocks = blocks.filter((row) => row.blocked_period_id !== id); result = { message: 'Preview exception removed' };
  } else if (url.pathname === '/admin/schedules') {
    const date = url.searchParams.get('date_from') ?? day(); result = { schedules: [{ jadwal_id: 'preview-slot-01', konselor_id: counselors[0].user_id, counselor_name: counselors[0].nama, tanggal: date, waktu_mulai: '10:00:00', waktu_selesai: '11:00:00', status: 'tersedia', booking_id: null, booking_status: null }, { jadwal_id: 'preview-slot-02', konselor_id: counselors[1].user_id, counselor_name: counselors[1].nama, tanggal: date, waktu_mulai: '14:00:00', waktu_selesai: '15:00:00', status: 'tersedia', booking_id: null, booking_status: null }], total: 2 };
  } else if (url.pathname === '/admin/analytics/comparison') {
    result = analytics(url);
  } else if (url.pathname === '/admin/assessment-instruments' && method === 'GET') {
    result = { instruments, total: instruments.length };
  } else if (url.pathname === '/admin/assessment-instruments' && method === 'POST') {
    const id = `preview-instrument-${Date.now()}`; const versionId = `preview-version-${Date.now()}`; const row: Instrument = { instrument_id: id, code: body.code as string, name: body.name as string, description: body.description as string, active: true, language: body.language as string, instrument_kind: 'custom', derived_from_instrument_id: null, norms_enabled: false, provenance: { synthetic_preview: true }, versions: [{ instrument_version_id: versionId, version_number: 1, status: 'draft', authoritative_config: false, updated_at: new Date().toISOString(), published_at: null }] }; instruments.push(row); instrumentDetails[versionId] = version(row, versionId, 'draft', 1, (body.questions as QuestionDraft[]) ?? []); result = { instrument_id: id, instrument_version_id: versionId, definition_revision: 1, status: 'draft' };
  } else if (/^\/admin\/assessment-instruments\/versions\/[^/]+$/.test(url.pathname)) {
    result = instrumentDetails[decodeURIComponent(url.pathname.split('/').at(-1)!)];
  } else if (/^\/admin\/assessment-instruments\/versions\/[^/]+\/draft$/.test(url.pathname) && method === 'PUT') {
    const id = decodeURIComponent(url.pathname.split('/')[4]); const detail = instrumentDetails[id]; detail.questions = clone(body.questions as typeof customQuestions); detail.version.definition_revision += 1; detail.version.updated_at = new Date().toISOString(); result = detail;
  } else if (/^\/admin\/assessment-instruments\/versions\/[^/]+\/validate$/.test(url.pathname) && method === 'POST') {
    const id = decodeURIComponent(url.pathname.split('/')[4]); const issues = instrumentDetails[id]?.questions.length ? [] : ['At least one question is required']; result = { publishable: issues.length === 0, issues };
  } else if (/^\/admin\/assessment-instruments\/versions\/[^/]+\/submit-review$/.test(url.pathname) && method === 'POST') {
    const id = decodeURIComponent(url.pathname.split('/')[4]); const detail = instrumentDetails[id]; detail.reviews = [{ review_id: `preview-review-${Date.now()}`, definition_revision: detail.version.definition_revision, status: 'pending' }]; result = { review: detail.reviews[0] };
  } else if (/^\/admin\/assessment-instruments\/[^/]+\/drafts$/.test(url.pathname) && method === 'POST') {
    const instrumentId = decodeURIComponent(url.pathname.split('/')[3]); const instrument = instruments.find((row) => row.instrument_id === instrumentId)!; const source = instrumentDetails[instrument.versions[0].instrument_version_id]; const versionId = `preview-version-${Date.now()}`; const detail = clone(source); detail.version.instrument_version_id = versionId; detail.version.version_number += 1; detail.version.status = 'draft'; detail.version.authoritative_config = false; detail.version.definition_revision = 1; detail.version.published_at = null; detail.version.published_by_name = null; detail.reviews = []; instrument.versions.unshift({ instrument_version_id: versionId, version_number: detail.version.version_number, status: 'draft', authoritative_config: false, updated_at: new Date().toISOString(), published_at: null }); instrumentDetails[versionId] = detail; result = detail;
  } else if (url.pathname === '/admin/hotlines') {
    if (method === 'POST') { const row: HotlineRecord = { hotline_id: `preview-hotline-${Date.now()}`, nama: body.nama as string, nomor: body.nomor as string, deskripsi: body.deskripsi as string | null, service_type: body.service_type as string | null, operational_hours: body.operational_hours as string | null, coverage: body.coverage as string | null, verification_status: (body.verification_status as HotlineStatus | undefined) ?? 'verification_required', verified_at: body.verification_status === 'active' ? new Date().toISOString() : null, verified_by: body.verification_status === 'active' ? 'Preview Administrator' : null, verification_note: (body.verification_note as string | null | undefined) ?? null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), updated_by: 'Preview Administrator' }; hotlines.push(row); result = { hotline: row }; } else result = { hotlines };
  } else if (/^\/admin\/hotlines\//.test(url.pathname)) {
    const id = decodeURIComponent(url.pathname.split('/').at(-1)!); const patch = method === 'DELETE' ? { verification_status: 'inactive' } : body; hotlines = hotlines.map((row) => row.hotline_id === id ? { ...row, ...patch, verified_at: patch.verification_status === 'active' ? new Date().toISOString() : row.verified_at, verified_by: patch.verification_status === 'active' ? 'Preview Administrator' : row.verified_by, updated_at: new Date().toISOString(), updated_by: 'Preview Administrator' } : row); result = { hotline: hotlines.find((row) => row.hotline_id === id) };
  } else {
    throw new Error(`Preview adapter has no synthetic response for ${method} ${url.pathname}`);
  }

  await Promise.resolve();
  return clone(result) as T;
}

export function previewDatasetSummary() {
  return { students: students.length, faculties: faculties.length, units: units.length, counselors: counselors.length, instruments: instruments.length, hotlines: hotlines.length };
}
