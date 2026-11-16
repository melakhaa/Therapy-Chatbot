# Sajiwa API Specification (C400)

Generated from the application-generated OpenAPI contract on 2026-11-13. This document describes the API as it exists; it does not change routes, parameters, or behavior.

**Status:** draft for C400 review. The report template, wording, and final section location are still to be confirmed by the lecturer.

## 1. Scope and source

The source of truth is the OpenAPI document produced by the FastAPI application registered in `apps/backend/main.py`. The WebSocket route is described from `apps/backend/routes/realtime.py`, because OpenAPI does not represent WebSockets as HTTP operations.

Framework documentation routes (`/docs`, `/redoc`, `/openapi.json`) are not business operations and are excluded.

## 2. Inventory summary

| Measure | Count | Counting rule |
|---|---:|---|
| HTTP operations | 120 | One method + one path template. |
| Distinct path templates | 105 | Shared paths with several methods counted once. |
| GET | 52 | Read operations. |
| POST | 45 | Write or action operations. |
| PUT | 10 | Write or action operations. |
| PATCH | 8 | Write or action operations. |
| DELETE | 5 | Write or action operations. |
| WebSocket routes | 1 | `/realtime`, outside the OpenAPI HTTP count. |
| Total application operations | 121 | HTTP operations plus the WebSocket. |
| Documentation groups | 34 | Report/ReDoc navigation groups, not endpoints. |

## 3. Reading the specification

| Term | Meaning |
|---|---|
| HTTP method | The operation performed at a URL. Different methods at one path are different operations. |
| Path parameter | A required value occupying a URL segment, written `{name}`. It is part of the address, not a query input. |
| Query parameter | A named input after `?`, assigned with `=` and separated with `&`. Optional unless marked required. |
| Request body | Structured JSON input sent in the body of a create/update request. |
| Documentation group | A report/ReDoc heading collecting related operations. It is not necessarily a callable URL. |

**Authentication.** Protected operations expect `Authorization: Bearer <token>`. The token is a JWT; the role is resolved from the database on every request, never from the token alone. Roles are `mahasiswa`, `konselor`, `admin`, and `pemangku_jabatan`.

**Validation errors.** Any operation with a declared body or parameter can answer `422 Unprocessable Entity` from FastAPI's request validation, in addition to the statuses listed per operation.

**Response bodies.** The handlers do not declare `response_model`s, so success responses are JSON objects produced by each handler rather than a fixed, documented schema. This specification records the status codes, inputs, and side effects; the response fields are part of the handler code.

## 4. Resource families

The overview keeps one row per resource family. Every method and subpath is expanded in section 5, so the overview stays short without hiding operations.

| No. | Group | HTTP operations | Distinct paths | Purpose |
|---:|---|---:|---:|---|
| 1 | Assessment | 5 | 5 | Asesmen mandiri, riwayat, dan instrumen aktif. |
| 2 | Notifications | 3 | 3 | Notifikasi milik pengguna yang sedang masuk. |
| 3 | Guardrail | 2 | 2 | Deteksi krisis dan daftar hotline darurat. |
| 4 | Intent Router | 1 | 1 | Klasifikasi intent percakapan. |
| 5 | RAG | 1 | 1 | Pengambilan konteks dari basis pengetahuan. |
| 6 | Chat | 5 | 5 | Percakapan, streaming, riwayat, dan eskalasi ke tim. |
| 7 | Auth | 7 | 6 | Registrasi, sesi, reset kata sandi, dan persetujuan privasi. |
| 8 | Accounts | 5 | 3 | Manajemen akun oleh admin. |
| 9 | Dashboard | 1 | 1 | Data ringkasan dashboard. |
| 10 | Jadwal (legacy) | 4 | 3 | Slot konsultasi lama; dipertahankan untuk kompatibilitas. |
| 11 | Booking (legacy) | 4 | 4 | Pemesanan slot lama; dipertahankan untuk kompatibilitas. |
| 12 | Journal | 5 | 3 | Jurnal harian milik mahasiswa. |
| 13 | Admin: Assessments | 1 | 1 | Penelusuran asesmen lintas mahasiswa. |
| 14 | Admin: Users | 3 | 3 | Detail pengguna dan riwayatnya. |
| 15 | Admin: Attention | 2 | 2 | Sinyal perhatian dari guardrail. |
| 16 | Admin: Schedules | 3 | 2 | Jadwal organisasi konselor. |
| 17 | Admin: Hotlines | 4 | 2 | Daftar hotline darurat. |
| 18 | Admin: Analytics | 3 | 3 | Analitik agregat, ter-scope, dan perbandingan. |
| 19 | Admin: Faculties | 3 | 2 | Data fakultas. |
| 20 | Admin: Academic Units | 3 | 2 | Data program studi. |
| 21 | Admin: Students | 3 | 3 | Direktori dan profil akademik mahasiswa. |
| 22 | Admin: Notifications | 3 | 3 | Kotak masuk notifikasi admin. |
| 23 | Admin: Counseling | 18 | 16 | Permintaan, penjadwalan, sumber daya, dan pengecualian konseling. |
| 24 | Admin: Counselors | 2 | 2 | Daftar dan profil konselor. |
| 25 | Admin: Reports | 2 | 2 | Data laporan dan catatan audit. |
| 26 | Counseling | 4 | 3 | Permintaan konseling dan janji temu milik mahasiswa. |
| 27 | Admin: Assessment Instruments | 11 | 10 | Penulisan, validasi, dan publikasi instrumen. |
| 28 | Counselor: Instrument Reviews | 5 | 5 | Antrean dan keputusan review instrumen. |
| 29 | Counselor: Profile | 1 | 1 | Profil konselor. |
| 30 | Counselor: Cases | 2 | 2 | Kasus mahasiswa yang ditangani. |
| 31 | Counselor: Calendar | 1 | 1 | Kalender konselor. |
| 32 | Counselor: Exception Requests | 1 | 1 | Permintaan pengecualian jadwal. |
| 33 | Health | 2 | 2 | Status layanan. |
| 34 | Realtime (`/realtime`) | — (1 WebSocket) | — | Push notification of changed dashboard data. |

### 4.1 Endpoint per family

Each overview row above expands to these endpoints. A path with two methods counts as two operations. The function is the handler's declared summary.

| Family | Endpoint | Fungsi |
|---|---|---|
| Assessment | `GET /assessment/history` | Get Assessment History |
| Assessment | `GET /assessment/instrument/active` | Active Instrument |
| Assessment | `POST /assessment/instrument/submit` | Submit Instrument Assessment |
| Assessment | `POST /assessment/notify-risk` | Send High Risk Notification |
| Assessment | `POST /assessment/submit` | Submit Self Assessment |
| Notifications | `GET /notifications` | Own Notifications |
| Notifications | `POST /notifications/mark-all-read` | Mark All Read |
| Notifications | `PATCH /notifications/{notification_id}/read` | Mark Read |
| Guardrail | `POST /guardrail/check` | Check Safety Guardrail |
| Guardrail | `GET /guardrail/hotline` | Get Emergency Hotline |
| Intent Router | `POST /router/intent` | Route Semantic Intent |
| RAG | `POST /rag/context` | Retrieve Rag Context |
| Chat | `POST /chat` | Chat Unified |
| Chat | `GET /chat/history` | Chat History |
| Chat | `POST /chat/report` | Report To Team |
| Chat | `GET /chat/sessions` | Chat Sessions |
| Chat | `POST /chat/stream` | Stream Chat Response |
| Auth | `GET /auth/consent` | Get Privacy Consent |
| Auth | `POST /auth/consent` | Accept Privacy Consent |
| Auth | `POST /auth/login` | Login |
| Auth | `GET /auth/me` | Get My Profile |
| Auth | `POST /auth/register` | Register |
| Auth | `POST /auth/reset-password/confirm` | Confirm Password Reset |
| Auth | `POST /auth/reset-password/request` | Request Password Reset |
| Accounts | `GET /accounts` | Get Account List |
| Accounts | `POST /accounts` | Create Account |
| Accounts | `GET /accounts/konselor` | Get Konselor List |
| Accounts | `PUT /accounts/{user_id}` | Update Account |
| Accounts | `DELETE /accounts/{user_id}` | Delete Account |
| Dashboard | `GET /dashboard/data` | Get Dashboard Data |
| Jadwal (legacy) | `GET /jadwal` | Lihat Jadwal Tersedia |
| Jadwal (legacy) | `POST /jadwal` | Buat Jadwal |
| Jadwal (legacy) | `GET /jadwal/saya` | Lihat Jadwal Saya |
| Jadwal (legacy) | `PATCH /jadwal/{counseling_slot_id}` | Update Status Jadwal |
| Booking (legacy) | `POST /booking` | Buat Booking |
| Booking (legacy) | `GET /booking/masuk` | Lihat Booking Masuk |
| Booking (legacy) | `GET /booking/saya` | Lihat Booking Saya |
| Booking (legacy) | `PATCH /booking/{counseling_booking_id}` | Update Status Booking |
| Journal | `GET /journal` | Get Journals |
| Journal | `POST /journal` | Save Journal |
| Journal | `GET /journal/today` | Get Today Journal |
| Journal | `PATCH /journal/{journal_id}` | Update Journal |
| Journal | `DELETE /journal/{journal_id}` | Delete Journal |
| Admin: Assessments | `GET /admin/assessments` | List Assessments |
| Admin: Users | `GET /admin/users/{user_id}` | User Detail |
| Admin: Users | `GET /admin/users/{user_id}/assessments` | User Assessments |
| Admin: Users | `GET /admin/users/{user_id}/bookings` | User Bookings |
| Admin: Attention | `GET /admin/attention` | Attention Signals |
| Admin: Attention | `PATCH /admin/attention/{guardrail_log_id}/read` | Mark Attention Read |
| Admin: Schedules | `GET /admin/schedules` | Organization Schedules |
| Admin: Schedules | `POST /admin/schedules` | Create Organization Schedule |
| Admin: Schedules | `PATCH /admin/schedules/{schedule_id}` | Update Organization Schedule |
| Admin: Hotlines | `GET /admin/hotlines` | List Hotlines |
| Admin: Hotlines | `POST /admin/hotlines` | Create Hotline |
| Admin: Hotlines | `PUT /admin/hotlines/{hotline_id}` | Update Hotline |
| Admin: Hotlines | `DELETE /admin/hotlines/{hotline_id}` | Delete Hotline |
| Admin: Analytics | `GET /admin/analytics` | Analytics |
| Admin: Analytics | `GET /admin/analytics/comparison` | Comparison Analytics |
| Admin: Analytics | `GET /admin/analytics/scoped` | Scoped Analytics |
| Admin: Faculties | `GET /admin/academic/faculties` | Faculties |
| Admin: Faculties | `POST /admin/academic/faculties` | Faculty Create |
| Admin: Faculties | `PUT /admin/academic/faculties/{faculty_id}` | Faculty Update |
| Admin: Academic Units | `GET /admin/academic/units` | Units |
| Admin: Academic Units | `POST /admin/academic/units` | Unit Create |
| Admin: Academic Units | `PUT /admin/academic/units/{unit_id}` | Unit Update |
| Admin: Students | `GET /admin/students` | Students |
| Admin: Students | `PUT /admin/students/{student_id}/academic-profile` | Profile Update |
| Admin: Students | `PUT /admin/students/{student_id}/profile` | Update Student Profile |
| Admin: Notifications | `GET /admin/notifications` | Notifications |
| Admin: Notifications | `POST /admin/notifications/mark-all-read` | Notifications Read |
| Admin: Notifications | `PATCH /admin/notifications/{admin_notification_id}/read` | Notification Read |
| Admin: Counseling | `PATCH /admin/counseling/appointments/{counseling_appointment_id}` | Appointment Update |
| Admin: Counseling | `GET /admin/counseling/availability` | Availability |
| Admin: Counseling | `POST /admin/counseling/availability` | Availability Create |
| Admin: Counseling | `DELETE /admin/counseling/availability/{rule_id}` | Availability Deactivate |
| Admin: Counseling | `POST /admin/counseling/blocked-periods` | Block Create |
| Admin: Counseling | `DELETE /admin/counseling/blocked-periods/{block_id}` | Block Delete |
| Admin: Counseling | `GET /admin/counseling/calendar` | Calendar |
| Admin: Counseling | `GET /admin/counseling/calendar/multi` | Multi Counselor Calendar |
| Admin: Counseling | `PUT /admin/counseling/counselors/{counselor_id}/availability` | Replace Availability |
| Admin: Counseling | `GET /admin/counseling/exception-requests` | Exception Queue |
| Admin: Counseling | `POST /admin/counseling/exception-requests/{exception_request_id}/approve` | Approve Exception |
| Admin: Counseling | `POST /admin/counseling/exception-requests/{exception_request_id}/reject` | Reject Exception |
| Admin: Counseling | `POST /admin/counseling/notes` | Note Create |
| Admin: Counseling | `GET /admin/counseling/requests` | Requests |
| Admin: Counseling | `POST /admin/counseling/requests/{request_id}/assign` | Assign |
| Admin: Counseling | `GET /admin/counseling/resources` | Resources |
| Admin: Counseling | `POST /admin/counseling/resources` | Create Resource |
| Admin: Counseling | `POST /admin/counseling/resources/{counseling_resource_id}/blocks` | Block Resource |
| Admin: Counselors | `GET /admin/counselors` | Counselors |
| Admin: Counselors | `PUT /admin/counselors/{counselor_id}/profile` | Counselor Update |
| Admin: Reports | `POST /admin/reports/audits` | Audit Create |
| Admin: Reports | `GET /admin/reports/data` | Report Data |
| Counseling | `GET /counseling/appointments` | Own Appointments |
| Counseling | `GET /counseling/requests` | Own Requests |
| Counseling | `POST /counseling/requests` | Request Create |
| Counseling | `GET /counseling/slots` | Open Slots |
| Admin: Assessment Instruments | `GET /admin/assessment-instruments` | List Instruments |
| Admin: Assessment Instruments | `POST /admin/assessment-instruments` | Create Custom Instrument |
| Admin: Assessment Instruments | `POST /admin/assessment-instruments/dass21-variants` | Create Dass21 Variant |
| Admin: Assessment Instruments | `GET /admin/assessment-instruments/versions/{version_id}` | Get Instrument Version |
| Admin: Assessment Instruments | `PUT /admin/assessment-instruments/versions/{version_id}/draft` | Save Instrument Draft |
| Admin: Assessment Instruments | `POST /admin/assessment-instruments/versions/{version_id}/publish` | Publish Instrument Version |
| Admin: Assessment Instruments | `POST /admin/assessment-instruments/versions/{version_id}/submit-review` | Submit Review |
| Admin: Assessment Instruments | `POST /admin/assessment-instruments/versions/{version_id}/validate` | Validate Instrument Version |
| Admin: Assessment Instruments | `POST /admin/assessment-instruments/{instrument_id}/derived` | Create Derived Instrument |
| Admin: Assessment Instruments | `POST /admin/assessment-instruments/{instrument_id}/drafts` | Create Instrument Draft |
| Admin: Assessment Instruments | `PUT /admin/assessment-instruments/{instrument_id}/shown-in-app` | Show Instrument In App |
| Counselor: Instrument Reviews | `GET /counselor/instrument-reviews` | Review Queue |
| Counselor: Instrument Reviews | `GET /counselor/instrument-reviews/{assessment_version_review_id}` | Review Detail |
| Counselor: Instrument Reviews | `POST /counselor/instrument-reviews/{assessment_version_review_id}/approve` | Approve |
| Counselor: Instrument Reviews | `POST /counselor/instrument-reviews/{assessment_version_review_id}/comments` | Add Review Comment |
| Counselor: Instrument Reviews | `POST /counselor/instrument-reviews/{assessment_version_review_id}/request-revision` | Request Revision |
| Counselor: Profile | `GET /counselor/profile` | Profile |
| Counselor: Cases | `GET /counselor/cases` | Cases |
| Counselor: Cases | `GET /counselor/cases/{student_id}` | Case Detail |
| Counselor: Calendar | `GET /counselor/calendar` | Calendar |
| Counselor: Exception Requests | `POST /counselor/exception-requests` | Request Exception |
| Health | `GET /` | Root |
| Health | `GET /health` | Health |
| Realtime | `WS /realtime` | Push notification of changed dashboard data. |

## 5. Operations by family

Each operation lists the fields the C400 template requires. `—` means the contract declares nothing for that field, not that the handler does no validation.

### Assessment

Asesmen mandiri, riwayat, dan instrumen aktif.

#### 1. GET `/assessment/history`

**Get Assessment History**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Read-only. |

#### 2. GET `/assessment/instrument/active`

**Active Instrument**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | `code` (string or null, optional) |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401 |
| Example URL | `GET /assessment/instrument/active?code=<code>` |
| Side effects and notes | Read-only. The instrument the app shows (no `code`), or a specific one by code. |

#### 3. POST `/assessment/instrument/submit`

**Submit Instrument Assessment**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role mahasiswa. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `InstrumentSubmission` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 409 (Conflict), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `assessments`, `assessment_category_results`, `guardrail_logs`. Submit immutable identifiers; all option scores are resolved on the server. |

#### 4. POST `/assessment/notify-risk`

**Send High Risk Notification**

| Field | Detail |
|---|---|
| Authentication and authorization | Public — no token required. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `NotifyRiskRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | 422 validation only |
| Side effects and notes | — |

#### 5. POST `/assessment/submit`

**Submit Self Assessment**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `AssessmentRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 500 (Internal Server Error); dependency errors: 401 |
| Side effects and notes | Writes to `assessments`. |

### Notifications

Notifikasi milik pengguna yang sedang masuk.

#### 6. GET `/notifications`

**Own Notifications**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | `unread_only` (boolean, optional; default `False`); `page` (integer, optional; default `1`; ≥ 1); `page_size` (integer, optional; default `30`; ≥ 1; ≤ 100) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Example URL | `GET /notifications?unread_only=false&page=1` |
| Side effects and notes | Read-only. |

#### 7. POST `/notifications/mark-all-read`

**Mark All Read**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Writes to `notifications`. |

#### 8. PATCH `/notifications/{notification_id}/read`

**Mark Read**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | `notification_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401 |
| Side effects and notes | Writes to `notifications`. |

### Guardrail

Deteksi krisis dan daftar hotline darurat.

#### 9. POST `/guardrail/check`

**Check Safety Guardrail**

| Field | Detail |
|---|---|
| Authentication and authorization | Public — no token required. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `ChatRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | 422 validation only |
| Side effects and notes | — |

#### 10. GET `/guardrail/hotline`

**Get Emergency Hotline**

| Field | Detail |
|---|---|
| Authentication and authorization | Public — no token required. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | 422 validation only |
| Side effects and notes | Read-only. |

### Intent Router

Klasifikasi intent percakapan.

#### 11. POST `/router/intent`

**Route Semantic Intent**

| Field | Detail |
|---|---|
| Authentication and authorization | Public — no token required. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `ChatRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | 422 validation only |
| Side effects and notes | — |

### RAG

Pengambilan konteks dari basis pengetahuan.

#### 12. POST `/rag/context`

**Retrieve Rag Context**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `ChatRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | — |

### Chat

Percakapan, streaming, riwayat, dan eskalasi ke tim.

#### 13. POST `/chat`

**Chat Unified**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `ChatRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | — |

#### 14. GET `/chat/history`

**Chat History**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | `session_id` (string, required); `limit` (integer, optional; default `50`) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Example URL | `GET /chat/history?session_id=<session_id>` |
| Side effects and notes | Read-only. The caller's own transcript. |

#### 15. POST `/chat/report`

**Report To Team**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `ReportRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Writes to `guardrail_logs`. User tapped "Kabari tim Sajiwa" in the crisis sheet. |

#### 16. GET `/chat/sessions`

**Chat Sessions**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | `limit` (integer, optional; default `30`) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Example URL | `GET /chat/sessions?limit=30` |
| Side effects and notes | Read-only. The caller's own conversations, most recently active first, for the history drawer. |

#### 17. POST `/chat/stream`

**Stream Chat Response**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `ChatRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Real SSE: tokens as the model produces them. Streams the response body. |

### Auth

Registrasi, sesi, reset kata sandi, dan persetujuan privasi.

#### 18. GET `/auth/consent`

**Get Privacy Consent**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Read-only. When this account accepted the privacy walkthrough, or null: the app shows it once per account. |

#### 19. POST `/auth/consent`

**Accept Privacy Consent**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Writes to `privacy_consents`. |

#### 20. POST `/auth/login`

**Login**

| Field | Detail |
|---|---|
| Authentication and authorization | Public — no token required. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `LoginRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | 422 validation only |
| Side effects and notes | — |

#### 21. GET `/auth/me`

**Get My Profile**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401 |
| Side effects and notes | Read-only. |

#### 22. POST `/auth/register`

**Register**

| Field | Detail |
|---|---|
| Authentication and authorization | Public — no token required. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `CreateAccountRequest` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 400 (Bad Request) |
| Side effects and notes | Writes to `users`. |

#### 23. POST `/auth/reset-password/confirm`

**Confirm Password Reset**

| Field | Detail |
|---|---|
| Authentication and authorization | Public — no token required. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `ConfirmPasswordResetRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 400 (Bad Request) |
| Side effects and notes | Writes to `password_resets`. |

#### 24. POST `/auth/reset-password/request`

**Request Password Reset**

| Field | Detail |
|---|---|
| Authentication and authorization | Public — no token required. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `ResetPasswordRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | 422 validation only |
| Side effects and notes | Writes to `password_resets`, `set`. Schedules background work after responding. |

### Accounts

Manajemen akun oleh admin.

#### 25. GET `/accounts`

**Get Account List**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin or pemangku_jabatan. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 500 (Internal Server Error); dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

#### 26. POST `/accounts`

**Create Account**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin or pemangku_jabatan. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `CreateAccountRequest` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 400 (Bad Request); dependency errors: 401, 403 |
| Side effects and notes | Writes to `users`. |

#### 27. GET `/accounts/konselor`

**Get Konselor List**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Read-only. Counselor directory for the booking screen (public fields only, via list_konselor()). |

#### 28. PUT `/accounts/{user_id}`

**Update Account**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin or pemangku_jabatan. |
| Path parameters | `user_id` (string, required) |
| Query parameters | — |
| Request body | `application/json` — schema `UpdateAccountRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 400 (Bad Request), 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Writes to `users`. |

#### 29. DELETE `/accounts/{user_id}`

**Delete Account**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin or pemangku_jabatan. |
| Path parameters | `user_id` (string, required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 400 (Bad Request), 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Writes to `users`. |

### Dashboard

Data ringkasan dashboard.

#### 30. GET `/dashboard/data`

**Get Dashboard Data**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor or admin or pemangku_jabatan. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 500 (Internal Server Error); dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

### Jadwal (legacy)

Slot konsultasi lama; dipertahankan untuk kompatibilitas.

#### 31. GET `/jadwal`

**Lihat Jadwal Tersedia**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Read-only. |

#### 32. POST `/jadwal`

**Buat Jadwal**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor or admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `BuatJadwalRequest` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 500 (Internal Server Error); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counseling_slots`. |

#### 33. GET `/jadwal/saya`

**Lihat Jadwal Saya**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor or admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

#### 34. PATCH `/jadwal/{counseling_slot_id}`

**Update Status Jadwal**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor or admin. |
| Path parameters | `counseling_slot_id` (string, required) |
| Query parameters | — |
| Request body | `application/json` — schema `UpdateJadwalRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counseling_slots`. |

### Booking (legacy)

Pemesanan slot lama; dipertahankan untuk kompatibilitas.

#### 35. POST `/booking`

**Buat Booking**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `BookingRequest` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 404 (Not Found), 409 (Conflict), 500 (Internal Server Error); dependency errors: 401 |
| Side effects and notes | Writes to `counseling_bookings`. |

#### 36. GET `/booking/masuk`

**Lihat Booking Masuk**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor or admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

#### 37. GET `/booking/saya`

**Lihat Booking Saya**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Read-only. |

#### 38. PATCH `/booking/{counseling_booking_id}`

**Update Status Booking**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | `counseling_booking_id` (string, required) |
| Query parameters | — |
| Request body | `application/json` — schema `UpdateBookingRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401 |
| Side effects and notes | Writes to `counseling_bookings`. |

### Journal

Jurnal harian milik mahasiswa.

#### 39. GET `/journal`

**Get Journals**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | `limit` (integer, optional; default `20`); `offset` (integer, optional; default `0`) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Example URL | `GET /journal?limit=20&offset=0` |
| Side effects and notes | Read-only. |

#### 40. POST `/journal`

**Save Journal**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `SaveJournalRequest` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 400 (Bad Request), 500 (Internal Server Error); dependency errors: 401 |
| Side effects and notes | Writes to `journals`. |

#### 41. GET `/journal/today`

**Get Today Journal**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Read-only. |

#### 42. PATCH `/journal/{journal_id}`

**Update Journal**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | `journal_id` (string, required) |
| Query parameters | — |
| Request body | `application/json` — schema `UpdateJournalRequest` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401 |
| Side effects and notes | Writes to `journals`. |

#### 43. DELETE `/journal/{journal_id}`

**Delete Journal**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | `journal_id` (string, required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401 |
| Side effects and notes | Writes to `journals`. |

### Admin: Assessments

Penelusuran asesmen lintas mahasiswa.

#### 44. GET `/admin/assessments`

**List Assessments**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor, admin, or pemangku_jabatan. |
| Path parameters | — |
| Query parameters | `search` (string, optional; default ``; ≤ 100 chars); `severity` (string or null, optional); `instrument` (string or null, optional); `date_from` (string (date) or null, optional); `date_to` (string (date) or null, optional); `faculty_id` (array<string (uuid)>, optional; default `[]`); `academic_unit_id` (array<string (uuid)>, optional; default `[]`); `page` (integer, optional; default `1`; ≥ 1; ≤ 2147483647); `page_size` (integer, optional; default `20`; ≥ 1; ≤ 100) |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Example URL | `GET /admin/assessments?search=<search>&severity=<severity>` |
| Side effects and notes | Read-only. |

### Admin: Users

Detail pengguna dan riwayatnya.

#### 45. GET `/admin/users/{user_id}`

**User Detail**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin or pemangku_jabatan. |
| Path parameters | `user_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

#### 46. GET `/admin/users/{user_id}/assessments`

**User Assessments**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor, admin, or pemangku_jabatan. |
| Path parameters | `user_id` (string (uuid), required) |
| Query parameters | `page` (integer, optional; default `1`; ≥ 1; ≤ 2147483647); `page_size` (integer, optional; default `20`; ≥ 1; ≤ 100) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Example URL | `GET /admin/users/11111111-1111-4111-8111-111111111111/assessments?page=1&page_size=20` |
| Side effects and notes | Read-only. |

#### 47. GET `/admin/users/{user_id}/bookings`

**User Bookings**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor, admin, or pemangku_jabatan. |
| Path parameters | `user_id` (string (uuid), required) |
| Query parameters | `page` (integer, optional; default `1`; ≥ 1; ≤ 2147483647); `page_size` (integer, optional; default `20`; ≥ 1; ≤ 100) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Example URL | `GET /admin/users/11111111-1111-4111-8111-111111111111/bookings?page=1&page_size=20` |
| Side effects and notes | Read-only. |

### Admin: Attention

Sinyal perhatian dari guardrail.

#### 48. GET `/admin/attention`

**Attention Signals**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `signal` (string or null, optional); `unread_only` (boolean, optional; default `False`); `faculty_id` (array<string (uuid)>, optional; default `[]`); `academic_unit_id` (array<string (uuid)>, optional; default `[]`); `page` (integer, optional; default `1`; ≥ 1; ≤ 2147483647); `page_size` (integer, optional; default `20`; ≥ 1; ≤ 100) |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Example URL | `GET /admin/attention?signal=<signal>&unread_only=false` |
| Side effects and notes | Read-only. |

#### 49. PATCH `/admin/attention/{guardrail_log_id}/read`

**Mark Attention Read**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `guardrail_log_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Writes to `guardrail_logs`. |

### Admin: Schedules

Jadwal organisasi konselor.

#### 50. GET `/admin/schedules`

**Organization Schedules**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `date_from` (string (date) or null, optional); `date_to` (string (date) or null, optional); `counselor_id` (string (uuid) or null, optional) |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Example URL | `GET /admin/schedules?date_from=<date_from>&date_to=<date_to>` |
| Side effects and notes | Read-only. |

#### 51. POST `/admin/schedules`

**Create Organization Schedule**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `ScheduleCreate` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 404 (Not Found), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counseling_slots`. |

#### 52. PATCH `/admin/schedules/{schedule_id}`

**Update Organization Schedule**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `schedule_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `ScheduleUpdate` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counseling_slots`. |

### Admin: Hotlines

Daftar hotline darurat.

#### 53. GET `/admin/hotlines`

**List Hotlines**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

#### 54. POST `/admin/hotlines`

**Create Hotline**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `HotlineCreate` (fields and example in section 6) |
| Success response | 201 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Writes to `hotlines`. |

#### 55. PUT `/admin/hotlines/{hotline_id}`

**Update Hotline**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `hotline_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `HotlineUpdate` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `hotlines`. |

#### 56. DELETE `/admin/hotlines/{hotline_id}`

**Delete Hotline**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `hotline_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Writes to `hotlines`. |

### Admin: Analytics

Analitik agregat, ter-scope, dan perbandingan.

#### 57. GET `/admin/analytics`

**Analytics**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `date_from` (string (date) or null, optional); `date_to` (string (date) or null, optional) |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Example URL | `GET /admin/analytics?date_from=<date_from>&date_to=<date_to>` |
| Side effects and notes | Read-only. |

#### 58. GET `/admin/analytics/comparison`

**Comparison Analytics**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `date_from` (string (date), required); `date_to` (string (date), required); `faculty_id` (array<string (uuid)>, optional; default `[]`); `academic_unit_id` (array<string (uuid)>, optional; default `[]`) |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Example URL | `GET /admin/analytics/comparison?date_from=2026-01-31&date_to=2026-01-31` |
| Side effects and notes | Read-only. |

#### 59. GET `/admin/analytics/scoped`

**Scoped Analytics**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `date_from` (string (date), required); `date_to` (string (date), required); `faculty_id` (array<string (uuid)>, optional; default `[]`); `academic_unit_id` (array<string (uuid)>, optional; default `[]`) |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Example URL | `GET /admin/analytics/scoped?date_from=2026-01-31&date_to=2026-01-31` |
| Side effects and notes | Read-only. |

### Admin: Faculties

Data fakultas.

#### 60. GET `/admin/academic/faculties`

**Faculties**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `include_inactive` (boolean, optional; default `False`) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Example URL | `GET /admin/academic/faculties?include_inactive=false` |
| Side effects and notes | Read-only. |

#### 61. POST `/admin/academic/faculties`

**Faculty Create**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `FacultyBody` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 409 (Conflict); dependency errors: 401, 403 |
| Side effects and notes | Writes to `faculties`. |

#### 62. PUT `/admin/academic/faculties/{faculty_id}`

**Faculty Update**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `faculty_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `FacultyBody` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Writes to `faculties`. |

### Admin: Academic Units

Data program studi.

#### 63. GET `/admin/academic/units`

**Units**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `faculty_id` (string (uuid) or null, optional); `include_inactive` (boolean, optional; default `False`) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Example URL | `GET /admin/academic/units?faculty_id=<faculty_id>&include_inactive=false` |
| Side effects and notes | Read-only. |

#### 64. POST `/admin/academic/units`

**Unit Create**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `UnitBody` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 409 (Conflict), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | — |

#### 65. PUT `/admin/academic/units/{unit_id}`

**Unit Update**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `unit_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `UnitBody` (fields and example in section 6) |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | — |

### Admin: Students

Direktori dan profil akademik mahasiswa.

#### 66. GET `/admin/students`

**Students**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `search` (string, optional; default ``); `faculty_id` (string (uuid) or null, optional); `academic_unit_id` (string (uuid) or null, optional); `page` (integer, optional; default `1`; ≥ 1); `page_size` (integer, optional; default `30`; ≥ 1; ≤ 100) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Example URL | `GET /admin/students?search=<search>&faculty_id=<faculty_id>` |
| Side effects and notes | Read-only. |

#### 67. PUT `/admin/students/{student_id}/academic-profile`

**Profile Update**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `student_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `ProfileBody` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `student_academic_profiles`, `set`. |

#### 68. PUT `/admin/students/{student_id}/profile`

**Update Student Profile**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `student_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `StudentProfileUpdate` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `users`, `student_academic_profiles`, `set`, `student_support_profiles`. |

### Admin: Notifications

Kotak masuk notifikasi admin.

#### 69. GET `/admin/notifications`

**Notifications**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `category` (string or null, optional); `unread_only` (boolean, optional; default `False`); `page` (integer, optional; default `1`; ≥ 1); `page_size` (integer, optional; default `30`; ≥ 1; ≤ 100) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Example URL | `GET /admin/notifications?category=<category>&unread_only=false` |
| Side effects and notes | Read-only. |

#### 70. POST `/admin/notifications/mark-all-read`

**Notifications Read**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Writes to `admin_notifications`. |

#### 71. PATCH `/admin/notifications/{admin_notification_id}/read`

**Notification Read**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `admin_notification_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Writes to `admin_notifications`. |

### Admin: Counseling

Permintaan, penjadwalan, sumber daya, dan pengecualian konseling.

#### 72. PATCH `/admin/counseling/appointments/{counseling_appointment_id}`

**Appointment Update**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `counseling_appointment_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `AppointmentPatch` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found), 409 (Conflict); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counseling_appointment_events`, `counseling_requests`, `counseling_appointments`. |

#### 73. GET `/admin/counseling/availability`

**Availability**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `counselor_id` (string (uuid) or null, optional) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Example URL | `GET /admin/counseling/availability?counselor_id=<counselor_id>` |
| Side effects and notes | Read-only. |

#### 74. POST `/admin/counseling/availability`

**Availability Create**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `AvailabilityBody` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 409 (Conflict), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counselor_availability_rules`. |

#### 75. DELETE `/admin/counseling/availability/{rule_id}`

**Availability Deactivate**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `rule_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counselor_availability_rules`. |

#### 76. POST `/admin/counseling/blocked-periods`

**Block Create**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `BlockBody` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 409 (Conflict), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counselor_blocked_periods`. |

#### 77. DELETE `/admin/counseling/blocked-periods/{block_id}`

**Block Delete**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `block_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counselor_blocked_periods`. |

#### 78. GET `/admin/counseling/calendar`

**Calendar**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `date_from` (string (date), required); `date_to` (string (date), required); `counselor_id` (string (uuid) or null, optional); `status` (string or null, optional) |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Example URL | `GET /admin/counseling/calendar?date_from=2026-01-31&date_to=2026-01-31` |
| Side effects and notes | Read-only. |

#### 79. GET `/admin/counseling/calendar/multi`

**Multi Counselor Calendar**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `date_from` (string (date), required); `date_to` (string (date), required); `counselor_id` (array<string (uuid)>, optional; default `[]`) |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Example URL | `GET /admin/counseling/calendar/multi?date_from=2026-01-31&date_to=2026-01-31` |
| Side effects and notes | Read-only. |

#### 80. PUT `/admin/counseling/counselors/{counselor_id}/availability`

**Replace Availability**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `counselor_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `ReplaceAvailability` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counselor_availability_rules`. |

#### 81. GET `/admin/counseling/exception-requests`

**Exception Queue**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `status` (string or null, optional); `counselor_id` (string (uuid) or null, optional) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Example URL | `GET /admin/counseling/exception-requests?status=<status>&counselor_id=<counselor_id>` |
| Side effects and notes | Read-only. |

#### 82. POST `/admin/counseling/exception-requests/{exception_request_id}/approve`

**Approve Exception**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `exception_request_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `DecisionBody` (fields and example in section 6) |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Writes to `counselor_exception_requests`, `counselor_blocked_periods`. |

#### 83. POST `/admin/counseling/exception-requests/{exception_request_id}/reject`

**Reject Exception**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `exception_request_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `DecisionBody` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counselor_exception_requests`. |

#### 84. POST `/admin/counseling/notes`

**Note Create**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `NoteBody` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counseling_admin_notes`. |

#### 85. GET `/admin/counseling/requests`

**Requests**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `status` (string or null, optional); `page` (integer, optional; default `1`; ≥ 1); `page_size` (integer, optional; default `30`; ≥ 1; ≤ 100) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Example URL | `GET /admin/counseling/requests?status=<status>&page=1` |
| Side effects and notes | Read-only. |

#### 86. POST `/admin/counseling/requests/{request_id}/assign`

**Assign**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `request_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `AppointmentBody` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 404 (Not Found), 409 (Conflict); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counseling_requests`, `counseling_appointments`. |

#### 87. GET `/admin/counseling/resources`

**Resources**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

#### 88. POST `/admin/counseling/resources`

**Create Resource**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `ResourceBody` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 409 (Conflict); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counseling_resources`. |

#### 89. POST `/admin/counseling/resources/{counseling_resource_id}/blocks`

**Block Resource**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `counseling_resource_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `ResourceBlock` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 404 (Not Found), 409 (Conflict), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counseling_resource_blocks`. |

### Admin: Counselors

Daftar dan profil konselor.

#### 90. GET `/admin/counselors`

**Counselors**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

#### 91. PUT `/admin/counselors/{counselor_id}/profile`

**Counselor Update**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `counselor_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `CounselorBody` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found), 409 (Conflict); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counselor_profiles`, `set`. |

### Admin: Reports

Data laporan dan catatan audit.

#### 92. POST `/admin/reports/audits`

**Audit Create**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `AuditBody` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `report_export_audits`. |

#### 93. GET `/admin/reports/data`

**Report Data**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | `date_from` (string (date), required); `date_to` (string (date), required); `mode` (string, optional; allowed: `aggregate`, `confidential`; default `aggregate`); `faculty_id` (array<string (uuid)>, optional; default `[]`); `academic_unit_id` (array<string (uuid)>, optional; default `[]`) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Example URL | `GET /admin/reports/data?date_from=2026-01-31&date_to=2026-01-31` |
| Side effects and notes | Read-only. |

### Counseling

Permintaan konseling dan janji temu milik mahasiswa.

#### 94. GET `/counseling/appointments`

**Own Appointments**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Read-only. |

#### 95. GET `/counseling/requests`

**Own Requests**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401 |
| Side effects and notes | Read-only. The student's own requests, each with the slot they picked and, once an admin has assigned it, the appointment actually booked (which may differ from the pick). |

#### 96. POST `/counseling/requests`

**Request Create**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `RequestBody` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 403 (Forbidden), 409 (Conflict), 422 (Unprocessable Entity); dependency errors: 401 |
| Side effects and notes | Writes to `counseling_requests`. |

#### 97. GET `/counseling/slots`

**Open Slots**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, any authenticated role (operates on the caller's own data). |
| Path parameters | — |
| Query parameters | `counselor_id` (string (uuid), required); `date_from` (string (date), required); `date_to` (string (date), required) |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401 |
| Example URL | `GET /counseling/slots?counselor_id=11111111-1111-4111-8111-111111111111&date_from=2026-01-31&date_to=2026-01-31` |
| Side effects and notes | Read-only. Free sessions of one counselor, for the mobile calendar. |

### Admin: Assessment Instruments

Penulisan, validasi, dan publikasi instrumen.

#### 98. GET `/admin/assessment-instruments`

**List Instruments**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

#### 99. POST `/admin/assessment-instruments`

**Create Custom Instrument**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `InstrumentCreate` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 409 (Conflict); dependency errors: 401, 403 |
| Side effects and notes | Writes to `assessment_instruments`, `assessment_instrument_versions`, `assessment_answer_options`, `assessment_dimensions`, `assessment_questions`. |

#### 100. POST `/admin/assessment-instruments/dass21-variants`

**Create Dass21 Variant**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `Dass21VariantRequest` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 409 (Conflict), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `assessment_instrument_versions`, `assessment_answer_options`, `assessment_instruments`, `assessment_questions`. Publish a DASS-21 that offers only the chosen subscales, each whole, with its official norm. |

#### 101. GET `/admin/assessment-instruments/versions/{version_id}`

**Get Instrument Version**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `version_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

#### 102. PUT `/admin/assessment-instruments/versions/{version_id}/draft`

**Save Instrument Draft**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `version_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `DraftDefinition` (fields and example in section 6) |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found), 409 (Conflict), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `assessment_questions`, `assessment_instrument_versions`, `of`, `assessment_answer_options`. |

#### 103. POST `/admin/assessment-instruments/versions/{version_id}/publish`

**Publish Instrument Version**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `version_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 409 (Conflict), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `assessment_instrument_versions`. |

#### 104. POST `/admin/assessment-instruments/versions/{version_id}/submit-review`

**Submit Review**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `version_id` (string (uuid), required) |
| Query parameters | `expected_revision` (integer, required; ≥ 1) |
| Request body | — |
| Success response | 201 |
| Error responses | Declared handler errors: 404 (Not Found), 409 (Conflict); dependency errors: 401, 403 |
| Example URL | `POST /admin/assessment-instruments/versions/11111111-1111-4111-8111-111111111111/submit-review?expected_revision=1` |
| Side effects and notes | Writes to `assessment_version_reviews`. |

#### 105. POST `/admin/assessment-instruments/versions/{version_id}/validate`

**Validate Instrument Version**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `version_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | — |

#### 106. POST `/admin/assessment-instruments/{instrument_id}/derived`

**Create Derived Instrument**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `instrument_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `DerivedInstrumentRequest` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 404 (Not Found), 409 (Conflict); dependency errors: 401, 403 |
| Side effects and notes | Writes to `assessment_instruments`, `assessment_instrument_versions`, `assessment_answer_options`, `assessment_questions`. Create an editable custom instrument without inheriting standard DASS norms. |

#### 107. POST `/admin/assessment-instruments/{instrument_id}/drafts`

**Create Instrument Draft**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `instrument_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 201 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Writes to `assessment_instrument_versions`. |

#### 108. PUT `/admin/assessment-instruments/{instrument_id}/shown-in-app`

**Show Instrument In App**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role admin. |
| Path parameters | `instrument_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `assessment_instruments`. Make this the instrument the mobile app asks students to fill in. |

### Counselor: Instrument Reviews

Antrean dan keputusan review instrumen.

#### 109. GET `/counselor/instrument-reviews`

**Review Queue**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor. |
| Path parameters | — |
| Query parameters | `status` (string or null, optional) |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Example URL | `GET /counselor/instrument-reviews?status=<status>` |
| Side effects and notes | Read-only. |

#### 110. GET `/counselor/instrument-reviews/{assessment_version_review_id}`

**Review Detail**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor. |
| Path parameters | `assessment_version_review_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

#### 111. POST `/counselor/instrument-reviews/{assessment_version_review_id}/approve`

**Approve**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor. |
| Path parameters | `assessment_version_review_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `Decision` (fields and example in section 6) |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | — |

#### 112. POST `/counselor/instrument-reviews/{assessment_version_review_id}/comments`

**Add Review Comment**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor. |
| Path parameters | `assessment_version_review_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `ReviewComment` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 404 (Not Found), 409 (Conflict), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `assessment_review_comments`. |

#### 113. POST `/counselor/instrument-reviews/{assessment_version_review_id}/request-revision`

**Request Revision**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor. |
| Path parameters | `assessment_version_review_id` (string (uuid), required) |
| Query parameters | — |
| Request body | `application/json` — schema `Decision` (fields and example in section 6) |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | — |

### Counselor: Profile

Profil konselor.

#### 114. GET `/counselor/profile`

**Profile**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

### Counselor: Cases

Kasus mahasiswa yang ditangani.

#### 115. GET `/counselor/cases`

**Cases**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

#### 116. GET `/counselor/cases/{student_id}`

**Case Detail**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor. |
| Path parameters | `student_id` (string (uuid), required) |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 404 (Not Found); dependency errors: 401, 403 |
| Side effects and notes | Read-only. |

### Counselor: Calendar

Kalender konselor.

#### 117. GET `/counselor/calendar`

**Calendar**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor. |
| Path parameters | — |
| Query parameters | `date_from` (string (date), required); `date_to` (string (date), required) |
| Request body | — |
| Success response | 200 |
| Error responses | Declared handler errors: 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Example URL | `GET /counselor/calendar?date_from=2026-01-31&date_to=2026-01-31` |
| Side effects and notes | Read-only. |

### Counselor: Exception Requests

Permintaan pengecualian jadwal.

#### 118. POST `/counselor/exception-requests`

**Request Exception**

| Field | Detail |
|---|---|
| Authentication and authorization | Bearer JWT, role konselor. |
| Path parameters | — |
| Query parameters | — |
| Request body | `application/json` — schema `ExceptionBody` (fields and example in section 6) |
| Success response | 201 |
| Error responses | Declared handler errors: 409 (Conflict), 422 (Unprocessable Entity); dependency errors: 401, 403 |
| Side effects and notes | Writes to `counselor_exception_requests`. |

### Health

Status layanan.

#### 119. GET `/`

**Root**

| Field | Detail |
|---|---|
| Authentication and authorization | Public — no token required. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | 422 validation only |
| Side effects and notes | Read-only. |

#### 120. GET `/health`

**Health**

| Field | Detail |
|---|---|
| Authentication and authorization | Public — no token required. |
| Path parameters | — |
| Query parameters | — |
| Request body | — |
| Success response | 200 |
| Error responses | 422 validation only |
| Side effects and notes | Read-only. |

## 6. Request schemas

Field tables for every schema referenced by a request body. Required fields are marked `yes`.

### `AnswerItem`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `question_id` | integer | yes | — |
| `score` | integer | yes | — |

```json
{
  "question_id": 1,
  "score": 1
}
```

### `AnswerOptionDraft`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `position` | integer | yes | ≥ 0.0; ≤ 20.0 |
| `label` | string | yes | ≤ 500 chars; ≥ 1 chars |
| `score` | integer | yes | ≥ 0.0; ≤ 100.0 |

```json
{
  "position": 1,
  "label": "value",
  "score": 1
}
```

### `AppointmentBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `counselor_id` | string (uuid) | yes | — |
| `starts_at` | string (date-time) | yes | — |
| `ends_at` | string (date-time) | yes | — |
| `counseling_resource_id` | string (uuid) or null | no | — |

```json
{
  "counselor_id": "11111111-1111-4111-8111-111111111111",
  "starts_at": "2026-01-31T09:00:00+07:00",
  "ends_at": "2026-01-31T09:00:00+07:00",
  "counseling_resource_id": "11111111-1111-4111-8111-111111111111"
}
```

### `AppointmentPatch`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `counselor_id` | string (uuid) or null | no | — |
| `starts_at` | string (date-time) or null | no | — |
| `ends_at` | string (date-time) or null | no | — |
| `counseling_resource_id` | string (uuid) or null | no | — |
| `status` | string or null | no | — |

```json
{
  "counselor_id": "11111111-1111-4111-8111-111111111111",
  "starts_at": "2026-01-31T09:00:00+07:00",
  "ends_at": "2026-01-31T09:00:00+07:00",
  "counseling_resource_id": "11111111-1111-4111-8111-111111111111",
  "status": "confirmed"
}
```

### `AssessmentRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `answers` | array<`AnswerItem`> | yes | — |
| `instrument_type` | string | no | allowed: `PHQ-9`, `GAD-7`, `SRQ`, `custom`; default `PHQ-9` |
| `session_id` | string or null | no | — |

```json
{
  "answers": [
    {
      "question_id": 1,
      "score": 1
    }
  ],
  "instrument_type": "PHQ-9",
  "session_id": "value"
}
```

### `AuditBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `report_mode` | string | yes | allowed: `aggregate`, `confidential` |
| `faculty_id` | string (uuid) or null | no | — |
| `academic_unit_id` | string (uuid) or null | no | — |
| `faculty_ids` | array<string (uuid)> | no | — |
| `academic_unit_ids` | array<string (uuid)> | no | — |
| `date_from` | string (date) | yes | — |
| `date_to` | string (date) | yes | — |

```json
{
  "report_mode": "aggregate",
  "faculty_id": "11111111-1111-4111-8111-111111111111",
  "academic_unit_id": "11111111-1111-4111-8111-111111111111",
  "faculty_ids": [
    "11111111-1111-4111-8111-111111111111"
  ],
  "academic_unit_ids": [
    "11111111-1111-4111-8111-111111111111"
  ],
  "date_from": "2026-01-31",
  "date_to": "2026-01-31"
}
```

### `AvailabilityBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `counselor_id` | string (uuid) | yes | — |
| `day_of_week` | integer | yes | ≥ 0.0; ≤ 6.0 |
| `start_time` | string (time) | yes | — |
| `end_time` | string (time) | yes | — |
| `timezone` | string | no | default `Asia/Jakarta`; ≤ 50 chars |
| `effective_from` | string (date) or null | no | — |
| `effective_to` | string (date) or null | no | — |
| `active` | boolean | no | default `True` |

```json
{
  "counselor_id": "11111111-1111-4111-8111-111111111111",
  "day_of_week": 1,
  "start_time": "value",
  "end_time": "value",
  "timezone": "Asia/Jakarta",
  "effective_from": "2026-01-31",
  "effective_to": "2026-01-31",
  "active": true
}
```

### `AvailabilityWindow`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `day_of_week` | integer | yes | ≥ 0.0; ≤ 6.0 |
| `start_time` | string (time) | yes | — |
| `end_time` | string (time) | yes | — |
| `timezone` | string | no | default `Asia/Jakarta`; ≤ 50 chars |
| `effective_from` | string (date) or null | no | — |
| `effective_to` | string (date) or null | no | — |

```json
{
  "day_of_week": 1,
  "start_time": "value",
  "end_time": "value",
  "timezone": "Asia/Jakarta",
  "effective_from": "2026-01-31",
  "effective_to": "2026-01-31"
}
```

### `Band`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `label` | string | yes | ≤ 80 chars; ≥ 1 chars |
| `minimum` | number or string | yes | — |
| `maximum` | number or string or null | no | — |

```json
{
  "label": "value",
  "minimum": 1.0,
  "maximum": 1.0
}
```

### `BlockBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `counselor_id` | string (uuid) | yes | — |
| `starts_at` | string (date-time) | yes | — |
| `ends_at` | string (date-time) | yes | — |
| `reason` | string or null | no | — |

```json
{
  "counselor_id": "11111111-1111-4111-8111-111111111111",
  "starts_at": "2026-01-31T09:00:00+07:00",
  "ends_at": "2026-01-31T09:00:00+07:00",
  "reason": "value"
}
```

### `BookingRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `counseling_slot_id` | string | yes | — |
| `notes` | string or null | no | — |

```json
{
  "counseling_slot_id": "value",
  "notes": "value"
}
```

### `BuatJadwalRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `date` | string | yes | — |
| `start_time` | string | yes | — |
| `end_time` | string | yes | — |

```json
{
  "date": "value",
  "start_time": "value",
  "end_time": "value"
}
```

### `ChatRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `message` | string | yes | — |
| `session_id` | string or null | no | — |

```json
{
  "message": "value",
  "session_id": "value"
}
```

### `ConfirmPasswordResetRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string (email) | yes | — |
| `otp` | string | yes | — |
| `new_password` | string | yes | — |

```json
{
  "email": "student@example.test",
  "otp": "value",
  "new_password": "value"
}
```

### `CounselorBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string or null | no | — |
| `specialization` | string or null | no | — |
| `active` | boolean | no | default `True` |

```json
{
  "title": "value",
  "specialization": "value",
  "active": true
}
```

### `CreateAccountRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string (email) | yes | — |
| `password` | string | yes | — |
| `name` | string | yes | — |
| `role` | string | no | allowed: `mahasiswa`, `konselor`, `admin`, `pemangku_jabatan`; default `mahasiswa` |
| `nim` | string or null | no | — |

```json
{
  "email": "student@example.test",
  "password": "value",
  "name": "value",
  "role": "mahasiswa",
  "nim": "value"
}
```

### `Dass21VariantRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | yes | ≤ 160 chars; ≥ 3 chars |
| `code` | string | yes | ≤ 40 chars; ≥ 3 chars |
| `description` | string or null | no | — |
| `subscales` | array<string> | yes | — |

```json
{
  "name": "value",
  "code": "value",
  "description": "value",
  "subscales": [
    "depression"
  ]
}
```

### `Decision`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `expected_revision` | integer | yes | ≥ 1.0 |
| `comment` | string or null | no | — |

```json
{
  "expected_revision": 1,
  "comment": "value"
}
```

### `DecisionBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `decision_note` | string or null | no | — |

```json
{
  "decision_note": "value"
}
```

### `DerivedInstrumentRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | yes | ≤ 160 chars; ≥ 3 chars |
| `code` | string | yes | ≤ 40 chars; ≥ 3 chars |
| `description` | string or null | no | — |

```json
{
  "name": "value",
  "code": "value",
  "description": "value"
}
```

### `Dimension`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `code` | string | yes | — |
| `name` | string | yes | ≤ 160 chars; ≥ 1 chars |
| `description` | string or null | no | — |
| `position` | integer | yes | ≥ 1.0; ≤ 100.0 |
| `multiplier` | number or string | no | default `1` |
| `interpretation_bands` | array<`Band`> | no | — |

```json
{
  "code": "value",
  "name": "value",
  "description": "value",
  "position": 1,
  "multiplier": 1.0,
  "interpretation_bands": [
    {
      "label": "value",
      "minimum": 1.0,
      "maximum": 1.0
    }
  ]
}
```

### `DraftDefinition`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `questions` | array<`QuestionDraft`> | no | — |
| `expected_revision` | integer or null | no | — |

```json
{
  "questions": [
    {
      "item_key": "value",
      "category": "value",
      "position": 1,
      "wording": "value",
      "active": true,
      "options": [
        {
          "position": 1,
          "label": "value",
          "score": 1
        }
      ]
    }
  ],
  "expected_revision": 1
}
```

### `ExceptionBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `date` | string (date) | yes | — |
| `full_day` | boolean | no | default `False` |
| `start_time` | string (time) or null | no | — |
| `end_time` | string (time) or null | no | — |
| `reason` | string | yes | ≤ 250 chars; ≥ 1 chars |
| `note` | string or null | no | — |

```json
{
  "date": "2026-01-31",
  "full_day": false,
  "start_time": "value",
  "end_time": "value",
  "reason": "value",
  "note": "value"
}
```

### `FacultyBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | yes | ≤ 150 chars; ≥ 1 chars |
| `code` | string or null | no | — |
| `active` | boolean | no | default `True` |

```json
{
  "name": "value",
  "code": "value",
  "active": true
}
```

### `HotlineCreate`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | yes | ≤ 100 chars; ≥ 1 chars |
| `phone` | string | yes | ≤ 20 chars; ≥ 1 chars |
| `description` | string or null | no | — |
| `verification_status` | string | no | allowed: `active`, `verification_required`, `inactive`; default `verification_required` |
| `verification_note` | string or null | no | — |

```json
{
  "name": "value",
  "phone": "value",
  "description": "value",
  "verification_status": "active",
  "verification_note": "value"
}
```

### `HotlineUpdate`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string or null | no | — |
| `phone` | string or null | no | — |
| `description` | string or null | no | — |
| `verification_status` | string or null | no | — |
| `verification_note` | string or null | no | — |

```json
{
  "name": "value",
  "phone": "value",
  "description": "value",
  "verification_status": "active",
  "verification_note": "value"
}
```

### `InstrumentAnswer`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `question_id` | string (uuid) | yes | — |
| `option_id` | string (uuid) | yes | — |

```json
{
  "question_id": "11111111-1111-4111-8111-111111111111",
  "option_id": "11111111-1111-4111-8111-111111111111"
}
```

### `InstrumentCreate`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `code` | string | yes | ≤ 40 chars; ≥ 3 chars |
| `name` | string | yes | ≤ 160 chars; ≥ 3 chars |
| `description` | string or null | no | — |
| `language` | string | no | default `id`; ≤ 12 chars; ≥ 2 chars |
| `dimensions` | array<`Dimension`> | yes | — |
| `questions` | array<`Question`> | yes | — |
| `scoring` | `Scoring` | no | — |

```json
{
  "code": "value",
  "name": "value",
  "description": "value",
  "language": "id",
  "dimensions": [
    {
      "code": "value",
      "name": "value",
      "description": "value",
      "position": 1,
      "multiplier": 1.0,
      "interpretation_bands": [
        {
          "label": "value",
          "minimum": 1.0,
          "maximum": 1.0
        }
      ]
    }
  ],
  "questions": [
    {
      "item_key": "value",
      "dimension_code": "value",
      "position": 1,
      "wording": "value",
      "active": true,
      "options": [
        {
          "position": 1,
          "label": "value",
          "score": 1
        }
      ]
    }
  ],
  "scoring": {
    "strategy": "sum_by_dimension"
  }
}
```

### `InstrumentSubmission`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `instrument_version_id` | string (uuid) | yes | — |
| `answers` | array<`InstrumentAnswer`> | yes | — |

```json
{
  "instrument_version_id": "11111111-1111-4111-8111-111111111111",
  "answers": [
    {
      "question_id": "11111111-1111-4111-8111-111111111111",
      "option_id": "11111111-1111-4111-8111-111111111111"
    }
  ]
}
```

### `LoginRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string (email) | yes | — |
| `password` | string | yes | — |

```json
{
  "email": "student@example.test",
  "password": "value"
}
```

### `NoteBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `note_text` | string | yes | ≤ 4000 chars; ≥ 1 chars |
| `counseling_request_id` | string (uuid) or null | no | — |
| `counseling_appointment_id` | string (uuid) or null | no | — |

```json
{
  "note_text": "value",
  "counseling_request_id": "11111111-1111-4111-8111-111111111111",
  "counseling_appointment_id": "11111111-1111-4111-8111-111111111111"
}
```

### `NotifyRiskRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `user_id` | string | yes | — |
| `assessment_id` | string | yes | — |
| `score` | integer | yes | — |
| `session_id` | string or null | no | — |

```json
{
  "user_id": "value",
  "assessment_id": "value",
  "score": 1,
  "session_id": "value"
}
```

### `Option`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `position` | integer | yes | ≥ 0.0; ≤ 20.0 |
| `label` | string | yes | ≤ 500 chars; ≥ 1 chars |
| `score` | integer | yes | ≥ 0.0; ≤ 100.0 |

```json
{
  "position": 1,
  "label": "value",
  "score": 1
}
```

### `ProfileBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `faculty_id` | string (uuid) or null | no | — |
| `academic_unit_id` | string (uuid) or null | no | — |

```json
{
  "faculty_id": "11111111-1111-4111-8111-111111111111",
  "academic_unit_id": "11111111-1111-4111-8111-111111111111"
}
```

### `Question`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `item_key` | string | yes | ≤ 60 chars |
| `dimension_code` | string | yes | — |
| `position` | integer | yes | ≥ 1.0; ≤ 100.0 |
| `wording` | string | yes | ≤ 2000 chars; ≥ 1 chars |
| `active` | boolean | no | default `True` |
| `options` | array<`Option`> | yes | — |

```json
{
  "item_key": "value",
  "dimension_code": "value",
  "position": 1,
  "wording": "value",
  "active": true,
  "options": [
    {
      "position": 1,
      "label": "value",
      "score": 1
    }
  ]
}
```

### `QuestionDraft`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `item_key` | string | yes | ≤ 60 chars; ≥ 1 chars |
| `category` | string | yes | ≤ 60 chars; ≥ 1 chars |
| `position` | integer | yes | ≥ 1.0; ≤ 100.0 |
| `wording` | string | yes | ≤ 2000 chars; ≥ 1 chars |
| `active` | boolean | no | default `True` |
| `options` | array<`AnswerOptionDraft`> | no | — |

```json
{
  "item_key": "value",
  "category": "value",
  "position": 1,
  "wording": "value",
  "active": true,
  "options": [
    {
      "position": 1,
      "label": "value",
      "score": 1
    }
  ]
}
```

### `ReplaceAvailability`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `windows` | array<`AvailabilityWindow`> | no | — |

```json
{
  "windows": [
    {
      "day_of_week": 1,
      "start_time": "value",
      "end_time": "value",
      "timezone": "Asia/Jakarta",
      "effective_from": "2026-01-31",
      "effective_to": "2026-01-31"
    }
  ]
}
```

### `ReportRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `session_id` | string or null | no | — |

```json
{
  "session_id": "value"
}
```

### `RequestBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `preferred_context` | string or null | no | — |
| `preferred_counselor_id` | string (uuid) or null | no | — |
| `preferred_starts_at` | string (date-time) or null | no | — |
| `preferred_ends_at` | string (date-time) or null | no | — |

```json
{
  "preferred_context": "value",
  "preferred_counselor_id": "11111111-1111-4111-8111-111111111111",
  "preferred_starts_at": "2026-01-31T09:00:00+07:00",
  "preferred_ends_at": "2026-01-31T09:00:00+07:00"
}
```

### `ResetPasswordRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string (email) | yes | — |

```json
{
  "email": "student@example.test"
}
```

### `ResourceBlock`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `starts_at` | string (date-time) | yes | — |
| `ends_at` | string (date-time) | yes | — |
| `reason` | string or null | no | — |

```json
{
  "starts_at": "2026-01-31T09:00:00+07:00",
  "ends_at": "2026-01-31T09:00:00+07:00",
  "reason": "value"
}
```

### `ResourceBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | yes | ≤ 160 chars; ≥ 1 chars |
| `resource_type` | string | yes | allowed: `physical`, `virtual` |
| `capacity` | integer | no | default `1`; ≥ 1.0; ≤ 100.0 |
| `location_or_url` | string or null | no | — |
| `active` | boolean | no | default `True` |

```json
{
  "name": "value",
  "resource_type": "physical",
  "capacity": 1,
  "location_or_url": "value",
  "active": true
}
```

### `ReviewComment`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `assessment_question_id` | string (uuid) or null | no | — |
| `comment` | string | yes | ≤ 4000 chars; ≥ 1 chars |

```json
{
  "assessment_question_id": "11111111-1111-4111-8111-111111111111",
  "comment": "value"
}
```

### `SaveJournalRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `content` | string | yes | — |
| `mood` | string or null | no | — |

```json
{
  "content": "value",
  "mood": "calm"
}
```

### `ScheduleCreate`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `counselor_id` | string (uuid) | yes | — |
| `date` | string (date) | yes | — |
| `start_time` | string (time) | yes | — |
| `end_time` | string (time) | yes | — |

```json
{
  "counselor_id": "11111111-1111-4111-8111-111111111111",
  "date": "2026-01-31",
  "start_time": "value",
  "end_time": "value"
}
```

### `ScheduleUpdate`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `status` | string | yes | allowed: `available`, `booked`, `completed`, `cancelled` |

```json
{
  "status": "available"
}
```

### `Scoring`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `strategy` | string | no | default `sum_by_dimension` |

```json
{
  "strategy": "sum_by_dimension"
}
```

### `StudentProfileUpdate`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | yes | ≤ 100 chars; ≥ 1 chars |
| `nim` | string or null | no | — |
| `faculty_id` | string (uuid) or null | no | — |
| `academic_unit_id` | string (uuid) or null | no | — |
| `mental_health_condition_state` | string | no | allowed: `none`, `present`, `unknown`, `prefer_not_to_say`; default `unknown` |
| `disability_state` | string | no | allowed: `none`, `present`, `unknown`, `prefer_not_to_say`; default `unknown` |
| `condition_details` | string or null | no | — |
| `disability_details` | string or null | no | — |

```json
{
  "name": "value",
  "nim": "value",
  "faculty_id": "11111111-1111-4111-8111-111111111111",
  "academic_unit_id": "11111111-1111-4111-8111-111111111111",
  "mental_health_condition_state": "none",
  "disability_state": "none",
  "condition_details": "value",
  "disability_details": "value"
}
```

### `UnitBody`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `faculty_id` | string (uuid) | yes | — |
| `name` | string | yes | ≤ 150 chars; ≥ 1 chars |
| `code` | string or null | no | — |
| `unit_type` | string | yes | allowed: `department`, `study_program` |
| `degree_level` | string or null | no | — |
| `active` | boolean | no | default `True` |

```json
{
  "faculty_id": "11111111-1111-4111-8111-111111111111",
  "name": "value",
  "code": "value",
  "unit_type": "department",
  "degree_level": "value",
  "active": true
}
```

### `UpdateAccountRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string or null | no | — |
| `role` | string or null | no | — |
| `nim` | string or null | no | — |

```json
{
  "name": "value",
  "role": "mahasiswa",
  "nim": "value"
}
```

### `UpdateBookingRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `status` | string | yes | allowed: `pending`, `confirmed`, `completed`, `cancelled` |

```json
{
  "status": "pending"
}
```

### `UpdateJadwalRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `status` | string | yes | allowed: `available`, `booked`, `completed`, `cancelled` |

```json
{
  "status": "available"
}
```

### `UpdateJournalRequest`

| Field | Type | Required | Constraints |
|---|---|---|---|
| `content` | string or null | no | — |
| `mood` | string or null | no | — |

```json
{
  "content": "value",
  "mood": "calm"
}
```

## 7. Realtime WebSocket

| Field | Detail |
|---|---|
| Transport | WebSocket, not an HTTP operation; not shown in OpenAPI/ReDoc. |
| Path | `/realtime` |
| Authentication | Token is sent in the first message after connecting. |
| Authorization | Listener roles only (`konselor`, `admin`, `pemangku_jabatan`). |
| Payloads | Change notices that tell the dashboard which area to refetch over REST. |
| Purpose | Keeps the dashboard current without polling; the REST routes remain the data source. |

## 8. Legacy and internal endpoints

`Jadwal (legacy)` and `Booking (legacy)` are superseded by the counseling request/appointment flow in `Counseling` and `Admin: Counseling`. They remain documented and callable for existing clients and should not be removed without a separately approved API change.

## 9. Verification

The operation set is guarded by `apps/backend/tests/unit/test_openapi_contract.py`: it pins every method/path pair and requires each operation to carry exactly its approved family tag. Documentation work must not change the inventory; an inventory change is an API change and needs its own approval and tests.

