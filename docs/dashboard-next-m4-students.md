# Sajiwa Student Management and Detail (M4)

## Scope

M4 replaces only `/students` and `/students/[studentId]`. It adds the real student directory, an on-demand quick-view drawer, and a student detail workspace. Counseling operations, counselor management, analytics, reports, instruments, hotline, and settings remain migration placeholders. No FastAPI, database, RLS, mobile, or legacy Expo dashboard file is changed.

## API usage

| UI purpose | Endpoint | Behavior |
| --- | --- | --- |
| Directory | `GET /admin/students` | True server pagination using `page` and `page_size`; server search over name and NIM; single stable `faculty_id` and `academic_unit_id` filters; backend ordering by registration timestamp descending. |
| Student identity/detail | `GET /admin/users/{studentId}` | Identity, email, NIM, role, registration time, stable faculty/unit IDs, and official labels. The frontend rejects non-student roles for this workspace. |
| Assessment history | `GET /admin/users/{studentId}/assessments` | Server-paginated assessment metadata and backend-derived category scores/severities. Raw questionnaire answers are not returned or rendered. |
| Counseling history | `GET /admin/users/{studentId}/bookings` | Server-paginated legacy booking date, time, and status. No notes or counseling content are requested. |
| Academic filter/edit options | `GET /admin/academic/faculties`, `GET /admin/academic/units` | Stable IDs and faculty/unit relationships. |
| Identity edit | `PUT /accounts/{studentId}` | M4 sends only supported `nama` and `nim` fields. It never sends role. Email is not writable through this contract. |
| Academic edit | `PUT /admin/students/{studentId}/academic-profile` | Saves stable faculty and academic-unit IDs. Frontend validation prevents a unit from another faculty. |

The directory never issues per-row detail calls. Clicking **View** opens the drawer immediately, then requests one profile plus bounded one-record assessment and booking summaries. The full detail page loads one profile and independently paginated assessment and booking sections.

## Directory behavior

Search is debounced and server-side. Although email appears in directory rows, the backend search predicate currently covers only `nama` and `nim`; the UI therefore labels search accurately as name/NIM and does not perform misleading page-local email search.

Faculty and academic unit use stable IDs. Both are single-select because the directory endpoint accepts a single value for each. Unit choices are restricted to the selected faculty, and changing faculty clears an incompatible unit. Page sizes are 25 and 50 with the server-provided total and page values.

The backend has no account-active field or account-status query parameter. M4 omits account-status filtering and status badges instead of inventing lifecycle state. It also retains the endpoint’s registration-descending sort because no sorting parameter exists.

## Quick view and detail

The quick-view drawer keeps directory filters and pagination mounted. It shows identity, academic context, registration time, latest safe assessment summary, latest booking metadata, and explicit unavailable states for unsupported support and last-login data. Structured skeletons and section-specific errors keep failures understandable without closing the drawer.

The full detail route is now the real destination for M2 Overview, M3 Monitoring, and the directory. Its accessible tabs are:

- **Overview:** identity and academic snapshot, latest assessment, latest booking, and the explicit support-information contract gap.
- **Assessments:** paginated instrument/date/category scaled score/backend severity. No answers or frontend clinical recomputation.
- **Counseling:** paginated booking date/time/status only. The current per-student history source does not expose counselor identity, room, platform, requests, or notes.
- **Academic Data:** official faculty/unit IDs and labels plus NIM.

Secondary assessment or counseling failures stay local to their section and do not make the student profile unusable.

## Editing boundaries

M4 exposes two separate save operations inside the edit panel:

1. Administrative identity: name and NIM.
2. Academic identity: faculty and academic unit.

Keeping them separate reflects the two independent backend endpoints and avoids presenting a false atomic transaction. Name is required. An existing NIM cannot be cleared because `PUT /accounts/{id}` uses `coalesce` and therefore cannot persist a null removal; the form explains and blocks that unsupported operation. Email, role, status, password, support information, and destructive actions are not editable.

## Privacy boundary

M4 never requests or renders chat messages, journal entries, raw guardrail triggers, assessment answers, private counseling notes, password material, tokens, OTPs, or unsupported diagnostic conclusions. Assessment presentation uses backend-derived results. The support section says that structured data is unavailable; it does not equate missing data with “none.”

## Responsive and accessible behavior

At 1366px the directory remains a practical full-width table and the quick drawer is capped near 42% of the viewport. Tables scroll horizontally when required. Below 1024px filters use two columns and the drawer narrows responsively; on phones filters become one column and the drawer becomes full-screen.

The existing M1 drawer provides Escape handling, focus containment, overlay dismissal, focus restoration, and an accessible title. Directory inputs use native labels and controls. Detail tabs use `tablist`, `tab`, `tabpanel`, `aria-selected`, and associated IDs. Tables remain semantic, statuses include text, and all new surfaces use semantic theme tokens.

## Backend gaps

| Gap | Classification | Minimal future work |
| --- | --- | --- |
| Email search in directory | B: API | Add email to the parameterized search predicate. |
| Account active/deactivated state and last login | B + optionally C + D | Add explicit fields/event metadata, admin read contract, lifecycle policy, and authorization. |
| Structured reported condition/disability | C + B + D | Add nullable structured fields, consent semantics, field-level authorization, and audit history. |
| Email mutation | B + D | Add validated uniqueness-aware admin mutation with audit logging. |
| Clearing an existing NIM | B | Define explicit nullable-field patch semantics instead of `coalesce`. |
| Atomic identity plus academic update | B | Add a purpose-built transactional student admin mutation if one-form saving is required. |
| Counselor identity on per-student history | B | Extend the safe history response with counselor display identity, without notes/content. |
| New counseling appointment history per student | B | Add a bounded endpoint filtered by `student_id` returning schedule metadata only. |
| Efficient student overview aggregate | B | Add a bounded profile/latest-assessment/latest-counseling response if round trips become material. |
| Account deactivation | B + D, possibly C | Define non-destructive lifecycle state and authorization while preserving historical references. |
