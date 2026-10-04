# Sajiwa Beranda Operasional (M2)

## Scope

M2 replaces only the `/overview` placeholder with a daily operational triage workspace. Every other product route remains a migration placeholder. No backend, database, mobile, or legacy Expo dashboard file is changed by M2.

## Real data composition

The overview uses four existing administrator APIs:

| UI area | Endpoint | Mapping |
| --- | --- | --- |
| Attention metrics and priority cases | `GET /admin/attention?unread_only=true&page_size=100` | Unreviewed safety and assessment signals, student identity, safe assessment category summaries, source timestamp, and read state. |
| Pending counseling requests | `GET /admin/counseling/requests?status=requested&page_size=100` | Exact pending total and request worklist rows with student and academic identity. `preferred_context` is intentionally not displayed. |
| Today's counseling schedule | `GET /admin/counseling/calendar/multi` | Appointment, student, counselor, start/end time, and authoritative appointment status. This endpoint avoids the notes/history fields returned by the older calendar view. |
| Available counselor slots | `GET /admin/schedules` for today | Counts unbooked organization schedule records whose status is `tersedia`. |

No preview fixture, fake identity, hardcoded metric, fake session time, or synthetic runtime row is used. Test files contain typed fixtures solely to verify pure transformations.

## KPI definitions

- **Kasus Kritis:** unreviewed records explicitly classified by the backend as `safety`. This is an operational label; the frontend does not diagnose or inspect guardrail content.
- **Risiko Tinggi Aktif:** loaded unreviewed assessment signals whose backend category result contains `severe` or `extremely_severe` severity.
- **Menunggu Tindak Lanjut:** exact unread attention summary plus the exact requested counseling count.
- **Permintaan Konseling Menunggu:** exact `requested` counseling total.
- **Sesi Hari Ini:** today's appointments excluding authoritative `cancelled` and `no_show` records.
- **Slot Konselor Tersedia:** today's unbooked legacy organization slots with status `tersedia`.

The high-risk metric is bounded by the attention API page size of 100 because the backend does not provide a category-severity aggregate for unread attention. The UI identifies the list as the latest API records rather than representing it as an unbounded total.

## Triage and privacy

Priority order is deterministic: safety signals first, then assessment signals ordered by the highest backend-provided category severity, then new counseling requests. Records with the same rank sort newest first and finally by stable row ID. Safety signals are always shown with a danger treatment and explicit text.

The trigger column renders fixed safety/request explanations or category, backend severity, and scaled score already exposed by the attention API. Raw guardrail input, conversation text, journal content, assessment answers, counseling request context, administrative notes, and appointment history are never rendered.

The attention API does not return faculty or academic-unit data. M2 displays an explicit unavailable value for those signal rows rather than joining an incomplete student-directory page or fabricating a scope. Counseling-request rows use the academic fields already returned by their API.

## Actions and selection

`Tinjau` navigates to the existing student-detail placeholder when a student ID exists. Attention rows also expose the supported `PATCH /admin/attention/{id}/read` mutation as a secondary menu action. Delegation, direct contact, contacted state, assignment, export, and bulk mutations are omitted because the current backend does not expose safe matching endpoints.

Row selection is local UI state. The contextual bar appears only when at least one row is selected and offers only immediate selection clearing. It deliberately does not imply unsupported bulk workflows.

## Time behavior

The operational date and displayed times use `Asia/Jakarta`. Completed, cancelled, and no-show backend states remain authoritative. Active confirmed or rescheduled appointments display as scheduled before their start, in progress during their interval, and completed after their end. The local clock refreshes each minute without aggressive API polling; data refresh is manual.

## Responsive behavior

KPI cards use six columns at large desktop widths, three columns below 1400px (including 1366px), two columns at tablet widths, and one column on small phones. Both operational tables remain full width and use horizontal scrolling when their meaningful column widths no longer fit. Counselor names retain a practical minimum width.

## Backend gaps retained for later work

- Attention signals do not include academic scope or an aggregate of unread category severity.
- There is no bulk attention mutation, delegation endpoint, contact workflow, or contacted-state endpoint.
- Room and virtual-platform resources do not exist as first-class appointment data.
- The available-slot KPI relies on the existing organization schedule endpoint; the newer recurring-availability model does not define a slot duration from which exact open slots can be generated.
