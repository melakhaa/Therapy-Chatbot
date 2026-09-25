# Security conventions

## Authentication (self-issued JWT)

- `apps/backend/auth.py` issues and verifies **HS256 JWTs** signed with `JWT_SECRET` — there is no
  external auth provider.
  - `create_token(user_id, email)` — called by register/login.
  - `get_current_user` — decodes `Authorization: Bearer <token>`, returns `AuthUser(id, email)`.
  - `require_role(*roles)` — loads `users.role`, raises `403` if not allowed.
- Tokens expire after `JWT_EXPIRES_MINUTES` (default 7 days). There is no refresh token; the client
  re-logs in when it expires.
- Protect every non-public FastAPI handler with `Depends(get_current_user)` or
  `Depends(require_role(...))` (see [fastapi-conventions.md](fastapi-conventions.md)).
- Client: `apiFetch` attaches the token by default; `useAuth()` manages login/logout.
- Passwords are stored as **bcrypt** hashes in `users.password_hash`
  (`bcrypt.hashpw` / `bcrypt.checkpw`).
- Password recovery is OTP-based: `POST /auth/reset-password/request` writes a bcrypt-hashed
  6-digit code to `password_resets` (15-minute expiry); `POST /auth/reset-password/confirm`
  verifies it and calls the `set_password()` `SECURITY DEFINER` function.
  **No SMTP is wired — the OTP is printed to the server log. Add delivery before production.**

## Roles (RBAC)

`mahasiswa | konselor | admin | pemangku_jabatan` in `users.role`. Dashboard reads are tiered:
`/admin/assessments` and the per-user histories allow `konselor`, `admin`, `pemangku_jabatan`;
`/admin/users/{id}` (identity profile) and every operational route (schedules, hotlines, attention,
analytics) require `admin` (or `admin`/`pemangku_jabatan` for the profile). See
[postgresql-conventions.md](postgresql-conventions.md) for the RLS side.

## Row Level Security

- The backend connects as the non-superuser role `sanctuary_app`, and `core/db.py` sets the request
  identity per transaction (`set_config('app.current_user_id', ..., true)`), so every query is
  filtered by the caller's policies.
- App-layer guards (`require_role`) and RLS are both required. RLS is the backstop if a query forgets
  `where user_id = %s`; `require_role` is what returns a useful `403` to the client.
- **Never point `DATABASE_URL` at `sanctuary`** — that role is a superuser and silently bypasses
  every policy, making RLS cosmetic.

## Encryption (Fernet / `cryptography`)

- `apps/backend/core/security.py` wraps **Fernet**: `encrypt_text` / `decrypt_text`.
- All chat content stored in `messages` is encrypted before insert and decrypted on read.
- Requires `ENCRYPTION_KEY`; the module raises at import if missing.

```bash
# with the venv active
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# or, stdlib only
python -c "import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

## Guardrail safety

- The `guardrail` semantic route always returns a fixed crisis response and logs to
  `guardrail_logs`; never regenerate or reword it via an LLM. See
  [semantic-router-conventions.md](semantic-router-conventions.md).
- Moderate/severe assessments also write to `guardrail_logs`.

## Secrets / env

Backend `.env` (`apps/backend/.env`, gitignored — copy from `.env.example`):
```
DATABASE_URL=postgresql://sanctuary_app:sanctuary_app@localhost:5432/sanctuary
JWT_SECRET=                # signs auth tokens
ENCRYPTION_KEY=            # Fernet key
ALLOWED_ORIGINS=           # comma-separated CORS origins (defaults to *)
```

Mobile `.env` (`apps/mobile/.env`) exposes only `EXPO_PUBLIC_*`. Auth and all data go through the
backend, so there are currently no `EXPO_PUBLIC_*` secrets to configure. Never put
`ENCRYPTION_KEY`, `JWT_SECRET`, or `DATABASE_URL` in an `EXPO_PUBLIC_*` var — those ship to the client.

## Rules

- Never log or return raw chat/journal content; keep it encrypted at rest.
- Don't commit `.env` files (`apps/backend/.env` is gitignored).
