# Docker conventions

Docker is used for **one purpose only: running the local Supabase stack**. There is no
`Dockerfile` or `docker-compose.yml` in the repo — the Supabase CLI manages the containers
(Postgres, PostgREST, GoTrue/Auth, Storage, Kong, etc.).

## Rules

- Docker Desktop must be running before `npx supabase start`.
- Drive everything through the Supabase CLI; do not `docker run`/`docker compose` services by hand.
- Don't commit container artifacts or local volumes; they live outside the repo under Supabase's
  local data dir and are gitignored.
- Default local ports (from `supabase/config.toml`): API `54321`, Postgres `54322`, shadow DB `54320`,
  pooler `54329` (disabled). Postgres major version `17`.
- `supabase/config.toml` is the source of truth for the local environment (schemas, TLS, migrations,
  seed). Migrations have `schema_paths = []` and seed is `./seed.sql`.

## Commands

```bash
npx supabase start     # boot containers (Docker required)
npx supabase status    # show API URL + anon/service keys for .env
npx supabase stop      # stop containers
npx supabase db reset  # recreate DB: re-apply migrations + seed
```

## Env wiring

`status` prints `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_KEY` used by the backend
`.env` ([security-conventions.md](security-conventions.md)) and the `EXPO_PUBLIC_*` vars in
`apps/mobile/.env`.
