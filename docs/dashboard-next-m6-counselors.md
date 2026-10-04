# Sajiwa Counselors & Availability (M6)

## Scope

M6 replaces `/counselors` and reuses the same feature at `/counselors/[counselorId]` for direct access. It implements the counselor directory, profile drawer, profile metadata editing, active-state confirmation, recurring weekly availability editing, and bounded summaries of upcoming appointments and one-off blocks. It does not add a second counseling calendar, analytics, room resources, reports, instruments, hotline, settings, backend, database, mobile, or legacy-dashboard changes.

## API contracts

| Purpose | Endpoint | M6 behavior |
| --- | --- | --- |
| Directory | `GET /admin/counselors` | Returns every counselor with stable user ID, name, email, title, specialization, and derived active state. The endpoint has no search, filter, or pagination parameters, so M6 fetches it once and applies client filters and 20-row presentation pages. |
| Profile metadata and status | `PUT /admin/counselors/{counselor_id}/profile` | Writes only `title`, `specialization`, and `active`. Name and email remain read-only. Deactivation is non-destructive but does not reassign or cancel future appointments. |
| Recurring availability | `GET /admin/counseling/availability` | A single bulk request supplies routine-window counts and drawer schedules without N+1 row requests. It is also unpaginated. Inactive rules are excluded from presentation. |
| Add routine rule | `POST /admin/counseling/availability` | Writes counselor ID, PostgreSQL weekday (`0=Sunday`), start/end time, `Asia/Jakarta`, optional effective dates, and active state. |
| Deactivate routine rule | `DELETE /admin/counseling/availability/{rule_id}` | Soft-deactivates a rule. There is no update or atomic schedule-replacement endpoint. |
| Drawer operations | `GET /admin/counseling/calendar/multi` | Loaded only when a drawer opens, filtered to the counselor and bounded to today plus 62 days. It supplies safe appointment metadata and upcoming blocks without notes or request narrative. |

The older counseling calendar endpoint is not used because it returns request context and administrative notes. Organization schedules are not used because they are a separate legacy slot model.

## Directory and drawer

The full-width directory supports name/email search, active-state filtering, and exact free-text specialization filtering over the real response. Specializations are rendered as stored; titles are never inferred from names. The routine column shows the count of active rules from one bulk response. Upcoming-session counts are intentionally absent because the backend has no directory aggregate and M6 does not issue one schedule request per row.

The accessible M1 drawer is approximately 42% of desktop width, becomes narrower below 1024px, and becomes full-screen on phones. The dynamic route opens the same feature and drawer rather than duplicating profile UI. Primary and secondary drawer sources fail independently so unavailable operations do not hide the base profile.

## Routine schedule editing

The editor shows Monday through Sunday in operational order while retaining PostgreSQL `extract(dow)` values. Each day can have multiple windows. Every window keeps optional `effective_from` and `effective_to` fields and always submits `Asia/Jakarta`. The editor validates required times, start before end, effective-date order, duplicates, and same-day overlap. Cross-midnight ranges are rejected.

The API's preliminary overlap query ignores effective-date boundaries even though the database exclusion constraint includes them. M6 therefore rejects same-day time overlap even when effective-date ranges would not overlap, matching the observable API contract.

Saving computes a minimal diff. Unchanged rules remain. Removed or edited rules are deactivated, then new rules are created. This sequence is necessarily non-atomic; a later create failure can leave a partially changed schedule. The UI warns before saving and, on failure, exits the draft, refetches authoritative data, and asks the administrator to review it. A batch replacement endpoint is the correct future fix. Dirty profile or schedule edits require confirmation before closing.

## Status and operational summaries

Active status uses the existing profile mutation and always requires confirmation. The confirmation reports bounded upcoming appointments when available and explains that deactivation does not move or cancel them. It preserves counselor and appointment history. Backend assignment already rejects inactive counselors, but the profile mutation itself does not validate future appointments.

Upcoming sessions show at most five active confirmed/rescheduled appointments from the bounded drawer request. The deactivation warning counts every matching appointment in that bounded response. Upcoming exceptions are concise and link to M5, which remains the operational exception workspace. M6 does not edit exceptions.

## Privacy and accessibility

M6 uses only counselor identity/profile metadata, recurring rules, block metadata, and bounded appointment scheduling metadata. It never requests or displays therapy notes, administrative notes, request context, chat or journal content, guardrail text, or assessment content.

The directory is a semantic table. Every filter and time/date input has a label. Status includes text. Add/remove controls are native buttons. The shared drawer and confirmation dialog retain focus containment, Escape handling, focus restoration, and overlay dismissal. Light/dark themes use existing semantic tokens, and existing reduced-motion rules apply.

## Backend gaps

| Gap | Classification | Recommended change |
| --- | --- | --- |
| Server directory search/filter/pagination | B: API | Add bounded `search`, `active`, `specialization`, `page`, and `page_size` parameters. |
| Paginated availability or directory routine summary | B: API | Add active routine-window counts to the directory or a bounded aggregate. |
| Atomic recurring-schedule replacement | B: API | Add one transactional replace endpoint with full validation and audit events. |
| Effective-date-aware API overlap precheck | B: API | Include effective date-range overlap in the preliminary query to match the database constraint. |
| Safe counselor deactivation policy | B + D | Reject or explicitly return future-appointment impact; define reassignment authorization separately. |
| Counselor name/email mutation | B + D | Add a validated, audited identity endpoint only if administrators should manage those fields. |
| Complete appointment aggregate | B: API | Add a bounded upcoming count/list contract if the directory needs load summaries. |
| Room and virtual resources | C + B + D | Add resources, counselor-resource permission, availability, appointment links, overlap enforcement, and safe read/write contracts. |

Room A, Room B, virtual rooms, utilization charts, workload analytics, and clinical records are deliberately absent.

