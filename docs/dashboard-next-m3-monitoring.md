# Sajiwa Monitoring Asesmen & Risiko (M3)

## Scope

M3 replaces only the `/monitoring` placeholder with an operational case worklist. `/overview` remains the M2 real-data page and every later product route remains a migration placeholder. M3 changes no backend, database, RLS policy, mobile screen, or legacy Expo dashboard file.

## API composition and fetch boundary

The page composes existing administrator APIs:

| Purpose | Endpoint | Use |
| --- | --- | --- |
| Assessment and safety cases | `GET /admin/attention?page=1&page_size=100` | Student identity, explicit source type, notification time, read state, and safe assessment category result summaries. Repeated `faculty_id` and `academic_unit_id` parameters apply server-side academic filtering. |
| Counseling requests | `GET /admin/counseling/requests?status=requested&page=1&page_size=100` | Requested counseling cases with student and academic names. `preferred_context` is intentionally excluded from the frontend contract and UI. |
| Faculties | `GET /admin/academic/faculties` | Real faculty options and stable IDs. |
| Academic units | `GET /admin/academic/units` | Real unit options, parent faculty IDs, and names. |
| Mark attention reviewed | `PATCH /admin/attention/{log_id}/read` | The only supported case mutation exposed by M3. |

There is no unified monitoring endpoint. The worklist therefore merges at most the latest 100 attention records and latest 100 requested counseling records, then sorts, filters, and paginates that bounded client window. The UI states this limit whenever either endpoint reports more rows than were loaded. Counts and pagination describe loaded matching data, not all historical records.

Both case sources must load successfully before the worklist is shown. A source failure produces a safe complete-worklist error rather than silently presenting partial data. Academic-structure failure is noncritical: the worklist remains available, a warning is shown, and academic controls are disabled.

## Case and workflow mapping

- Attention `signal_type=assessment` maps to **Asesmen**.
- Attention `signal_type=safety` maps to **Safety Signal**.
- A requested counseling record maps to **Permintaan Konseling**.
- Attention `is_read=false` maps to **Belum ditinjau** and `is_read=true` maps to **Telah ditinjau**.
- Requested counseling records remain **Belum ditinjau** for worklist presentation because the current request contract does not expose a separate review-state field. M3 does not invent an in-progress transition.

Stable client case IDs include the source namespace and source record ID. Exact duplicate source records are removed by that ID. Assessment and counseling records are retained as distinct events even when they belong to the same student.

## Risk presentation and ordering

Assessment risk uses only backend-provided category severity. The highest category severity is retained as `backendSeverity` and normalized for presentation:

| Backend assessment severity | UI risk |
| --- | --- |
| `extremely_severe` / `extremely severe` | Critical |
| `severe` | High |
| `moderate` | Medium |
| `normal`, `minimal`, `mild` | Low |
| missing or unknown | Not classified |

Explicit safety metadata receives a critical operational presentation and top ordering. This is a worklist-priority rule, not a diagnosis or a new clinical score. Counseling requests have no risk field in the current contract and display **Not classified**.

Default sorting is deterministic: operational risk descending, timestamp descending within the same risk, then stable case ID. Both risk and time headers show descending indicators. The UI uses text labels alongside semantic colors.

## Filters and academic scope

Search matches loaded student names and NIM values case-insensitively. Type, review status, risk, and date filters are client-side across the bounded merged window. Date presets and custom ranges use `Asia/Jakarta` calendar dates.

Faculty selection is multi-select. Academic-unit selection is enabled only when exactly one faculty is selected and can contain multiple units from that faculty. Changing faculty selection removes incompatible units. Attention academic filtering is performed by the backend even though attention rows do not return academic labels; such labels remain explicitly unavailable in the table.

Counseling requests return academic names but omit academic IDs. M3 maps those names to the academic-structure response only on an exact faculty/unit name match, allowing the same selected scope to filter the loaded counseling window without fabricating labels. A unified endpoint should return stable academic IDs in a later backend milestone.

## Privacy and actions

The trigger column renders assessment category, severity, and scaled score already returned by the attention API, or fixed descriptions for safety and counseling cases. It never renders raw guardrail input, chat text, journal text, assessment answers, counseling request context, notes, or history.

The primary row action opens `/students/{studentId}`, which remains a placeholder until M4. Unread attention rows also offer the supported mark-reviewed mutation. Delegation, contact, scheduling, export, assignment, bulk review, and clinical closure are omitted because matching backend workflows do not exist. Selection is page-local UI state; its only bulk action is immediate clearing while preserving filters and pagination.

## Responsive, theme, and accessibility behavior

The desktop worklist remains a table at 1366px and uses horizontal scrolling when its meaningful minimum widths do not fit. Filters collapse to two columns at tablet widths and one column on phones; the summary strip reduces from six to three and then two columns. The component uses semantic theme variables for both light and dark modes.

Tabs use `role=tablist` and `aria-selected`; every filter has a native label; visible-page select-all has an explicit scope label; row checkboxes include the student identity; table headers and visible sort indicators describe order; loading uses `aria-busy`; bulk selection uses a status region; native inputs remain keyboard accessible; and the existing M1 dropdown provides keyboard and focus handling.

## Deferred backend capability

A future unified monitoring read endpoint should accept case type, review state, normalized risk, date range, search, faculty IDs, academic-unit IDs, page, and page size, and return stable source metadata, academic IDs and names, a globally correct total, and safe precomputed trigger summaries. That contract would remove the 100-record-per-source boundary and make combined pagination and counts globally correct.
