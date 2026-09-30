import { apiFetch } from './api';
import type { BookingStatus, Severity } from './admin';
export type NotificationCategory='assessment'|'safety'|'counseling'|'schedule'|'system';
export interface Faculty{faculty_id:string;code:string|null;name:string;active:boolean;source_url:string|null;unit_count:number;student_count:number}
export interface AcademicUnit{academic_unit_id:string;faculty_id:string;faculty_name:string;code:string|null;name:string;unit_type:'department'|'study_program';degree_level:string|null;active:boolean;source_url:string|null;student_count:number}
export interface AdminNotification{notification_id:string;category:NotificationCategory;title:string;context:string|null;entity_type:string|null;entity_id:string|null;target_path:string|null;read_at:string|null;created_at:string}
export interface CounselingRequest{counseling_request_id:string;student_id:string;status:string;preferred_context:string|null;created_at:string;nama:string;nim:string|null;faculty_name:string|null;academic_unit_name:string|null}
export interface AppointmentEvent{appointment_event_id:string;event_type:'assigned'|'confirmed'|'rescheduled'|'cancelled'|'completed'|'no_show';created_at:string}
export interface AppointmentNote{admin_note_id:string;note_text:string;created_at:string;author_name:string|null}
export interface Appointment{appointment_id:string;counseling_request_id:string|null;student_id:string;student_name?:string;nim?:string|null;faculty_name?:string|null;academic_unit_name?:string|null;request_origin?:string|null;counselor_id:string;counselor_name?:string;starts_at:string;ends_at:string;status:'confirmed'|'completed'|'cancelled'|'rescheduled'|'no_show';history?:AppointmentEvent[];admin_notes?:AppointmentNote[]}
export interface Counselor{user_id:string;nama:string;email:string;title:string|null;specialization:string|null;active:boolean}
export interface AvailabilityRule{availability_rule_id:string;counselor_id:string;day_of_week:number;start_time:string;end_time:string;timezone:string;effective_from:string|null;effective_to:string|null;active:boolean}
export interface BlockedPeriod{blocked_period_id:string;counselor_id:string;counselor_name:string;starts_at:string;ends_at:string;reason:string|null}
export interface ScopedAnalytics{date_from:string;date_to:string;registered_students:number;assessment_total:number;severity_distribution:{severity:Severity;count:number}[];assessment_trend:{date:string;count:number}[];academic_breakdown:{faculty_name:string;academic_unit_name:string|null;assessment_count:number;attention_count:number}[];booking_total:number;booking_status:{status:BookingStatus;count:number}[]}
function qs(v:Record<string,string|string[]|number|boolean|undefined>){const p=new URLSearchParams();Object.entries(v).forEach(([k,x])=>{if(Array.isArray(x))x.forEach(value=>p.append(k,value));else if(x!==undefined&&x!=='')p.set(k,String(x));});return p.toString();}
export const apiGetFaculties=(include_inactive=false)=>apiFetch<{faculties:Faculty[];total:number}>('/admin/academic/faculties?'+qs({include_inactive}));
export const apiCreateFaculty=(body:Pick<Faculty,'name'|'code'|'active'>)=>apiFetch<{faculty:Faculty}>('/admin/academic/faculties',{method:'POST',body:JSON.stringify(body)});
export const apiUpdateFaculty=(id:string,body:Pick<Faculty,'name'|'code'|'active'>)=>apiFetch<{faculty:Faculty}>('/admin/academic/faculties/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(body)});
export const apiGetAcademicUnits=(faculty_id?:string,include_inactive=false)=>apiFetch<{academic_units:AcademicUnit[];total:number}>('/admin/academic/units?'+qs({faculty_id,include_inactive}));
export const apiCreateAcademicUnit=(body:Omit<AcademicUnit,'academic_unit_id'|'faculty_name'|'source_url'|'student_count'>)=>apiFetch('/admin/academic/units',{method:'POST',body:JSON.stringify(body)});
export const apiUpdateAcademicUnit=(id:string,body:Omit<AcademicUnit,'academic_unit_id'|'faculty_name'|'source_url'|'student_count'>)=>apiFetch('/admin/academic/units/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(body)});
export const apiSetStudentAcademicProfile=(id:string,faculty_id:string|null,academic_unit_id:string|null)=>apiFetch('/admin/students/'+encodeURIComponent(id)+'/academic-profile',{method:'PUT',body:JSON.stringify({faculty_id,academic_unit_id})});
export const apiGetNotifications=(category?:string,unread_only=false)=>apiFetch<{notifications:AdminNotification[];total:number}>('/admin/notifications?'+qs({category,unread_only}));
export const apiMarkNotificationRead=(id:string)=>apiFetch('/admin/notifications/'+encodeURIComponent(id)+'/read',{method:'PATCH'});
export const apiMarkAllNotificationsRead=()=>apiFetch('/admin/notifications/mark-all-read',{method:'POST'});
export const apiGetCounselingRequests=(status?:string)=>apiFetch<{requests:CounselingRequest[];total:number}>('/admin/counseling/requests?'+qs({status}));
export const apiCreateCounselingRequest=(preferred_context?:string)=>apiFetch('/counseling/requests',{method:'POST',body:JSON.stringify({preferred_context})});
export const apiAssignCounselingRequest=(id:string,body:{counselor_id:string;starts_at:string;ends_at:string})=>apiFetch<{appointment:Appointment}>('/admin/counseling/requests/'+encodeURIComponent(id)+'/assign',{method:'POST',body:JSON.stringify(body)});
export const apiUpdateAppointment=(id:string,body:Partial<Pick<Appointment,'counselor_id'|'starts_at'|'ends_at'|'status'>>)=>apiFetch<{appointment:Appointment}>('/admin/counseling/appointments/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(body)});
export const apiGetCounselingCalendar=(date_from:string,date_to:string,counselor_id?:string,status?:string)=>apiFetch<{appointments:Appointment[];blocked_periods:BlockedPeriod[]}>('/admin/counseling/calendar?'+qs({date_from,date_to,counselor_id,status}));
export const apiGetCounselors=()=>apiFetch<{counselors:Counselor[];total:number}>('/admin/counselors');
export const apiUpdateCounselor=(id:string,body:Pick<Counselor,'title'|'specialization'|'active'>)=>apiFetch('/admin/counselors/'+encodeURIComponent(id)+'/profile',{method:'PUT',body:JSON.stringify(body)});
export const apiGetAvailability=(counselor_id?:string)=>apiFetch<{availability:AvailabilityRule[];total:number}>('/admin/counseling/availability?'+qs({counselor_id}));
export const apiCreateAvailability=(body:Omit<AvailabilityRule,'availability_rule_id'>)=>apiFetch('/admin/counseling/availability',{method:'POST',body:JSON.stringify(body)});
export const apiDeactivateAvailability=(id:string)=>apiFetch('/admin/counseling/availability/'+encodeURIComponent(id),{method:'DELETE'});
export const apiCreateBlockedPeriod=(body:{counselor_id:string;starts_at:string;ends_at:string;reason?:string})=>apiFetch('/admin/counseling/blocked-periods',{method:'POST',body:JSON.stringify(body)});
export const apiDeleteBlockedPeriod=(id:string)=>apiFetch('/admin/counseling/blocked-periods/'+encodeURIComponent(id),{method:'DELETE'});
export const apiCreateCounselingNote=(body:{appointment_id?:string;counseling_request_id?:string;note_text:string})=>apiFetch<{note:AppointmentNote}>('/admin/counseling/notes',{method:'POST',body:JSON.stringify(body)});
export const apiGetScopedAnalytics=(date_from:string,date_to:string,faculty_id?:string|string[],academic_unit_id?:string|string[])=>apiFetch<ScopedAnalytics>('/admin/analytics/scoped?'+qs({date_from,date_to,faculty_id,academic_unit_id}));
export interface ReportAttentionStudent{nama:string;nim:string|null;faculty_name:string|null;academic_unit_name:string|null;signal_type:string;signal_date:string}
export interface ReportData extends ScopedAnalytics{mode:'aggregate'|'confidential';attention_students:ReportAttentionStudent[]}
export const apiGetReportData=(date_from:string,date_to:string,mode:'aggregate'|'confidential',faculty_id?:string|string[],academic_unit_id?:string|string[])=>apiFetch<ReportData>('/admin/reports/data?'+qs({date_from,date_to,mode,faculty_id,academic_unit_id}));
export const apiCreateReportAudit=(body:{report_mode:'aggregate'|'confidential';faculty_id?:string;academic_unit_id?:string;faculty_ids?:string[];academic_unit_ids?:string[];date_from:string;date_to:string})=>apiFetch('/admin/reports/audits',{method:'POST',body:JSON.stringify(body)});


export const apiGetOwnAppointments=()=>apiFetch<{appointments:Appointment[];total:number}>('/counseling/appointments');
