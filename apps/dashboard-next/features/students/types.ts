import type { AssessmentCategoryResult } from '@/features/overview/types';
import type { AcademicStructure } from '@/features/monitoring/types';

export type SupportProfileState = 'none' | 'present' | 'unknown' | 'prefer_not_to_say';

export interface StudentRow {
  user_id: string;
  nama: string;
  email: string;
  nim: string | null;
  role: string;
  created_at: string | null;
  faculty_id: string | null;
  faculty_name: string | null;
  academic_unit_id: string | null;
  academic_unit_name: string | null;
  unit_type: 'department' | 'study_program' | null;
  support_condition?: SupportProfileState;
  support_disability?: SupportProfileState;
}

export interface StudentDirectoryResponse {
  students: StudentRow[];
  total: number;
  page: number;
  page_size: number;
}

export interface StudentAssessment {
  assessment_id: string;
  user_id: string;
  instrument_type: string;
  instrument_version_id: string | null;
  score: number | null;
  severity: string | null;
  taken_at: string | null;
  category_results: AssessmentCategoryResult[] | null;
}

export interface StudentAssessmentPage {
  assessments: StudentAssessment[];
  total: number;
  page: number;
  page_size: number;
}

export type BookingStatus = 'menunggu' | 'dikonfirmasi' | 'selesai' | 'dibatalkan';
export interface StudentBooking {
  booking_id: string;
  status: BookingStatus;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
}

export interface StudentBookingPage {
  bookings: StudentBooking[];
  total: number;
  page: number;
  page_size: number;
}

export interface DirectoryFilters {
  search: string;
  facultyId: string;
  academicUnitId: string;
  page: number;
  pageSize: 25 | 50;
}

export interface IdentityDraft { nama: string; nim: string }
export interface IdentityPayload { nama: string; nim?: string }
export interface StudentDataBundle {
  student: StudentRow;
  assessments: StudentAssessmentPage | null;
  bookings: StudentBookingPage | null;
  assessmentError: boolean;
  bookingError: boolean;
}

export type StudentWorkspaceTab = 'overview' | 'assessments' | 'counseling' | 'academic';
export type { AcademicStructure };
