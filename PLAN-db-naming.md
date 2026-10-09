# PLAN — database naming consistency

Status: **C chosen (full-stack rename) — awaiting go on the rename map below**
Scope: schema naming only. No behavior, no user-visible change. No renames execute until an
option is picked.

## Findings (live schema, 35 tables)

| Area | Consistency | Examples |
|------|-------------|----------|
| Core tables (`users`, `sessions`, `messages`, `journals`, `assessments`, `guardrail_logs`) | consistent | English, plural, `user_id` ownership |
| Table vocabulary | **3 styles** | English plural (most) · singular `hotline` · Indonesian `jadwal_konsultasi`, `booking_konsultasi` |
| Column language | **legacy mix** | `users.nama` vs `*.name`; `hotline.nama/nomor/deskripsi`; `jadwal_konsultasi.konselor_id/tanggal/waktu_mulai/waktu_selesai`; `booking_konsultasi.catatan` |
| Same-entity FKs | **2 names each** | student: `student_id` vs `user_id` (`booking_konsultasi`, `student_academic_profiles`) · counselor: `konselor_id` vs `counselor_id` |
| Actor columns | **2 families** | `created_by` / `updated_by` / `published_by` vs `actor_user_id` / `author_user_id` / `author_admin_id` / `reviewer_counselor_id` / `admin_user_id` |
| 1:1 profile PKs | **mismatch** | `counselor_profiles PK(user_id)`, `student_academic_profiles PK(user_id)` vs `student_support_profiles PK(student_id)` |
| PK names | **loose** | full `assessment_answer_option_id`, `counseling_request_id` · truncated `appointment_id`, `log_id`, `resource_id`, `review_id`, `dimension_id`, `notification_id`, `admin_note_id`, `availability_rule_id`, `blocked_period_id`, `resource_block_id` · natural `password_resets(email)`, `schema_migrations(version)` |
| Enum values | **3 styles** | Indonesian `mahasiswa`/`tersedia`/`menunggu` · lowercase English (`requested`, `draft`, `active`) · capitalized `journals.mood` (`Calm`, `Anxious`) |
| Time modeling | **3 styles** | `tanggal date` + `waktu_mulai/akhir time` (`jadwal_konsultasi`) · `starts_at/ends_at timestamptz` (counseling) · `start_time/end_time time` + `effective_from/to` (availability rules) |

## Proposed target convention

- **Tables**: English, plural, `snake_case` — `hotlines`, `counseling_schedules`,
  `counseling_bookings`.
- **Columns**: English `snake_case`. FK to `users` named by role: `student_id`, `counselor_id`,
  `admin_id`; actor audit columns only `created_by` / `updated_by`.
- **PK**: `<singular_table_name>_id` (`counseling_appointment_id`, not `appointment_id`).
  1:1 profile tables extend `users` with `user_id` as PK; `password_resets` /
  `schema_migrations` stay natural-keyed.
- **Enums**: lowercase English. Exception: `users.role` values stay Indonesian
  (`mahasiswa`, `konselor`, `pemangku_jabatan`) — product vocabulary, used in UI copy and JWT.
- **Time**: intervals as `starts_at` / `ends_at` `timestamptz`; availability rules keep
  `start_time` / `end_time` + `effective_from` / `effective_to`.

## Decision: option C — full-stack rename

Technically straightforward: single repo, no external API consumers, and every layer is covered
by the unit tests, api_smoke, the RLS check, and the browser smoke. The cost is breadth, not
depth: every SQL string and JSON key changes together, so the codebase cannot disagree with
itself mid-way.

**What stays unchanged:** API route paths and URLs (`/jadwal`, `/admin/hotlines`, `/chat`), UI
copy, `users.role` values (Indonesian product vocabulary), `password_resets` and
`schema_migrations` natural keys, and column types (renames only — `tanggal date` + `waktu_*
time` keep their types).

## Rename map

| Object | Current | New |
|--------|---------|-----|
| table | `hotline` | `hotlines` |
| table | `jadwal_konsultasi` | `counseling_slots` |
| table | `booking_konsultasi` | `counseling_bookings` |
| `users` | `nama` | `name` |
| `hotlines` | `nama`, `nomor`, `deskripsi` | `name`, `phone`, `description` |
| `counseling_slots` | `konselor_id`, `tanggal`, `waktu_mulai`, `waktu_selesai` | `counselor_id`, `date`, `start_time`, `end_time` |
| `counseling_bookings` | `booking_id`, `jadwal_id`, `user_id`, `catatan` | `counseling_booking_id`, `counseling_slot_id`, `student_id`, `notes` |
| `counseling_appointments` | PK `appointment_id` | `counseling_appointment_id` (FK columns follow) |
| `counseling_admin_notes` | PK `admin_note_id` | `counseling_admin_note_id` |
| `counseling_resources` | PK `resource_id` | `counseling_resource_id` (FK columns follow) |
| `counseling_resource_blocks` | PK `resource_block_id` | `counseling_resource_block_id` |
| `counselor_availability_rules` | PK `availability_rule_id` | `counselor_availability_rule_id` |
| `counselor_blocked_periods` | PK `blocked_period_id` | `counselor_blocked_period_id` |
| `assessment_version_reviews` | PK `review_id` | `assessment_version_review_id` |
| `assessment_dimensions` | PK `dimension_id` | `assessment_dimension_id` |
| `admin_notifications` | PK `notification_id` | `admin_notification_id` |
| `guardrail_logs` | PK `log_id` | `guardrail_log_id` |
| `student_support_profiles` | PK `student_id` | `user_id` (match sibling profiles) |
| FK columns | `author_admin_id`, `reviewer_counselor_id`, `legacy_booking_id` | `author_user_id`, `reviewer_user_id`, `legacy_counseling_booking_id` |
| `journals.mood` values | `Calm\|Anxious\|Focused\|Tired` | `calm\|anxious\|focused\|tired` (data UPDATE) |
| `counseling_slots.status` values | `tersedia\|dipesan\|selesai\|dibatalkan` | `available\|booked\|completed\|cancelled` (data UPDATE) |
| `counseling_bookings.status` values | `menunggu\|dikonfirmasi\|selesai\|dibatalkan` | `pending\|confirmed\|completed\|cancelled` (data UPDATE) |

Rule afterwards: FKs to `users` are `<role>_id` (`student_id`, `counselor_id`) or `*_user_id`
for named actors; row-lifecycle audit keeps `created_by` / `updated_by` / `published_by` /
`verified_by` / `submitted_by`; PKs are `<singular_table>_id`; enums lowercase English (roles
excepted).

## Steps (C)

1. `db/migrations/005_naming.sql` — table/column renames, enum `UPDATE`s, check-constraint
   drop/re-add, `create or replace` for every trigger/function whose body names a renamed column
   (`set_updated_at`, `reject_*`, `auth_lookup`, `set_password`, `list_konselor`,
   `notify_dass21_admins`). Rewrite `db/init/*.sql` for fresh volumes. Update `db/test_rls.sql`.
2. Backend — every SQL string and JSON key in `routes/*`, `core/*`, `services/*`, `scripts/*`
   (`nama` → `name`, `tanggal` → `date`, …) plus tests and api_smoke.
3. `packages/api-client` — types and helper signatures.
4. `apps/mobile` — screens/hooks consuming the renamed keys.
5. `apps/dashboard` — features/lib plus dashboard tests.
6. Docs — postgresql/fastapi/security/npm-workspaces conventions and READMEs.

## Verification

Fresh volume (`docker compose down -v`): unit tests → RLS check → api_smoke → dashboard gates →
mobile `tsc` → betterwright smoke (student chat + one admin page). Then the same on the existing
volume to prove 005 migrates old data.

## Open questions

1. Table names `counseling_slots` / `counseling_bookings` OK?
2. Lowercase `journals.mood` values (updates stored rows) OK?
3. Keep `users.role` values Indonesian? (Recommend yes.)
