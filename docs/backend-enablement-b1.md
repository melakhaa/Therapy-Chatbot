# Backend enablement B1

B1 closes the server gaps identified in M0–M8 while preserving the existing DASS-21 and counseling records. Migration `004_backend_enablement.sql` is applied after `003_iteration4_1.sql`; it widens the legacy question-category constraint, adds relational custom dimensions, and records every counselor review against an immutable `definition_revision` number.

## Instrument workflow

`POST /admin/assessment-instruments` creates metadata, version 1, dimensions, questions, options, and structured `sum_by_dimension` scoring in one transaction. Draft saves can carry `expected_revision`; a successful save increments the revision and makes any earlier approval stale. Admins submit the current revision through `POST /admin/assessment-instruments/versions/{id}/submit-review`. Counselors use `/counselor/instrument-reviews` to inspect the complete definition, add general or question comments, request revision, or approve. The publish validator requires a current-revision approval for custom instruments. Published and archived versions retain the existing database immutability triggers.

## Student support and scheduling

`PUT /admin/students/{id}/profile` updates identity, academic assignment, and the separately protected support profile atomically. Support states are `none`, `present`, `unknown`, and `prefer_not_to_say`; detail is accepted only with `present`. RLS limits these sensitive rows to the student, admins, and counselors.

Counseling resources support `physical` and `virtual` types, capacity, blocks, and optional appointment linkage. Assignment and rescheduling take an advisory resource lock, reject blocks, and enforce capacity alongside existing counselor/student overlap checks. Weekly availability can be replaced atomically. Counselor deactivation is rejected while future confirmed or rescheduled appointments exist.

Exact generated slots remain deferred because the product has no approved duration/step policy. Resource availability is instead enforced for concrete appointment intervals.

## Hotline and analytics

Hotlines use `active`, `verification_required`, and `inactive`. Editing contact fields invalidates earlier verification; activation records verifier and time. Public guardrail responses select active contacts only, and a restrictive RLS policy enforces the same visibility rule.

Comparison analytics now returns `unique_assessed_students` and `severity_trend`. Small-cohort suppression remains deferred until an institution-approved minimum cell policy exists. PDF export remains deferred because no approved renderer or storage/delivery infrastructure exists. A separate follow-up aggregate remains deferred because the schema has no authoritative follow-up entity.

## Compatibility and operations

Legacy DASS routes, question IDs, assessment history, counseling records, and nullable appointment resource behavior remain compatible. The new dashboard builder calls the atomic create contract. Existing mobile DASS behavior is unchanged. Apply the migration as the database owner and keep the application on the non-superuser role so RLS is effective.
