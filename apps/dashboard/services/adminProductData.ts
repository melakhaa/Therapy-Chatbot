/** Production-safe frontend domain contracts. Local preview replaces these empty collections only in the uncommitted working tree. */
export type FacultyOption = { id: string; name: string };
export type DepartmentOption = { id: string; facultyId: string; name: string };
export type AcademicAssignment = { userId: string; facultyId: string; departmentId: string };
export type NotificationCategory = 'assessment' | 'safety' | 'counseling' | 'schedule' | 'system';
export type AdminNotification = { id: string; category: NotificationCategory; title: string; detail: string; time: string; route: string };
export type CounselorProfileView = { id: string; name: string; email: string; title: string; specialization: string; active: boolean; capacity: number };
export type CounselingRequestView = { id: string; student: string; nim: string; requestedAt: string; preference: string; status: 'waiting' | 'assigned' };
export type CalendarEntryView = { id: string; date: string; start: string; end: string; counselorId: string; counselor: string; student?: string; kind: 'appointment' | 'available' | 'blocked' | 'conflict'; status: string };
export type AvailabilityRuleView = { id: string; counselorId: string; day: string; start: string; end: string; active: boolean };
export const previewFaculties: FacultyOption[] = [];
export const previewDepartments: DepartmentOption[] = [];
export const previewAcademicAssignments: AcademicAssignment[] = [];
export const previewNotifications: AdminNotification[] = [];
export const previewCounselorProfiles: CounselorProfileView[] = [];
export const previewCounselingRequests: CounselingRequestView[] = [];
export const previewCalendarEntries: CalendarEntryView[] = [];
export const previewAvailability: AvailabilityRuleView[] = [];
