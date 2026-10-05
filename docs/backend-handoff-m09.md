# M09 backend and database handoff

## Final admin UX contract review

The final frontend pass keeps production behavior on authenticated APIs and uses synthetic state only behind the existing development-only preview guard. The remaining screenshot workflows need backend support:

- **Hotline metadata:** persist and return `service_type`, `operational_hours`, and `coverage`; material edits must continue to invalidate verification. These fields are demonstrated only in local preview.
- **Administrator account:** add self-profile update, password change, two-factor authentication, and revoke-all-sessions contracts. Production remains read-only and supports current-session logout.
- **Account creation:** provide authorized student and counselor creation workflows before add controls can be enabled.
- **Counseling resources:** expose and runtime-verify resource lists, capacity, appointment-resource linkage, and conflict responses. Production never invents room assignments; preview shows Room A, Room B, and Virtual Room.
- **Bulk delegation:** provide an atomic authorized assignment contract with explicit partial-failure semantics.
- **Report files:** add an aggregate-only PDF/PPT/Excel renderer. The web report preview remains the only supported output.
- **UNDIP import:** define an authenticated import job, validation report, and conflict policy.

Existing production contracts retained here include attention review, counseling assignment and appointment updates, counselor profile and availability operations, academic structure mutations, instrument version operations, and hotline verification/deactivation.

## Scope and current validation state

The M09 Next.js administrator UI integrates the documented B1 contracts for emergency contacts and academic structure. Type checking, linting, model tests, and production compilation can validate the frontend contract. End-to-end PostgreSQL behavior remains **runtime-unverified** because the frontend environment has no PostgreSQL or Docker runtime. No production data or simulated API success is used as a fallback.

The backend/database owner must apply and validate `db/migrations/004_backend_enablement.sql` before treating these workflows as operational. Validate migration execution with both the current `sajiwa_app` role and the legacy-compatible `sanctuary_app` role used by existing deployments.

## Endpoints consumed by M09

All requests require the existing administrator bearer token and must reject non-admin roles.

### Emergency contacts

| Operation | Method and path | M09 expectation |
| --- | --- | --- |
| List | `GET /admin/hotlines` | Returns the complete bounded administrator contact list. |
| Create | `POST /admin/hotlines` | Creates a record with `verification_status=verification_required`. |
| Edit / verify / reactivate | `PUT /admin/hotlines/{hotline_id}` | Partial update. Material contact edits invalidate verification server-side. `active` is an explicit verification action; reactivation first uses `verification_required`. |
| Soft deactivate | `DELETE /admin/hotlines/{hotline_id}` | Preserves the record and changes its lifecycle state to `inactive`. It must not hard-delete. |

The UI consumes `hotline_id`, `nama`, `nomor`, `deskripsi`, `verification_status`, `verified_at`, `verified_by`, `verification_note`, `created_at`, `updated_at`, and `updated_by`. The admin page does not expose internal verifier identifiers. The API does not currently expose service type, operating hours, or coverage, so M09 does not display or submit those fields.

After every successful mutation the UI refetches `GET /admin/hotlines`; it does not create verification timestamps or retain a client-authoritative status. Confirm that an edit to `nama`, `nomor`, or `deskripsi` returns `verification_required` and clears or updates verification metadata as specified. Confirm that setting `verification_status=active` records authoritative `verified_at` and `verified_by` values.

### Administrator profile and account security

M09 displays the authenticated profile already returned by `GET /auth/me`: `user_id`, `nama`, `email`, and `role`. There is no administrator self-profile update, authenticated password-change, two-factor authentication, session history, or sign-out-all-devices endpoint in the current contract. These controls are intentionally absent. Local logout clears the existing per-tab browser session and requires no new endpoint.

### Academic structure

| Operation | Method and path |
| --- | --- |
| List faculties | `GET /admin/academic/faculties?include_inactive=true` |
| Create faculty | `POST /admin/academic/faculties` |
| Edit or activate/deactivate faculty | `PUT /admin/academic/faculties/{faculty_id}` |
| List units | `GET /admin/academic/units?include_inactive=true` |
| Create unit | `POST /admin/academic/units` |
| Edit or activate/deactivate unit | `PUT /admin/academic/units/{academic_unit_id}` |

Faculty fields consumed are `faculty_id`, `code`, `name`, `active`, `source_url`, `unit_count`, and `student_count`. Academic-unit fields consumed are `academic_unit_id`, `faculty_id`, `faculty_name`, `code`, `name`, `unit_type`, `degree_level`, `active`, `source_url`, and `student_count`. Mutations submit only supported fields. Unit `faculty_id` must reference an existing faculty, and `unit_type` must remain `department` or `study_program`. Code uniqueness and foreign-key compatibility remain backend-authoritative. M09 uses `active=false` for deactivation and never hard-deletes academic records.

## Required B1 runtime validation

Run the full migration and API suite against a real PostgreSQL instance. In addition to the M09 paths above, validate the B1 dependencies that remain outside frontend ownership:

1. Apply `004_backend_enablement.sql` from a supported baseline and validate idempotency/rollback expectations.
2. Confirm database grants and object ownership for `sajiwa_app` and legacy `sanctuary_app` deployments.
3. Exercise instrument creation, counselor review, publish gating, and revision-concurrency enforcement.
4. Exercise student support-profile persistence and authorization boundaries.
5. Exercise counseling resource linkage, conflict detection, and atomic recurring-availability changes.
6. Exercise the full hotline verification lifecycle, including material-edit invalidation, verifier metadata, soft deactivation, and re-verification after reactivation.
7. Verify analytics unique-student counts and severity-over-time aggregates against known fixtures.

## Known gaps

- PostgreSQL migration and API behavior have not run in this frontend environment.
- The hotline contract has no service type, hours, or coverage fields.
- The account contract has no administrator self-profile mutation or advanced session/security operations.
- The frontend relies on backend constraint messages being mapped to the existing safe generic error handling; raw database errors must never be returned.
- Public or mobile hotline responses must exclude administrator-only verification audit metadata unless a separate product requirement explicitly authorizes it.

Backend ownership should return a runtime validation record containing the applied migration version, role used, API test results, and any contract differences discovered. Contract differences should be reconciled before deployment rather than hidden with frontend mock data.
