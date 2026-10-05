# Sajiwa Analytics & Laporan (M7)

## Scope

M7 replaces `/analytics` and `/reports/preview` in `apps/dashboard-next`. It provides aggregate analytics, shared period and academic filters, accessible chart alternatives, deterministic insights, a stakeholder-report drawer, and an Indonesian aggregate web preview. It does not add backend, database, mobile, legacy-dashboard, instrument, hotline, settings, room-resource, clinical-scoring, or counselor-review changes.

## Audited contracts

| Purpose | Endpoint | M7 use |
| --- | --- | --- |
| Aggregate analytics | `GET /admin/analytics/comparison` | The only analytics source. M7 sends `date_from`, `date_to`, repeated `faculty_id`, and repeated `academic_unit_id`. The response supplies assessment volume by date, stored overall severity counts, stored DASS category averages/counts and category severity counts, counseling appointment statuses, operational signal counts, and selected-scope metadata. |
| Faculties | `GET /admin/academic/faculties` | Supplies stable IDs and names for the faculty multi-select. |
| Academic units | `GET /admin/academic/units` | Supplies stable parent faculty IDs for the one-faculty unit rule. |
| Export audit | `POST /admin/reports/audits` | Audits an actual aggregate or confidential export. M7 does not call it for a preview because a preview is not an export. |

There is no report-preview, report-rendering, PDF-generation, or PDF-download endpoint. M7 therefore offers a web preview and clearly states that PDF is unavailable. It does not add a fake file action or write an export audit without an export.

## Population and clinical semantics

The overall severity rows count assessment submissions, not unique students. The DASS dimension rows count stored category results; each dimension is presented with its own denominator. Counseling rows count appointments whose `starts_at` falls in the period. Operational signal rows count guardrail events and are used only in the deterministic insight copy, not mislabeled as follow-up workflow states.

High-risk proportion is a presentation aggregation over backend-classified `severe` and `extremely_severe` rows. M7 does not calculate DASS scores, thresholds, category severity, diagnosis, or clinical classification. The category charts are explicitly labeled DASS-21 because the current stored category schema is limited to depression, anxiety, and stress and the supported versioned submission path is DASS-21.

The analytics contract has assessment volume by date but does not provide severity by date. M7 labels the time chart as assessment-submission activity and explicitly explains this contract limitation rather than manufacturing a severity trend. The contract also lacks real follow-up workflow-state aggregates, so M7 omits follow-up composition.

## Filters and comparison behavior

User-facing date boundaries use `Asia/Jakarta`. Presets are the last 7 days, last 30 days, and a custom interval. The backend maximum of 366 days is validated before a request.

Faculty selection is multi-select. Academic units are enabled only when the comparison dimension is academic unit and exactly one faculty is selected. Changing to an incompatible faculty selection clears units. All requests use stable UUIDs. Presentation selection is capped at eight faculties or units so comparison labels remain readable; the backend continues to enforce its larger request limits.

The backend determines response mode from supplied IDs: unit IDs produce academic-unit mode, faculty IDs produce faculty mode, and no IDs produce university mode. It cannot return every faculty grouped without explicit faculty IDs. The empty selection is therefore labeled as the whole university, not an all-faculty comparison. The collapsible advanced-filter surface reports zero available filters because the aggregate endpoint exposes no additional supported filter parameters.

Filters persist in `sessionStorage` for the current browser tab. This retains context across chart interactions, drawer open/close, preview navigation, and return navigation without creating a cross-device preference or exposing payloads in URLs.

Dashboard analytics copy is part of the central M1 Indonesian/English catalog and follows the active dashboard language. The formal stakeholder preview remains fixed Indonesian because the existing product requirement specifies Indonesian reports and no backend report-locale contract exists.

## Visualization decision and accessibility

M7 uses one small internal CSS/React visualization layer instead of adding a chart dependency. The needed visuals are bounded horizontal bars and stacked composition bars, while the existing dependency set contains no chart package. This avoids a new React 19 compatibility and bundle obligation and keeps exact values visible.

Every visualization has a specific title, population/date context, visible values, text labels, and an accessible aggregate `aria-label`. The report appendix provides semantic tables for overall severity and counseling status. Severity colors remain tied to clinical severity; counseling workflow bars use a separate palette. Empty data produces a concise empty state without axes. Loading uses panel skeletons, and aggregate-source failure suppresses all KPIs so partial results cannot look complete.

## Report preview and privacy

The report drawer inherits the active filters and does not duplicate filter state. Supported selectable sections are executive summary, assessment activity, DASS-21 dimension distribution, academic comparison, counseling utilization, deterministic insights, and an aggregate appendix. Follow-up distribution is absent because no workflow aggregate exists.

The preview configuration is a versioned, validated, aggregate-only object stored under a per-tab `sessionStorage` key. It contains dates, stable academic IDs, comparison mode, selected section keys, and a generated timestamp. It contains no student identity, clinical narrative, answers, notes, chat, journal, guardrail content, or bearer token. `/reports/preview` refetches the authoritative aggregate endpoint rather than transferring response data in the URL. The report remains Indonesian, includes Sajiwa and Universitas Diponegoro identity, and has no identifiable appendix.

## Backend gaps

| Gap | Classification | Minimal future work |
| --- | --- | --- |
| Severity trend over time | B: API | Return date bucket, stored severity, and count with the same filters. |
| Unique assessed-student denominator | B: API | Return a privacy-reviewed distinct count and explicit population metadata. |
| All-faculty/all-unit grouped comparison | B: API | Add an explicit comparison dimension independent of selected scope IDs. |
| Follow-up workflow composition | B + possibly C | Define canonical workflow states and return aggregate counts; do not infer them from guardrail events. |
| Report rendering/PDF | B | Add an aggregate-only server-rendered preview/export contract, content-section validation, audit-after-success semantics, and authorized file delivery. |
| Report language selection | B | Add an explicit supported locale only if stakeholder reports should vary from fixed Indonesian. |
| Period comparison | B | Return current and prior comparable windows with population metadata. |
| Aggregate support/disability filters | B + D | Add only after field-level authorization, minimum-cell/privacy policy, and aggregate disclosure review. |

The existing `POST /admin/reports/audits` contract records export metadata but does not generate a report. A future PDF flow should create the audit only after a successful export and should remain aggregate by default.

## Aggregate privacy risk

The current analytics endpoint does not suppress small cells or return a backend policy indicator. Selecting a very small faculty or academic unit can therefore expose counts that may be attributable when combined with outside knowledge, even though M7 never returns identities. M7 does not invent a suppression threshold because no approved minimum-cell policy exists. Before stakeholder export is enabled, the backend should enforce an institution-approved minimum cohort size, suppress complementary cells where required, and return disclosure metadata that the frontend can explain consistently.
