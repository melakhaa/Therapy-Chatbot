from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
from supabase import create_client
from auth import require_role, get_current_user
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter(tags=["Account"])

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))

_svc_key = os.getenv("SUPABASE_SERVICE_KEY")
if not _svc_key:
    raise RuntimeError("SUPABASE_SERVICE_KEY wajib diisi untuk operasi admin")
supabase_admin = create_client(os.getenv("SUPABASE_URL"), _svc_key)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CreateAccountRequest(BaseModel):
    email: EmailStr
    password: str
    nama: str
    role: Literal["mahasiswa", "konselor", "admin", "pemangku_jabatan"] = "mahasiswa"
    nim: Optional[str] = None


class UpdateAccountRequest(BaseModel):
    nama: Optional[str] = None
    role: Optional[Literal["mahasiswa", "konselor", "admin", "pemangku_jabatan"]] = None
    nim: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class ConfirmPasswordResetRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str



@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(request: CreateAccountRequest):
    try:
        resp = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "nama": request.nama,
                    "nim": request.nim,
                    "role": "mahasiswa",
                }
            }
        })
        
        if not resp.user:
            raise HTTPException(status_code=400, detail="Gagal registrasi di auth")

        try:
            supabase_admin.table("users").upsert({
                "user_id": str(resp.user.id),
                "email": request.email,
                "nama": request.nama,
                "nim": request.nim if request.nim else None,
                "role": "mahasiswa",
            }, on_conflict="user_id").execute()
        except Exception as e:
            print(f"Warning: User insert/update gagal: {e}")

        return {
            "user_id": str(resp.user.id),
            "message": "Registrasi berhasil. Silakan login dengan akun kamu.",
            "session": resp.session,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Register error: {e}")
        raise HTTPException(status_code=400, detail=f"Registrasi gagal: {str(e)}")


@router.post("/auth/login")
def login(request: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })
        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email atau password salah",
            )
        auth_user = response.user
        session = response.session

        profile = supabase.table("users").select("*").eq(
            "user_id", str(auth_user.id)
        ).maybe_single().execute()

        user_data = profile.data or {}

        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "token_type": "bearer",
            "expires_in": session.expires_in,
            "user": {
                "user_id": str(auth_user.id),
                "email": auth_user.email,
                "nama": user_data.get("nama"),
                "nim": user_data.get("nim"),
                "role": user_data.get("role", "mahasiswa"),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah",
        )


@router.post("/auth/reset-password/request")
def request_password_reset(request: ResetPasswordRequest):
    try:
        supabase.auth.reset_password_email(request.email)
        return {"message": "Jika email terdaftar, OTP telah dikirimkan."}
    except Exception as e:
        return {"message": "Jika email terdaftar, OTP telah dikirimkan."}

@router.post("/auth/reset-password/confirm")
def confirm_password_reset(request: ConfirmPasswordResetRequest):
    try:
        resp = supabase.auth.verify_otp({
            "email": request.email,
            "token": request.otp,
            "type": "recovery"
        })
        if not resp.session:
            raise HTTPException(status_code=400, detail="OTP salah atau kedaluwarsa")
        
        update_resp = supabase.auth.update_user({
            "password": request.new_password
        })
        if not update_resp.user:
            raise HTTPException(status_code=400, detail="Gagal update password")
            
        supabase.auth.sign_out()
        
        return {"message": "Password berhasil diubah. Silakan login kembali."}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Reset password error: {e}")
        raise HTTPException(status_code=400, detail="Gagal mengubah password. Pastikan OTP benar.")



@router.get("/auth/me")
def get_my_profile(user=Depends(get_current_user)):
    profile = supabase.table("users").select("*").eq(
        "user_id", str(user.id)
    ).maybe_single().execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profil tidak ditemukan")
    return profile.data


@router.get("/accounts")
def get_account_list(admin=Depends(require_role("admin", "pemangku_jabatan"))):
    try:
        result = supabase_admin.table("users").select(
            "user_id, nama, email, nim, role, created_at"
        ).order("created_at", desc=True).execute()
        return {"users": result.data or [], "total": len(result.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengambil daftar akun: {e}")


@router.post("/accounts", status_code=status.HTTP_201_CREATED)
def create_account(request: CreateAccountRequest, admin=Depends(require_role("admin", "pemangku_jabatan"))):
    try:
        auth_resp = supabase_admin.auth.admin.create_user({
            "email": request.email,
            "password": request.password,
            "email_confirm": True,
            "user_metadata": {
                "nama": request.nama,
                "role": request.role,
                "nim": request.nim,
            },
        })
        if not auth_resp.user:
            raise HTTPException(status_code=500, detail="Gagal membuat akun di Auth")

        uid = str(auth_resp.user.id)

        supabase_admin.table("users").upsert({
            "user_id": uid,
            "nama": request.nama,
            "email": request.email,
            "nim": request.nim,
            "role": request.role,
        }).execute()

        return {
            "user_id": uid,
            "email": request.email,
            "nama": request.nama,
            "role": request.role,
            "message": "Akun berhasil dibuat",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membuat akun: {e}")


@router.put("/accounts/{user_id}")
def update_account(
    user_id: str,
    request: UpdateAccountRequest,
    admin=Depends(require_role("admin", "pemangku_jabatan")),
):
    try:
        update_data: dict = {}
        if request.nama is not None:
            update_data["nama"] = request.nama
        if request.role is not None:
            update_data["role"] = request.role
        if request.nim is not None:
            update_data["nim"] = request.nim

        if not update_data:
            return {"message": "Tidak ada data yang diubah"}

        result = supabase_admin.table("users").update(update_data).eq(
            "user_id", user_id
        ).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="User tidak ditemukan")

        return {"message": "Akun berhasil diperbarui", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memperbarui akun: {e}")


@router.delete("/accounts/{user_id}", status_code=status.HTTP_200_OK)
def delete_account(user_id: str, admin=Depends(require_role("admin", "pemangku_jabatan"))):
    try:
        supabase_admin.table("users").delete().eq("user_id", user_id).execute()
        supabase_admin.auth.admin.delete_user(user_id)
        return {"message": "Akun berhasil dihapus", "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal menghapus akun: {e}")
