# CHECKPOINT — DB naming rename (option C) execution

Saved mid-execution so this can resume after a reboot.

## State

- **Branch**: `rename-table`, **73 uncommitted files** — the whole rename is in the working
  tree only, nothing committed yet.
- **DB** (docker volume `therapy-chatbot_pgdata`, survives reboots): `005_naming` is applied and
  recorded in `schema_migrations`. Schema is fully renamed: tables, columns, enum values,
  constraints, defaults, RLS policy literal, and function bodies.
- **Backend**: renamed; unit tests **98/98 OK**; RLS self-check **OK**; api_smoke reached
  `== cleanup ==` with all checks passing in the last partial run (one earlier run crashed at an
  unrecorded point — confirm with a full clean run first thing).
- **Mobile**: `tsc --noEmit` OK (after fixing 3 unquoted mood object keys).
- **Dashboard**: typecheck OK, tests OK. `dashboard:build` **not yet re-run**.
- **Not done**: G6 stale-identifier sweep, fresh-volume pass (M2/M3 convergence), browser smoke
  (S1/S2), the per-layer commits, docs update (`postgresql-conventions.md` table list etc.).

## Edge-case classes found while executing (the test plan's value)

1. **Value literals survive renames** — policies, column defaults, and function bodies keep old
   enum values even though attnums track column renames. Fixed: `mahasiswa_view_tersedia_jadwal`
   policy (`'tersedia'`), `counseling_slots.status`/`counseling_bookings.status` defaults, and
   `notify_iteration3_admins()` status literals (`'dibatalkan'`). Also enum `UPDATE`s must run
   **after** dropping the old check constraints (first 005 run failed and rolled back exactly
   there — atomic, no damage).
2. **plpgsql `new./old.` field names** are text, not attnums. Fixed bodies:
   `mark_jadwal_dipesan`, `restore_jadwal_on_cancel`, `has_booking_for`,
   `notify_iteration3_admins` (`new.log_id` → `new.guardrail_log_id`,
   `new.booking_id` → `new.counseling_booking_id`, `tg_table_name='booking_konsultasi'` →
   `'counseling_bookings'`).
3. **`notify_iteration3_admins` silently no-oped** after the table rename (its
   `tg_table_name` branch stopped matching) — booking/cancel still returned 200 but created no
   admin notification. Watch for "green but wrong" like this.
4. **Out-parameter names are part of a function signature** — `auth_lookup`/`list_konselor`
   needed drop + create + re-grant (out col `nama` → `name`).
5. **TS shorthand destructures silently emit old JSON keys** after a key rename
   (`{ counseling_slot_id, catatan }` → unbound var / wrong key). Fixed 5 sites:
   `features/counselors/model.ts`, `features/counseling/model.ts`, `features/students/model.ts`,
   `packages/api-client/src/api.ts` (`catatan`), `apps/mobile/app/register.tsx` local state;
   plus 3 unquoted mood object keys (`Calm:` …) in `constants/moods.ts` + `app/stats.tsx`.
6. **Manual-context renames** (`user_id`↔`student_id`) needed 7 hand fixes: `counseling_bookings`
   insert/queries (`jadwal.py`, `admin.py`, `iteration3.py`, `dashboard.py`,
   `backend_enablement.py` support profile) + `pending_bookings` type in `api.ts`.
7. **Map gap**: `counseling_slots.jadwal_id` → `counseling_slot_id` was missing from the plan map
   (PK had to follow the FK rename) — added to 005 + `PLAN-db-naming.md`.
8. **Idempotence gap**: `add constraint` has no `if not exists` — 005's adds are now
   drop-then-add (M4 re-run twice clean).

## Resume order

1. Full `api_smoke` → expect `ALL PASSED` (if a crash, the section printed just before the
   traceback names it).
2. G4 `npm run dashboard:build`; G6 sweep for old identifiers outside `db/migrations/00[1-5]*`,
   docs history, and approved copy strings.
3. Fresh volume: `docker compose down -v && docker compose up -d` → 005 must converge init +
   001..004 (M2); compare `information_schema.columns` snapshot against the migrated DB (M3).
4. S1/S2 betterwright smoke (mobile chat/book/journal/hotline, dashboard 9 routes + students
   edit + hotline verify + analytics).
5. Commit per layer: `refactor(db)` (005 + test_rls), `refactor(backend)`,
   `refactor(api-client)`, `refactor(mobile)`, `refactor(dashboard)`, `docs` (conventions +
   PLAN-db-naming.md + PLAN-db-naming-testing.md checkboxes + delete this checkpoint).
   Push `rename-table` and open the PR.

## Commands quick-ref

```bash
cd apps/backend && venv/bin/python -m unittest discover -s tests -v   # 98 tests
docker exec -i -e PGPASSWORD=sajiwa_app sajiwa-db \
  psql -v ON_ERROR_STOP=1 -U sajiwa_app -d sajiwa < db/test_rls.sql
cd apps/backend && venv/bin/python scripts/api_smoke.py               # needs backend + Ollama
npm run dashboard:typecheck && npm run dashboard:lint && npm run dashboard:test && npm run dashboard:build
cd apps/mobile && npx tsc --noEmit
# re-run 005 after editing it:
docker exec sajiwa-db psql -U sajiwa -d sajiwa -tAc "delete from schema_migrations where version='005_naming'"
docker compose up -d
# restart backend (never `pkill -f uvicorn` — it kills its own shell):
lsof -ti tcp:8000 | xargs -r kill; sleep 2
cd apps/backend && nohup venv/bin/uvicorn main:app --port 8000 > /tmp/sajiwa-backend.log 2>&1 &
```

## Environment notes

- Docker volume persists across shutdown; `docker compose up -d` re-runs the one-shot migrate.
  Ollama runs on the host (`ollama serve` if down after reboot). Backend/dashboard/Expo need
  starting after reboot (dashboard :3000, backend :8000, Expo web :8081).
- Dev logins: `admin@example.com/admin1234`, `konselor@example.com/konselor1234`,
  `mahasiswa@example.com/mahasiswa1234` (re-seed: `scripts/seed_dev_users.py`).
- betterwright browser skill is available for S1/S2.
- Indonesian copy must stay untouched; approved copy exceptions already verified:
  “Tanggal awal harus sebelum tanggal akhir”, “Rentang tanggal…”, “Fakultas dengan nama…”.
