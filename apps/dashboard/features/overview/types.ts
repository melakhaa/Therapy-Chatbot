export type AssessmentCategory = 'depression' | 'anxiety' | 'stress';

export interface AssessmentCategoryResult {
  category: AssessmentCategory;
  severity: string | null;
  scaled_score: number | null;
}

export interface AttentionSignal {
  log_id: string;
  user_id: string | null;
  assessment_id: string | null;
  is_read: boolean;
  notified_at: string | null;
  nama: string | null;
  nim: string | null;
  signal_type: 'assessment' | 'safety';
  assessment_categories?: string | null;
  assessment_category_results?: AssessmentCategoryResult[] | null;
}

export interface AttentionResponse {
  signals: AttentionSignal[];
  summary: { signal_type: AttentionSignal['signal_type']; total: number; unread: number }[];
  total: number;
  page: number;
  page_size: number;
}

export interface CounselingRequest {
  counseling_request_id: string;
  student_id: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  created_at: string;
  nama: string;
  nim: string | null;
  faculty_name: string | null;
  academic_unit_name: string | null;
}

export interface CounselingRequestsResponse {
  requests: CounselingRequest[];
  total: number;
  page: number;
  page_size: number;
}

export interface CounselingAppointment {
  appointment_id: string;
  counseling_request_id: string | null;
  student_id: string;
  student_name: string;
  nim: string | null;
  counselor_id: string;
  counselor_name: string;
  starts_at: string;
  ends_at: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
}

export interface CounselingCalendarResponse {
  appointments: CounselingAppointment[];
}

export interface OrganizationSchedule {
  jadwal_id: string;
  konselor_id: string;
  counselor_name: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  status: 'tersedia' | 'dipesan' | 'selesai' | 'dibatalkan';
  booking_id: string | null;
  booking_status: string | null;
}

export interface OrganizationSchedulesResponse {
  schedules: OrganizationSchedule[];
  total: number;
}

export interface OverviewSources {
  attention: AttentionResponse;
  requests: CounselingRequestsResponse;
  calendar: CounselingCalendarResponse;
  schedules: OrganizationSchedulesResponse;
}

export type PrioritySource = 'safety' | 'assessment' | 'request';

export interface PriorityCase {
  id: string;
  source: PrioritySource;
  sourceId: string;
  studentId: string | null;
  studentName: string | null;
  nim: string | null;
  facultyName: string | null;
  academicUnitName: string | null;
  createdAt: string | null;
  reviewed: boolean;
  categoryResults: AssessmentCategoryResult[];
  backendSeverity: string | null;
  rank: number;
}
