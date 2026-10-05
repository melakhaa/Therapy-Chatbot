# Sajiwa Counseling Schedule Workspace (M5)

## Scope

M5 replaces only `/counseling`. It combines the calendar, pending-request worklist, operational availability, and one-off schedule exceptions. Counselor profile management, analytics, reports, instruments, hotline, settings, rooms, and virtual-room resources remain outside this milestone. No backend, database, mobile, or legacy Expo dashboard file is changed.

## Calendar decision

M5 uses a small internal React implementation instead of adding a calendar package. The required scope is a bounded seven-day calendar plus a semantic list view; the repository already provides React, responsive primitives, tables, drawers, and timezone formatting. A third-party dependency would add bundle and accessibility review cost without supplying missing room or exact-slot contracts.

Week and list views are implemented. Month view is deferred because a truthful month scheduler needs additional density, navigation, and interaction design. The display is combined by default and can be filtered by stable counselor ID. There is no room mode because no room-resource model exists.

## API contracts

| Purpose | Endpoint | M5 behavior |
| --- | --- | --- |
| Calendar, counselors, recurring availability, blocks | `GET /admin/counseling/calendar/multi` | Bounded to the visible Monday–Sunday range. Optional repeated `counselor_id` filtering uses stable IDs. The response deliberately excludes notes and request narrative. |
| Counselor filter and mutations | `GET /admin/counselors` | Supplies real counselor identity and active state. M5 does not edit profiles. |
| Pending requests | `GET /admin/counseling/requests?status=requested` | True server pagination, 20 rows per page. Although the API returns `preferred_context`, M5 drops it during normalization and never renders it. |
| Assign request | `POST /admin/counseling/requests/{id}/assign` | Sends counselor ID and timezone-aware start/end timestamps. Backend validates active counselor, recurring availability, blocks, past time, and student/counselor overlap. |
| Reschedule/cancel | `PATCH /admin/counseling/appointments/{id}` | Reschedule sends the supported resource/time fields; cancellation changes status and preserves history. |
| Create/remove exception | `POST /admin/counseling/blocked-periods`, `DELETE /admin/counseling/blocked-periods/{id}` | Manages real one-off counselor blocks. Creation is rejected when an active appointment overlaps. |

The older `/admin/counseling/calendar` endpoint was inspected but is not used because it returns admin notes and request origin. The multi-calendar endpoint provides the scheduling metadata M5 needs without those private fields. The legacy `/admin/schedules` endpoint was also inspected but is not used as an exact-slot source because it belongs to the older organization schedule model.

## Operational behavior

The four displayed metrics are pending-request total, sessions today when today is inside the active week, active counselor count, and blocked periods in the active week. Conflict and exact available-slot metrics are omitted because successful database constraints prevent active overlaps and recurring availability does not define appointment duration or generated slots.

Appointments emphasize student, time, counselor, and status. Confirmed/rescheduled sessions derive scheduled, in-progress, or completed presentation from timestamps; authoritative completed, cancelled, and no-show states remain unchanged. Dates and mutation inputs use `Asia/Jakarta`. The current-time marker appears only on the actual Jakarta day.

Assignment and rescheduling use the accessible M1 drawer. A lightweight overlap check catches conflicts already present in the loaded period, while the backend remains authoritative. Exact suggestions are not generated from broad weekly windows. Cancellation requires confirmation and changes status rather than deleting the appointment.

Availability is read-only and grouped by stable counselor ID. Routine weekly schedule editing remains M6 work. Exceptions are limited to the active calendar period and support real create/remove operations. No right-side overview panel is added; tabs keep the calendar readable at 1366px and avoid duplicating pending-request urgency.

## Privacy

M5 never requests or displays appointment notes, counselor/therapy notes, request preference narrative, chat or journal content, guardrail text, assessment answers, or clinical narrative. The UI uses scheduling metadata only.

## Responsive and accessible behavior

At 1366px metrics use two columns, controls stack above the calendar, and the calendar retains a deliberate minimum width with horizontal scrolling. On narrow screens metrics and availability cards become single-column, controls stack, drawers use the existing responsive full-screen behavior, and list view remains available.

Tabs use native buttons and tab semantics. Calendar appointments are buttons rather than clickable containers. Filters and form fields have labels. Status always includes text. The existing drawer provides focus trapping, Escape close, overlay dismissal, and focus restoration. Existing reduced-motion rules apply.

## Backend gaps

| Gap | Classification | Minimal future work |
| --- | --- | --- |
| Exact available slots | B: API | Define appointment duration/step and return generated valid slots after recurring availability, blocks, appointments, and timezone rules are applied. |
| Room and virtual-room resources | C + B + D | Add resources, resource availability, appointment-resource links, overlap constraints, safe admin contracts, and authorization. |
| Room conflict validation | C + B | Add an exclusion constraint or equivalent transactional check for active appointment-resource intervals. |
| Detailed schedule audit | B, existing C partially | Return safe event metadata such as actor and before/after scheduling fields without notes. |
| Exception history | B + possibly C | Soft-retain or audit removed blocks if operational history is required. |
| Today KPI outside visible week | A/B | Fetch a dedicated summary endpoint or separate today query; M5 marks the value unavailable outside the active week. |

The minimal future room model is `counseling_resources(resource_id, name, kind, active, timezone)`, optional recurring/resource blocks, and `appointment_resources(appointment_id, resource_id)`, with a transactional active-interval overlap constraint and admin-only mutation permissions. Virtual rooms should store provider-safe resource identity, never meeting secrets in list responses.
