# Testing conventions

Three tiers. Each one answers a different question, and a test belongs to exactly one of
them — if you cannot say which, it is a unit test that has wandered.

## Test-driven development is required

Every change to behaviour starts with a failing test. **Load the
`test-driven-development` skill before you write implementation code** — it is installed per
agent at `~/.agents/skills/test-driven-development/SKILL.md`, and any agent that reads
`AGENTS.md` should treat it as mandatory for this repo. If your agent cannot load it, follow
the loop below; it is the whole rule:

1. **Red** — write one test for the next behaviour, run it, and watch it fail for the right
   reason (missing behaviour, not a typo). A test that passes the first time is not this step.
2. **Green** — write the smallest code that makes it pass. No options, no "for later".
3. **Refactor** — clean up while it stays green.
4. **Repeat**, then run the whole tier (`npm test`), not only the file you touched.

The iron law: **no production code without a failing test first.** Wrote the code first?
Delete it and start from the test — keeping it as "reference" is writing tests after the
fact, which proves nothing. Exceptions need an explicit agreement from a reviewer:
throwaway prototypes, generated code, and config files.

Applies to bug fixes too: reproduce the bug in a failing test first, then fix it once, in the
shared code path.

| Tier | Proves | Runs in | Needs |
|------|--------|---------|-------|
| Unit | a rule is right | seconds | nothing but the runtime |
| Integration | the API, database and model work together | ~1 min | docker + uvicorn + Ollama |
| E2E | a person can complete a journey in a browser | ~1 min | the stack + seeded accounts |

```bash
npm test                  # unit tier — every workspace + backend, no stack required
npm run test:integration  # integration tier — live API + Postgres + RLS self-check
npm run test:e2e          # e2e tier — betterwright drives the dashboard in a browser
```

The two live tiers **skip loudly** (`SKIP integration: docker is not running`) and exit 0
when their stack is down. A skip must print why: a silently skipped suite is worse than no
suite, because green then means nothing.

No CI runs these. Run the tiers your change touches before opening a PR; run `npm test`
always.

## What belongs where

**Unit** — pure logic, no database, no network, no clock you did not inject. Fakes are
allowed for a boundary you do not own (a stubbed `core.db`, a fake fetch). Never fake the
thing under test.

**Integration** — a real process boundary. Here that is the whole API against real Postgres
and real Ollama, plus the RLS policies and the migration files. It is allowed to be a
script rather than `unittest` cases when the checks share one seeded account and must run
in order — the live smoke run does, and it reports every failure instead of stopping at
the first.

**E2E** — a browser journey a student or counselor would recognise, and only that. If a
check can be made at a lower tier, it belongs there: a browser test is the slowest, flakiest
thing you can write.

## Where each tier lives

| Tier | Location | Runner |
|------|----------|--------|
| Unit (backend) | `apps/backend/tests/unit/*.py` | `unittest discover -s tests/unit` |
| Unit (dashboard) | `apps/dashboard/{lib,features}/**/*.test.ts` | `node --test` + type stripping |
| Unit (mobile, packages) | `*.test.ts` beside the source | `node --test` + type stripping |
| Integration (API) | `apps/backend/tests/integration/stack_smoke.py` | `tests/integration/run.sh` |
| Integration (RLS) | `db/test_rls.sql` | same script, via `docker exec psql` |
| E2E (dashboard) | `e2e/scenarios/*.mjs` | `e2e/run.mjs` → `betterwright run` |

Every workspace exposes `test:unit`, so the root command is
`npm run test:unit --workspaces --if-present && npm run backend:test:unit`. A new workspace
that adds `test:unit` is picked up automatically; the backend is not an npm workspace, so it
gets its own line.

## Writing tests

- **Test first.** New behaviour and bug fixes start with a test you watched fail (the
  `test-driven-development` skill). If a test
  passed the moment you wrote it, it is a characterisation test of existing behaviour —
  fine, but say so, and do not call it TDD.
- **One behaviour per test**, named for the behaviour (`an assigned appointment wins over
  the requested pick`), not for the function.
- **Assert on behaviour, never on source text of another app.** A backend test that greps
  the dashboard's minified `.tsx` for an expression breaks on every refactor and proves
  nothing; that rule lives in the dashboard's own unit tests. This exact mistake left
  `test_iteration4_1.py` red on `main`.
- **No test-only code in production modules.** Test helpers live in the test file.
- **Fix the root cause once.** A bug found at a higher tier gets a failing test at the
  lowest tier that can express it.

## E2E hygiene

- One journey per file, one browser session per journey (`e2e-<name>`), closed afterwards.
  Never let a journey depend on a session another one left behind.
- The runner preflights both servers and skips before opening a browser.
- Locators are matched against a running page, not guessed: `getByLabel` is a substring
  match by default, so `Kata sandi` also matched the show-password button — pass
  `{ exact: true }`.
- Assert the redirect or the rendered heading, not a sleep.

## Known gaps

- `packages/api-client` and `packages/ui-shared` have no unit tier. `storage.ts` imports
  React Native, so it needs a module shim before it can run under plain Node.
- The dashboard has no integration tier: its modules import through the `@/` alias, which
  Node cannot resolve without an extra loader. Its boundary is covered by the browser tier
  instead.
- Mobile has no browser tier. `react-native-web` is not the native app, and the student
  journeys are covered at the API boundary; add one only when a mobile-only bug slips past.
- No CI, by design. If that changes, the three tier commands above are the whole pipeline.
