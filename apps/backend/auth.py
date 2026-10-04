import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.db import query

load_dotenv()

SECRET = os.getenv("JWT_SECRET", "")
if not SECRET:
    raise RuntimeError("JWT_SECRET wajib diisi di .env")
ALGORITHM = "HS256"
EXPIRES_IN = int(os.getenv("JWT_EXPIRES_MINUTES", "10080")) * 60  # 7 hari

bearer_scheme = HTTPBearer()


@dataclass
class AuthUser:
    id: str
    email: str
    # Resolved from the database by get_current_user, never read from the token: a role
    # baked into a JWT would outlive a demotion. Empty only on a hand-built instance, and
    # require_role matches it against no role, so that case fails closed.
    role: str = ""


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=EXPIRES_IN),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthUser:
    try:
        payload = jwt.decode(credentials.credentials, SECRET, algorithms=[ALGORITHM])
        # UUID() rejects a malformed subject here rather than letting it reach SQL as an
        # invalid-uuid error on the first query.
        user_id = str(UUID(payload["sub"]))
        email = payload.get("email", "")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid atau sudah kadaluarsa",
        )

    # A good signature only proves this server minted the token, not that its subject still
    # exists: the row can be deleted — or the whole database rebuilt — while the token stays
    # signed and unexpired for the rest of JWT_EXPIRES_MINUTES. Without this lookup such a
    # token kept full access until it expired, and every write failed on the users foreign
    # key instead of saying the session was over. Deliberately not wrapped in the 401 above:
    # a database outage is not an expired session and must not log everybody out.
    rows = query("select role from users where user_id = %s", (user_id,), user_id=user_id)
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akun untuk sesi ini sudah tidak ada, silakan masuk lagi",
        )
    return AuthUser(id=user_id, email=email, role=rows[0]["role"])


def require_role(*roles: str):
    def _check(user: AuthUser = Depends(get_current_user)):
        # get_current_user already resolved the role, so this no longer repeats the query —
        # and no longer falls back to "mahasiswa" for a subject it could not find, which
        # used to let a deleted user's token pass require_role("mahasiswa").
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Akses ditolak. Dibutuhkan role: {', '.join(roles)}",
            )
        return user

    return _check
