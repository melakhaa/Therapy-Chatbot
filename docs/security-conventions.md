# Security conventions

## Authentication (Supabase Auth / JWT)

- Supabase Auth issues JWTs; clients store the access token and send
  `Authorization: Bearer <token>`.
- Backend guards in `apps/backend/auth.py`:
  - `get_current_user` — validates the token via `supabase.auth.get_user(token)`, returns the user.
  - `require_role(*roles)` — loads `users.role`, raises `403` if not allowed.
- Protect every non-public FastAPI handler with `Depends(get_current_user)` or
  `Depends(require_role(...))` (see [fastapi-conventions.md](fastapi-conventions.md)).
- Client: `apiFetch` attaches the token by default; `useAuth()` manages login/logout.
- Password recovery is OTP-based: `POST /auth/reset-password/request` then `/confirm`.

## Roles (RBAC)

`mahasiswa | konselor | admin | pemangku_jabatan` in `users.role`. Dashboard/admin endpoints
require `konselor`, `admin`, or `pemangku_jabatan`. (See [supabase-conventions.md](supabase-conventions.md).)

## Encryption (Fernet / `cryptography`)

- `apps/backend/core/security.py` wraps **Fernet**: `encrypt_text` / `decrypt_text`.
- All chat content stored in `messages` is encrypted before insert and decrypted on read.
- Requires `ENCRYPTION_KEY`; the module raises at import if missing.

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Guardrail safety

- The `guardrail` semantic route always returns a fixed crisis response and logs to
  `guardrail_logs`; never regenerate or reword it via an LLM. See
  [semantic-router-conventions.md](semantic-router-conventions.md).
- Moderate/severe assessments also write to `guardrail_logs`.

## Secrets / env

Backend `.env` (`apps/backend/.env`):
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=      # required by routes/account.py for admin auth operations
ENCRYPTION_KEY=            # Fernet key
ALLOWED_ORIGINS=           # comma-separated CORS origins (defaults to *)
```

Mobile `.env` (`apps/mobile/.env`) exposes only `EXPO_PUBLIC_*`
(`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Never put the service key or
`ENCRYPTION_KEY` in an `EXPO_PUBLIC_*` var — those ship to the client.

## Rules

- Never log or return raw chat/journal content; keep it encrypted at rest.
- Use the service-role client (`supabase_admin`) only inside admin account operations.
- Don't commit `.env` files (already gitignored).
