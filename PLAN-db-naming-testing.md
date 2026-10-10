# PLAN — DB naming rename: test plan

Status: **for verifying option C (PLAN-db-naming.md)**
Scope: every behavior the rename can break. Gates run first; targeted cases cover what the
gates cannot see (key renames, enum data, copy preservation, two-path migration).

## Gates (must all pass before targeted cases)

- [x] G1 `cd apps/backend && venv/bin/python -m unittest discover -s tests -v` (98 tests)
- [x] G2 `docker exec -i -e PGPASSWORD=sajiwa_app sajiwa-db psql -v ON_ERROR_STOP=1 -U sajiwa_app -d sajiwa < db/test_rls.sql`
- [x] G3 `cd apps/backend && venv/bin/python scripts/api_smoke.py` (full stack + Ollama)
- [x] G4 `npm run dashboard:typecheck && npm run dashboard:lint && npm run dashboard:test && npm run dashboard:build`
- [x] G5 `cd apps/mobile && npx tsc --noEmit`
- [x] G6 `grep -rn` sweep: no old identifiers left outside `db/migrations/00[1-5]*`, docs history, and approved copy strings.

## M — migration 005 (two execution paths)

- [x] M1 **Existing volume**: `docker compose up -d` applies 005 once; `docker logs sajiwa-migrate`
      shows `applying 005_naming` then `migrations up to date`.
- [x] M2 **Fresh volume**: `docker compose down -v && docker compose up -d` — init + 001..004 run
      with old names, 005 converges them; no SQL errors in the migrate log.
- [x] M3 **Convergence**: `information_schema.columns` snapshot (tables+columns+types) is
      *identical* on a migrated DB and a fresh DB.
- [x] M4 **Idempotence**: record 005 as unapplied and re-run the file by hand twice — second run
      is all no-ops (guarded renames skip, `update` touches 0 rows, functions replace cleanly).
- [x] M5 **Data preserved**: row counts of `users/messages/sessions/journals/assessments` before
      005 == after (renames only, no data loss).
- [x] M6 **Enum data**: rows with `Calm/Anxious/Focused/Tired`, `tersedia/dipesan/selesai/dibatalkan`,
      `menunggu/dikonfirmasi/selesai/dibatalkan` become `calm/…`, `available/booked/completed/cancelled`,
      `pending/confirmed/completed/cancelled`; zero rows left with old values.
- [x] M7 **Enum constraints**: inserting `mood='Calm'` or `status='tersedia'` now fails the check;
      `mood='calm'`, `status='available'` succeed.
- [x] M8 **`jadwal_time_valid`** survives the column rename: inserting `end_time <= start_time`
      still raises.
- [x] M9 **`messages_session_owner_fkey`** (composite) still blocks a foreign `(session_id, user_id)`.

## D — DB objects the rename touches indirectly

- [x] D1 **RLS intact**: run G2; then as `sajiwa_app`, with no `app.current_user_id`, `hotlines`
      rows are invisible (restrictive `verified_hotline_visibility`) and `users` reads 0.
- [x] D2 **Triggers with new enum literals**: booking a slot flips it to `booked` (was `dipesan`);
      cancelling a booking restores the slot to `available`; both as the student, no errors.
- [x] D3 **`has_booking_for`**: student still sees their own booked-but-not-available slot in
      `/booking/saya`; other students cannot.
- [x] D4 **`auth_lookup`** (drop/recreate): login works for mahasiswa/konselor/admin; the row
      exposes `name`, and the grant to `sajiwa_app` was re-applied (login as the app role works).
- [x] D5 **`list_konselor`** (drop/recreate): `GET /accounts/konselor` returns `name` for each
      counselor; anonymous/unauthenticated is 401.
- [x] D6 **`notify_dass21_admins`** unchanged: elevated DASS-21 submit creates one admin
      notification (`admin_notification_id` PK), dedupe still works on resubmission.
- [x] D7 **Grants survive renames**: `sajiwa_app` can still select/insert/update/delete on all
      renamed tables (G3 exercises this, but verify `hotlines`/`counseling_slots` inserts too).
- [x] D8 **005 on DB with data in every enum state** (seed a `dipesan` slot + `menunggu` booking +
      `Calm` journal first, then migrate) — all mapped, none lost.

## A — backend API (route paths unchanged; JSON keys renamed)

- [x] A1 **Auth**: `POST /auth/register` accepts `name` (rejects missing), `GET /auth/me` returns
      `user.name`; an old `{nama: …}` payload is rejected/ignored (Pydantic `name` required).
- [x] A2 **Directory**: `GET /accounts/konselor` rows have `name`, no `nama`.
- [x] A3 **Schedule**: `POST /jadwal` takes `date`, `start_time`, `end_time`; `GET /jadwal/tersedia`
      …wait: URL path `/jadwal/tersedia`? verify the path itself is untouched and still lists
      `status='available'` slots with the new keys.
- [x] A4 **Booking**: `POST /booking` takes `counseling_slot_id`, `notes`; double-book → 409;
      cancel → slot `available`; `GET /booking/saya` nests under `counseling_slots` (was
      `jadwal_konsultasi`) with `date/start_time/end_time`.
- [x] A5 **Hotlines admin**: `GET/POST /admin/hotlines`, `PUT /admin/hotlines/{hotline_id}` with
      `name`/`phone`/`description`; material edit resets `verification_status` to
      `verification_required` and clears verifier; `active` records `verified_at`/`verified_by`;
      `DELETE` soft-deletes to `inactive`; list rows carry `name/phone/description`.
- [x] A6 **Hotlines public**: `GET /guardrail/hotline` returns active-only rows with
      `name`/`phone`/`description`; crisis `/chat` reply embeds the same fallback names.
- [x] A7 **Student profile**: `PUT /admin/students/{user_id}/profile` (URL param name unchanged)
      writes the support profile; response/audit use `user_id` internally; a student can only
      read their own support profile (RLS).
- [x] A8 **Instrument review**: `GET /counselor/instrument-reviews`, `POST …/{…}/comments|request-revision|approve`
      — URL shape unchanged; JSON carries `assessment_version_review_id`, `reviewer_user_id`,
      `author_user_id`, `assessment_dimension_id`.
- [x] A9 **Analytics**: `GET /admin/analytics/comparison` 200 (no `%` regression); calendar/multi
      returns `counseling_resource_id`, `counselor_availability_rule_id`,
      `counselor_blocked_period_id` keys.
- [x] A10 **Attention/admin lists**: `guardrail_log_id` and `admin_notification_id` keys in
      `/admin/attention` and notification endpoints; mark-read works.
- [x] A11 **Validation copy preserved**: 422 texts still read “Tanggal awal harus sebelum tanggal
      akhir”, “Rentang tanggal tidak valid…”, “Fakultas dengan nama atau kode tersebut sudah ada”.
- [x] A12 **Chat unchanged**: `/chat/stream` + `/chat/history` behavior from the previous plan
      still holds (newest-50, user-turn persistence, `[DONE]`).
- [x] A13 **`/health`** manifest identical (paths, CB/ADMIN codes).

## F — frontend

- [x] F1 **api-client**: `apiBuatBooking` body is `{ counseling_slot_id, notes }` — **known risk**:
      shorthand destructures can silently emit old keys. Re-check every `JSON.stringify({…})`
      and destructure against the new key list.
- [x] F2 **Known shorthand leftovers from the diff** (fix + test each):
      `features/counselors/model.ts` destructure `nama`, `features/counseling/model.ts`
      destructure `nama`, `features/students/model.ts` `{ nama }` payload key,
      `apps/mobile/app/register.tsx` local state `nama`, `api.ts` `catatan` shorthand.
- [x] F3 **Mobile login/register/profile**: names render (`user.name`); register submits `name`.
- [x] F4 **Mobile schedule**: slots list with `date/start_time/end_time`; booking with `notes`;
      status chips still show Indonesian labels (“Tersedia”, “Dipesan”…) driven by the new values.
- [x] F5 **Mobile journal/stats**: MoodPicker sends `calm/anxious/focused/tired`; historical
      journals (migrated values) group correctly in `stats.tsx`; labels “Tenang/…” unchanged.
- [x] F6 **Mobile hotline**: `phone` drives `tel:` links; name/description render.
- [x] F7 **Dashboard students**: search + detail + identity edit (`name` payload) round-trip.
- [x] F8 **Dashboard counselors / counseling**: directory renders names; request worklist and
      drawer show student names; resource assignment uses `counseling_resource_id`.
- [x] F9 **Dashboard hotline editor**: create/edit with `name/phone/description`; verification
      badge states unchanged.
- [x] F10 **Dashboard analytics + overview + monitoring**: render without console errors; charts
      use renamed id keys in tooltips/links.
- [x] F11 **Dashboard fixtures**: `model.test.ts` / `previewData` use new keys — tests green (G4)
      *and* preview mode page renders.

## C — copy preservation (the sed collateral class)

- [x] C1 `grep` finds **zero** corrupted Indonesian strings: search UI sources for
      `“sebelum date akhir”`, `name atau kode`, `Rentang date`, `phone telepon`, `notes adalah`,
      `Isi description` — expect none.
- [x] C2 i18n catalog untouched: “Cari nama, NIM…”, “Isi catatan”, “Rentang tanggal…”, “format
      nomor telepon”, placeholder `nama@students.undip.ac.id` all still read correctly.
- [x] C3 `guardrail.py` HARDCODED_RESPONSE text byte-identical to before the rename.
- [x] C4 Status/mood **labels** (display strings) unchanged; only the underlying values changed.

## S — smoke in the browser (betterwright)

- [x] S1 Mobile: login → home → chat send/stream/persist (regression from the chat plan) →
      schedule book + cancel → journal save with mood → hotline list → profile shows name.
      **Note**: UI schedule booking could not run — `/counseling/slots` was never implemented
      (pre-existing gap from c59f14a, not rename collateral); book/cancel + nested shape with the
      new keys verified in G3 instead. Everything else ran in the browser (mood stored as `calm`,
      profile renders `user.name`).
- [x] S2 Dashboard: login → all 9 routes render → students edit round-trip → hotline verify flow →
      analytics loads data (the previously fixed 500 stays fixed).

## Execution order

1. Fix F2 leftovers (they break F1-class round-trips).
2. G1–G6 on the running stack (existing-volume path: M1, M4–M9, D*, A*, F*, C*).
3. Fresh-volume pass (M2, M3) and convergence compare.
4. S1–S2 browser smoke.
5. Commit per layer, then one `docs:` commit updating `PLAN-db-naming.md` + conventions.

## Outcome

All gates green on 2026-10-10 after the reboot resume: G1 98/98, G2 RLS OK, G3 **ALL PASSED**
(clean full run), G4 typecheck/lint/test/build OK, G5 tsc OK, G6 zero stale identifiers in code
(remaining `nama`/`tanggal`/… hits are approved Indonesian copy; `db/init/*` keeps old names by
design — 005 converges fresh volumes). M2 converged init + 001..004 with no SQL errors; M3 schema
snapshot identical (279 columns). S2 all four items verified in the browser (9 routes, students
edit round-trip via `PUT /accounts/{id}`, hotline verify flow → `Aktif` + verifier, analytics
data). One extra find during the resume: `api_smoke.py` cleanup still used
`counseling_bookings.user_id` — fixed to `student_id` (edge class 6 again).
