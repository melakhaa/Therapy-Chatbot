# Dashboard Next M8 — Assessment instruments

## Scope

M8 replaces the placeholders at `/instruments`, `/instruments/new`, and `/instruments/[instrumentId]`. It adds an API-backed directory and detail/editor for existing versions, plus a local custom-first creation flow and privacy-safe preview. No backend, database, mobile, or legacy dashboard files are changed.

## Backend contract audit

The frontend uses the existing Iteration 4 endpoints:

- `GET /admin/assessment-instruments`
- `GET /admin/assessment-instruments/versions/{version_id}`
- `POST /admin/assessment-instruments/{instrument_id}/drafts`
- `PUT /admin/assessment-instruments/versions/{version_id}/draft`
- `POST /admin/assessment-instruments/versions/{version_id}/validate`

The direct publish endpoint exists, but M8 intentionally does not call it for custom instruments because it does not enforce counselor approval. The derivation endpoint also exists, but it is not presented as equivalent to creating a custom instrument from scratch.

The actual stored lifecycle is `draft`, `published`, and `archived`. There are no reviewer, review request, approval, revision request, review comment, submitted-at, or reviewed-at records. The UI therefore presents counselor validation as unavailable and never manufactures those states in browser storage.

## Data and editability

- Standard instruments are always read-only. Canonical DASS-21 wording, category mapping, options, provenance, thresholds, and multiplier are displayed from the server and never recalculated or rewritten in Next.js.
- Custom drafts can edit the fields accepted by `DraftDefinition`: ordered item key, wording, one of the three schema categories, active state as received, and ordered answer options with integer scores.
- Published and archived versions are read-only. A custom published version can use the server endpoint to create or retrieve its next draft version.
- Saving a draft sends one complete definition. The backend deletes and recreates its questions/options inside one database transaction, so an API-level save is atomic. It has no ETag, expected `updated_at`, or other optimistic concurrency token; last successful writer wins.
- The database triggers prevent modification or deletion of published/archived definitions. Assessment history references a version with `ON DELETE RESTRICT`, preserving historical interpretation.

## Contract limitations reflected in the UI

The schema currently constrains every question category to `depression`, `anxiety`, or `stress`; it has no dimension table, free-form category contract, required/optional flag, editable metadata endpoint, or custom scoring configuration endpoint. The local creation flow starts with no DASS dimensions or multipliers, but shows the three currently accepted backend categories when the admin reaches dimension configuration.

There is no endpoint to create an independent `assessment_instruments` record from scratch. `/instruments/new` therefore provides the complete progressive builder, deterministic question/option ordering, completeness feedback, unsaved-change protection, and preview, while clearly stating that save and validation are unavailable. It does not place an unsaved draft in local or session storage and does not pretend that it persists.

There is no counselor validation model. Custom publish remains unavailable even if the technical `/validate` endpoint reports `publishable: true`. That endpoint checks question count, the three fixed categories, option completeness, and authoritative scoring configuration; it is a technical publishability check, not counselor approval.

The backend does not support custom instrument submissions from students. `POST /assessment/instrument/submit` accepts only the published, authoritative, norms-enabled canonical DASS-21 model and calculates DASS results on the server. The mobile app consumes `GET /assessment/instrument/active` dynamically and submits immutable question and option IDs. M8 does not change either payload.

## Privacy and accessibility

Preview state contains configuration only. It has no student identity, response persistence, assessment submission call, or analytics event. Instrument pages never load historical student answers. Statuses include text, controls have labels, tabs and builder steps use native buttons, tables retain headers, and keyboard focus uses the shared visible focus treatment.

## Backend enablement required after M8

1. Add an admin endpoint that creates a custom instrument and initial draft atomically, including editable metadata and server-controlled version `1`.
2. Add first-class dimension/category records if arbitrary custom dimensions are required; remove the DASS-only category constraint only through a compatible versioned migration.
3. Define supported custom scoring strategies, structured interpretation ranges, validation rules, and student submission/scoring behavior.
4. Add a version-scoped counselor review entity with request status, reviewer identity, comments, item comments, submitted/reviewed timestamps, approval/revision events, and an audit log.
5. Enforce counselor approval in the publish transaction for custom versions. Frontend disabling is not a security boundary.
6. Add optimistic concurrency (`ETag`/`If-Match` or an expected update token) for definition replacement.
7. Add metadata mutation, archival/deactivation, and explicitly governed draft deletion endpoints if those product operations are required.

## Verification

M8 adds model tests for version normalization, search boundaries, editability, deterministic order, default option weights, draft completeness, and the absence of implicit DASS defaults. The workspace typecheck, ESLint suite, foundation tests, and production build are the required local gates.
