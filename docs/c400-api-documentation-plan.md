# C400 API Documentation Consolidation Plan

## 1. Status and scope

**Plan only — no API routes, request parameters, ReDoc configuration, or client behavior are changed.**

This plan interprets “C400” as the project report/document section where the detailed API specification will be expanded. Its exact institutional template and the lecturer's intended wording still need confirmation.

Source: OpenAPI generated from the registered FastAPI application in `apps/backend/main.py`, inspected on 2026-11-12. Direct access to `http://localhost:8000/openapi.json` failed because that address was not serving the API. The application-generated contract, rather than the short manual endpoint list in `/health`, is the inventory source. The WebSocket route was checked separately in `apps/backend/routes/realtime.py`.

## 2. What “?”, “=”, methods, and “/{id}” mean

| Term | Meaning | Example from this API |
|---|---|---|
| HTTP method | The operation performed at a URL; different methods are different operations. | `GET /journal` reads; `POST /journal` creates. |
| Path parameter | A required value occupying a URL segment. | `PATCH /journal/{journal_id}` |
| Query parameter | A named input after `?`; `=` assigns its value and `&` separates inputs. | See the actual query parameters in the inventory below. |
| Request body | Structured input sent in the request body, not in the URL. | A JSON object on a create/update operation. |
| Documentation group | A report heading collecting related operations; not necessarily a callable URL. | Group `/journal` includes collection, today, and item operations. |

The lecturer may have meant query parameters, but this is not confirmed. **Do not mechanically change `/{id}` into `?id=...`**: that changes the API contract, does not inherently reduce method count, and can break existing callers.

Recommended interpretation: show **one resource-family entry in the C400 overview**, then list every method and subpath inside its expanded detail table. Keep path parameters, query parameters, and bodies in separate columns. A literal segment such as `/today`, `/publish`, or `/approve` is an action/subpath, not a parameter.

## 3. Verified inventory counts

| Measure | Count | Counting rule |
|---|---:|---|
| HTTP operations | 120 | One method + one path template. |
| Distinct HTTP path templates | 105 | Shared paths with multiple methods counted once. |
| GET | 52 | Read operations. |
| POST | 45 | Create/action operations; not all POSTs create rows. |
| PUT | 10 | Existing PUT operations; semantics must be described per handler. |
| PATCH | 8 | Existing PATCH operations. |
| DELETE | 5 | Existing DELETE operations. |
| WebSocket routes | 1 | `/realtime`, outside the OpenAPI HTTP count. |
| Total documented application operations including WebSocket | 121 | 120 HTTP + 1 WebSocket. |
| Proposed HTTP overview groups | 33 | Documentation grouping only; not a new endpoint count. |
| Proposed overview groups including Realtime | 34 | Add one separate WebSocket group. |

Framework documentation routes (`/docs`, `/redoc`, `/openapi.json`, and the Swagger OAuth redirect) are not business API operations and are excluded. Parameter values do not create new endpoints: two different journal IDs still use the same path template.

## 4. Proposed C400 overview

Use the following as the compact overview. Keep child operations under the family rather than making every child a separate overview row. Group names are documentation labels; for example `/auth` itself is not necessarily a callable endpoint.

| Group | HTTP operations | Distinct paths |
|---|---:|---:|
| /assessment | 5 | 5 |
| /notifications | 3 | 3 |
| /guardrail | 2 | 2 |
| /router | 1 | 1 |
| /rag | 1 | 1 |
| /chat | 5 | 5 |
| /auth | 7 | 6 |
| /accounts | 5 | 3 |
| /dashboard | 1 | 1 |
| /jadwal | 4 | 3 |
| /booking | 4 | 4 |
| /journal | 5 | 3 |
| /admin/assessments | 1 | 1 |
| /admin/users | 3 | 3 |
| /admin/attention | 2 | 2 |
| /admin/schedules | 3 | 2 |
| /admin/hotlines | 4 | 2 |
| /admin/analytics | 3 | 3 |
| /admin/academic/faculties | 3 | 2 |
| /admin/academic/units | 3 | 2 |
| /admin/students | 3 | 3 |
| /admin/notifications | 3 | 3 |
| /admin/counseling | 18 | 16 |
| /admin/counselors | 2 | 2 |
| /admin/reports | 2 | 2 |
| /counseling | 4 | 3 |
| /admin/assessment-instruments | 11 | 10 |
| /counselor/instrument-reviews | 5 | 5 |
| /counselor/profile | 1 | 1 |
| /counselor/cases | 2 | 2 |
| /counselor/calendar | 1 | 1 |
| /counselor/exception-requests | 1 | 1 |
| Health | 2 | 2 |
| Realtime (`/realtime`) | — (1 WebSocket) | — |

## 5. Proposed expanded C400 table format

For each family, use one heading and the following operation-level fields. This preserves every endpoint while keeping the overview short.

| Field | Required documentation |
|---|---|
| Resource family and purpose | One shared heading; explain the user-facing function. |
| Method and full path | Keep every actual operation, even when siblings share a family. |
| Path parameters | Name, type, required status, constraints, and example. |
| Query parameters | Name, type, required status, default, allowed values, and example URL. |
| Request body | Media type, schema, fields, validation rules, and safe example. |
| Authentication and authorization | Token requirement, role checks, ownership/case scope; verify handler/dependencies. |
| Responses | Success status/schema/example and actual error statuses. |
| Side effects | Writes, notifications, review transitions, scheduling effects, or audit records. |
| Special behavior | Streaming, pagination, filtering, legacy status, or retry/deduplication rules where applicable. |

The inventory below records current OpenAPI parameter names and body schema names. It is **not yet the expanded final C400 specification**. Types, defaults, response examples, and authorization details are follow-up work in this plan.

## 6. Complete HTTP operation inventory

Every HTTP operation appears exactly once below. The summary is taken from OpenAPI and may be a handler-derived label, not a fully reviewed functional description. “—” means no parameter/body is declared there in the contract, not proof that the handler has no authentication or runtime validation.

### /assessment

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 1 | POST | `/assessment/submit` | Submit Self Assessment | — | application/json: AssessmentRequest |
| 2 | POST | `/assessment/notify-risk` | Send High Risk Notification | — | application/json: NotifyRiskRequest |
| 3 | GET | `/assessment/history` | Get Assessment History | — | — |
| 4 | GET | `/assessment/instrument/active` | Active Instrument | query: code (optional) | — |
| 5 | POST | `/assessment/instrument/submit` | Submit Instrument Assessment | — | application/json: InstrumentSubmission |

### /notifications

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 6 | GET | `/notifications` | Own Notifications | query: unread_only (optional); query: page (optional); query: page_size (optional) | — |
| 7 | PATCH | `/notifications/{notification_id}/read` | Mark Read | path: notification_id (required) | — |
| 8 | POST | `/notifications/mark-all-read` | Mark All Read | — | — |

### /guardrail

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 9 | GET | `/guardrail/hotline` | Get Emergency Hotline | — | — |
| 10 | POST | `/guardrail/check` | Check Safety Guardrail | — | application/json: ChatRequest |

### /router

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 11 | POST | `/router/intent` | Route Semantic Intent | — | application/json: ChatRequest |

### /rag

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 12 | POST | `/rag/context` | Retrieve Rag Context | — | application/json: ChatRequest |

### /chat

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 13 | POST | `/chat/stream` | Stream Chat Response | — | application/json: ChatRequest |
| 14 | POST | `/chat/report` | Report To Team | — | application/json: ReportRequest |
| 15 | POST | `/chat` | Chat Unified | — | application/json: ChatRequest |
| 16 | GET | `/chat/history` | Chat History | query: session_id (required); query: limit (optional) | — |
| 17 | GET | `/chat/sessions` | Chat Sessions | query: limit (optional) | — |

### /auth

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 18 | POST | `/auth/register` | Register | — | application/json: CreateAccountRequest |
| 19 | POST | `/auth/login` | Login | — | application/json: LoginRequest |
| 20 | POST | `/auth/reset-password/request` | Request Password Reset | — | application/json: ResetPasswordRequest |
| 21 | POST | `/auth/reset-password/confirm` | Confirm Password Reset | — | application/json: ConfirmPasswordResetRequest |
| 22 | GET | `/auth/me` | Get My Profile | — | — |
| 23 | GET | `/auth/consent` | Get Privacy Consent | — | — |
| 24 | POST | `/auth/consent` | Accept Privacy Consent | — | — |

### /accounts

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 25 | GET | `/accounts` | Get Account List | — | — |
| 26 | POST | `/accounts` | Create Account | — | application/json: CreateAccountRequest |
| 27 | GET | `/accounts/konselor` | Get Konselor List | — | — |
| 28 | PUT | `/accounts/{user_id}` | Update Account | path: user_id (required) | application/json: UpdateAccountRequest |
| 29 | DELETE | `/accounts/{user_id}` | Delete Account | path: user_id (required) | — |

### /dashboard

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 30 | GET | `/dashboard/data` | Get Dashboard Data | — | — |

### /jadwal

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 31 | GET | `/jadwal` | Lihat Jadwal Tersedia | — | — |
| 32 | POST | `/jadwal` | Buat Jadwal | — | application/json: BuatJadwalRequest |
| 33 | GET | `/jadwal/saya` | Lihat Jadwal Saya | — | — |
| 34 | PATCH | `/jadwal/{counseling_slot_id}` | Update Status Jadwal | path: counseling_slot_id (required) | application/json: UpdateJadwalRequest |

### /booking

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 35 | POST | `/booking` | Buat Booking | — | application/json: BookingRequest |
| 36 | GET | `/booking/saya` | Lihat Booking Saya | — | — |
| 37 | GET | `/booking/masuk` | Lihat Booking Masuk | — | — |
| 38 | PATCH | `/booking/{counseling_booking_id}` | Update Status Booking | path: counseling_booking_id (required) | application/json: UpdateBookingRequest |

### /journal

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 39 | POST | `/journal` | Save Journal | — | application/json: SaveJournalRequest |
| 40 | GET | `/journal` | Get Journals | query: limit (optional); query: offset (optional) | — |
| 41 | GET | `/journal/today` | Get Today Journal | — | — |
| 42 | PATCH | `/journal/{journal_id}` | Update Journal | path: journal_id (required) | application/json: UpdateJournalRequest |
| 43 | DELETE | `/journal/{journal_id}` | Delete Journal | path: journal_id (required) | — |

### /admin/assessments

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 44 | GET | `/admin/assessments` | List Assessments | query: search (optional); query: severity (optional); query: instrument (optional); query: date_from (optional); query: date_to (optional); query: faculty_id (optional); query: academic_unit_id (optional); query: page (optional); query: page_size (optional) | — |

### /admin/users

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 45 | GET | `/admin/users/{user_id}` | User Detail | path: user_id (required) | — |
| 46 | GET | `/admin/users/{user_id}/assessments` | User Assessments | path: user_id (required); query: page (optional); query: page_size (optional) | — |
| 47 | GET | `/admin/users/{user_id}/bookings` | User Bookings | path: user_id (required); query: page (optional); query: page_size (optional) | — |

### /admin/attention

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 48 | GET | `/admin/attention` | Attention Signals | query: signal (optional); query: unread_only (optional); query: faculty_id (optional); query: academic_unit_id (optional); query: page (optional); query: page_size (optional) | — |
| 49 | PATCH | `/admin/attention/{guardrail_log_id}/read` | Mark Attention Read | path: guardrail_log_id (required) | — |

### /admin/schedules

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 50 | GET | `/admin/schedules` | Organization Schedules | query: date_from (optional); query: date_to (optional); query: counselor_id (optional) | — |
| 51 | POST | `/admin/schedules` | Create Organization Schedule | — | application/json: ScheduleCreate |
| 52 | PATCH | `/admin/schedules/{schedule_id}` | Update Organization Schedule | path: schedule_id (required) | application/json: ScheduleUpdate |

### /admin/hotlines

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 53 | GET | `/admin/hotlines` | List Hotlines | — | — |
| 54 | POST | `/admin/hotlines` | Create Hotline | — | application/json: HotlineCreate |
| 55 | PUT | `/admin/hotlines/{hotline_id}` | Update Hotline | path: hotline_id (required) | application/json: HotlineUpdate |
| 56 | DELETE | `/admin/hotlines/{hotline_id}` | Delete Hotline | path: hotline_id (required) | — |

### /admin/analytics

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 57 | GET | `/admin/analytics` | Analytics | query: date_from (optional); query: date_to (optional) | — |
| 58 | GET | `/admin/analytics/scoped` | Scoped Analytics | query: date_from (required); query: date_to (required); query: faculty_id (optional); query: academic_unit_id (optional) | — |
| 59 | GET | `/admin/analytics/comparison` | Comparison Analytics | query: date_from (required); query: date_to (required); query: faculty_id (optional); query: academic_unit_id (optional) | — |

### /admin/academic/faculties

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 60 | GET | `/admin/academic/faculties` | Faculties | query: include_inactive (optional) | — |
| 61 | POST | `/admin/academic/faculties` | Faculty Create | — | application/json: FacultyBody |
| 62 | PUT | `/admin/academic/faculties/{faculty_id}` | Faculty Update | path: faculty_id (required) | application/json: FacultyBody |

### /admin/academic/units

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 63 | GET | `/admin/academic/units` | Units | query: faculty_id (optional); query: include_inactive (optional) | — |
| 64 | POST | `/admin/academic/units` | Unit Create | — | application/json: UnitBody |
| 65 | PUT | `/admin/academic/units/{unit_id}` | Unit Update | path: unit_id (required) | application/json: UnitBody |

### /admin/students

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 66 | PUT | `/admin/students/{student_id}/academic-profile` | Profile Update | path: student_id (required) | application/json: ProfileBody |
| 67 | GET | `/admin/students` | Students | query: search (optional); query: faculty_id (optional); query: academic_unit_id (optional); query: page (optional); query: page_size (optional) | — |
| 68 | PUT | `/admin/students/{student_id}/profile` | Update Student Profile | path: student_id (required) | application/json: StudentProfileUpdate |

### /admin/notifications

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 69 | GET | `/admin/notifications` | Notifications | query: category (optional); query: unread_only (optional); query: page (optional); query: page_size (optional) | — |
| 70 | PATCH | `/admin/notifications/{admin_notification_id}/read` | Notification Read | path: admin_notification_id (required) | — |
| 71 | POST | `/admin/notifications/mark-all-read` | Notifications Read | — | — |

### /admin/counseling

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 72 | GET | `/admin/counseling/requests` | Requests | query: status (optional); query: page (optional); query: page_size (optional) | — |
| 73 | POST | `/admin/counseling/requests/{request_id}/assign` | Assign | path: request_id (required) | application/json: AppointmentBody |
| 74 | GET | `/admin/counseling/calendar` | Calendar | query: date_from (required); query: date_to (required); query: counselor_id (optional); query: status (optional) | — |
| 75 | GET | `/admin/counseling/availability` | Availability | query: counselor_id (optional) | — |
| 76 | POST | `/admin/counseling/availability` | Availability Create | — | application/json: AvailabilityBody |
| 77 | POST | `/admin/counseling/blocked-periods` | Block Create | — | application/json: BlockBody |
| 78 | POST | `/admin/counseling/notes` | Note Create | — | application/json: NoteBody |
| 79 | PATCH | `/admin/counseling/appointments/{counseling_appointment_id}` | Appointment Update | path: counseling_appointment_id (required) | application/json: AppointmentPatch |
| 80 | DELETE | `/admin/counseling/availability/{rule_id}` | Availability Deactivate | path: rule_id (required) | — |
| 81 | DELETE | `/admin/counseling/blocked-periods/{block_id}` | Block Delete | path: block_id (required) | — |
| 82 | GET | `/admin/counseling/calendar/multi` | Multi Counselor Calendar | query: date_from (required); query: date_to (required); query: counselor_id (optional) | — |
| 83 | GET | `/admin/counseling/resources` | Resources | — | — |
| 84 | POST | `/admin/counseling/resources` | Create Resource | — | application/json: ResourceBody |
| 85 | POST | `/admin/counseling/resources/{counseling_resource_id}/blocks` | Block Resource | path: counseling_resource_id (required) | application/json: ResourceBlock |
| 86 | PUT | `/admin/counseling/counselors/{counselor_id}/availability` | Replace Availability | path: counselor_id (required) | application/json: ReplaceAvailability |
| 87 | GET | `/admin/counseling/exception-requests` | Exception Queue | query: status (optional); query: counselor_id (optional) | — |
| 88 | POST | `/admin/counseling/exception-requests/{exception_request_id}/approve` | Approve Exception | path: exception_request_id (required) | application/json: DecisionBody |
| 89 | POST | `/admin/counseling/exception-requests/{exception_request_id}/reject` | Reject Exception | path: exception_request_id (required) | application/json: DecisionBody |

### /admin/counselors

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 90 | GET | `/admin/counselors` | Counselors | — | — |
| 91 | PUT | `/admin/counselors/{counselor_id}/profile` | Counselor Update | path: counselor_id (required) | application/json: CounselorBody |

### /admin/reports

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 92 | POST | `/admin/reports/audits` | Audit Create | — | application/json: AuditBody |
| 93 | GET | `/admin/reports/data` | Report Data | query: date_from (required); query: date_to (required); query: mode (optional); query: faculty_id (optional); query: academic_unit_id (optional) | — |

### /counseling

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 94 | GET | `/counseling/slots` | Open Slots | query: counselor_id (required); query: date_from (required); query: date_to (required) | — |
| 95 | GET | `/counseling/requests` | Own Requests | — | — |
| 96 | POST | `/counseling/requests` | Request Create | — | application/json: RequestBody |
| 97 | GET | `/counseling/appointments` | Own Appointments | — | — |

### /admin/assessment-instruments

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 98 | GET | `/admin/assessment-instruments` | List Instruments | — | — |
| 99 | POST | `/admin/assessment-instruments` | Create Custom Instrument | — | application/json: InstrumentCreate |
| 100 | GET | `/admin/assessment-instruments/versions/{version_id}` | Get Instrument Version | path: version_id (required) | — |
| 101 | POST | `/admin/assessment-instruments/{instrument_id}/drafts` | Create Instrument Draft | path: instrument_id (required) | — |
| 102 | POST | `/admin/assessment-instruments/{instrument_id}/derived` | Create Derived Instrument | path: instrument_id (required) | application/json: DerivedInstrumentRequest |
| 103 | POST | `/admin/assessment-instruments/dass21-variants` | Create Dass21 Variant | — | application/json: Dass21VariantRequest |
| 104 | PUT | `/admin/assessment-instruments/{instrument_id}/shown-in-app` | Show Instrument In App | path: instrument_id (required) | — |
| 105 | PUT | `/admin/assessment-instruments/versions/{version_id}/draft` | Save Instrument Draft | path: version_id (required) | application/json: DraftDefinition |
| 106 | POST | `/admin/assessment-instruments/versions/{version_id}/validate` | Validate Instrument Version | path: version_id (required) | — |
| 107 | POST | `/admin/assessment-instruments/versions/{version_id}/publish` | Publish Instrument Version | path: version_id (required) | — |
| 108 | POST | `/admin/assessment-instruments/versions/{version_id}/submit-review` | Submit Review | path: version_id (required); query: expected_revision (required) | — |

### /counselor/instrument-reviews

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 109 | GET | `/counselor/instrument-reviews` | Review Queue | query: status (optional) | — |
| 110 | GET | `/counselor/instrument-reviews/{assessment_version_review_id}` | Review Detail | path: assessment_version_review_id (required) | — |
| 111 | POST | `/counselor/instrument-reviews/{assessment_version_review_id}/comments` | Add Review Comment | path: assessment_version_review_id (required) | application/json: ReviewComment |
| 112 | POST | `/counselor/instrument-reviews/{assessment_version_review_id}/request-revision` | Request Revision | path: assessment_version_review_id (required) | application/json: Decision |
| 113 | POST | `/counselor/instrument-reviews/{assessment_version_review_id}/approve` | Approve | path: assessment_version_review_id (required) | application/json: Decision |

### /counselor/profile

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 114 | GET | `/counselor/profile` | Profile | — | — |

### /counselor/cases

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 115 | GET | `/counselor/cases` | Cases | — | — |
| 116 | GET | `/counselor/cases/{student_id}` | Case Detail | path: student_id (required) | — |

### /counselor/calendar

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 117 | GET | `/counselor/calendar` | Calendar | query: date_from (required); query: date_to (required) | — |

### /counselor/exception-requests

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 118 | POST | `/counselor/exception-requests` | Request Exception | — | application/json: ExceptionBody |

### Health

| No. | Method | Full path | Current summary / function label | Parameters (location and required status) | Request body |
|---:|---|---|---|---|---|
| 119 | GET | `/` | Root | — | — |
| 120 | GET | `/health` | Health | — | — |

## 7. WebSocket inventory

| No. | Transport | Path | Function | Follow-up documentation |
|---:|---|---|---|---|
| 121 | WebSocket | `/realtime` | Dashboard change notifications. | Inspect connection authentication, permitted roles, message payloads, disconnect behavior, and reconnect expectations in `routes/realtime.py`. |

WebSockets are not represented as normal HTTP operations in FastAPI OpenAPI/ReDoc; document this separately rather than inventing a GET endpoint.

## 8. Implementation plan after approval

### Phase A — Confirm report interpretation

- Confirm whether the lecturer wants a compact report only, a compact local ReDoc navigation, or an actual API redesign.
- Recommended default: documentation grouping only, with **no route changes**.
- Confirm the C400 template, language, required table headings, and whether legacy/internal routes belong in an appendix. Do not omit them from the complete inventory.
- Approve the family grouping above; the large admin counseling and instrument families can use nested detail headings without multiplying overview entries.

### Phase B — Expand C400 documentation

- Reuse the existing generated OpenAPI contract as the source of truth.
- Inspect route handlers, Pydantic request/response models, authentication dependencies, and relevant tests before describing behavior.
- Expand each family using the table format in §5; include every method and subpath shown in §6.
- Put `{id}` values in the **path parameter** field, existing filters in **query parameters**, and payload fields in **request body**.
- Include a real example URL using existing query parameters where relevant; do not invent supported filters.
- Mark legacy slot/booking APIs separately while retaining their definitions.
- Provide scrubbed examples only: no real student data, passwords, tokens, clinical content, or private journal/chat text.

### Phase C — Simplify local ReDoc organization, if requested

- Review current OpenAPI tags; replace implementation-era headings such as iteration labels with approved resource families.
- Prefer ordinary OpenAPI tags and descriptions first. Evaluate ReDoc tag-group support only if nested navigation is still necessary.
- Keep every operation in OpenAPI; do not use `include_in_schema=False` merely to reduce visible entries.
- ReDoc still renders separate HTTP operations: grouping them does **not** turn several operations into one.
- Put the one-row-per-family summary in the API introduction/report; keep expanded operations beneath their groups.
- Do not replace multiple routes with an artificial query dispatcher such as `?action=approve`.

### Phase D — Verify and review

- Before changing documentation-generation behavior, follow the repository TDD convention and add the smallest relevant failing contract test.
- Compare operation sets before and after: all 120 HTTP method/path pairs must remain unchanged unless a separately approved API change explains the difference.
- Check path/query parameter locations, names, types, defaults, bodies, and response schemas against the existing contract.
- Check role/ownership descriptions against handler dependencies and tests, not tags alone.
- Verify ReDoc renders, navigation is understandable, and no operation disappeared or was duplicated.
- Review exported C400/DOCX tables for wrapping and readability; split wide tables by family or operation when necessary.
- Recount the inventory if the application changes before implementation.

## 9. Expected files and impact

| Area | Planned work | Runtime impact |
|---|---|---|
| This plan | Inventory and approval checklist. | None. |
| C400 document (location to confirm) | Compact overview plus expanded family specifications. | None. |
| `apps/backend/main.py` | Only if approved: OpenAPI description/tag metadata. | Documentation presentation only. |
| `apps/backend/routes/*.py` | Only if approved: tags, summaries, descriptions, examples. Preserve methods and paths. | Must not change routing/auth/business behavior. |
| Existing backend contract tests | Verify the operation set and documentation metadata when implementation begins. | Test-only. |
| Mobile, shared API client, separate dashboard repository | No caller changes for documentation-only grouping. Review all if route redesign is separately requested. | None under the recommended plan. |

No new Postman collection, published documentation site, dependency, database migration, or routing abstraction is needed for this plan.

## 10. Approval checklist

- [ ] Confirm “C400” document location/template.
- [ ] Confirm the lecturer meant documentation grouping rather than replacing path parameters with query parameters.
- [ ] Approve the overview families and full operation inventory.
- [ ] Decide whether local ReDoc organization is in scope in addition to the report.
- [ ] Approve implementation only after reviewing this plan.

## 11. Verification limits and risks

The counts come from the current application's generated OpenAPI, not a reachable live localhost deployment. One WebSocket was inventoried from source. No business endpoint was exercised, and ReDoc/DOCX layout was not rendered. Operation summaries and schema names are inventory data, not a substitute for reviewing each handler during C400 expansion.

Changing real routes merely to shorten documentation would risk breaking mobile/dashboard clients. The proposed plan avoids that risk by consolidating **presentation**, not API behavior.
