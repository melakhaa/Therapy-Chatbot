# Project conventions

Repo-wide rules that apply no matter which layer or language you are editing. Framework-, tool-, and
language-specific conventions live in their own docs — see the full index in the
[root AGENTS.md](../AGENTS.md).

## Non-negotiables

- **Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)**
  (`<type>[(scope)][!]: <description>`), enforced by `.githooks/commit-msg`. See
  [git-conventions.md](git-conventions.md).
- Backend/DB identifiers are `snake_case`; user-facing messages are Bahasa Indonesia.
- Never log or store raw chat content — it is Fernet-encrypted (`core/security.py`). See
  [security-conventions.md](security-conventions.md).
- High-risk messages (`guardrail` route) always return the hardcoded crisis response; never let an LLM
  rewrite it. See [semantic-router-conventions.md](semantic-router-conventions.md).
- Admin operational endpoints (schedules, hotlines, attention, analytics) are `admin`-only and must
  never return raw chat, journal, assessment-answer, or guardrail-trigger content. See
  [fastapi-conventions.md](fastapi-conventions.md).
- Run `apps/backend` from its own directory (`venv`, `uvicorn main:app`). See
  [development-conventions.md](development-conventions.md).
- The schema source of truth is `db/init/01_schema.sql` (+ `02_auth.sql`, `03_mobile_app.sql`);
  it is applied by `docker compose up` on an empty volume. Backend connects as the non-superuser `sajiwa_app`
  so RLS applies; request identity is `set_config('app.current_user_id', ..., true)` per transaction.
  See [postgresql-conventions.md](postgresql-conventions.md).
- Roles are `mahasiswa | konselor | admin | pemangku_jabatan` on `users.role`. See
  [security-conventions.md](security-conventions.md).
