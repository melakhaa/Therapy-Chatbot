from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Literal
from supabase import create_client
from auth import get_current_user, require_role
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter(tags=["Jadwal Konsultasi"])

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))


class BuatJadwalRequest(BaseModel):
    tanggal: str
    waktu_mulai: str
    waktu_selesai: str


class BookingRequest(BaseModel):
    jadwal_id: str
    catatan: Optional[str] = None


class UpdateBookingRequest(BaseModel):
    status: Literal["menunggu", "dikonfirmasi", "selesai", "dibatalkan"]


class UpdateJadwalRequest(BaseModel):
    status: Literal["tersedia", "dipesan", "selesai", "dibatalkan"]


@router.post("/jadwal", status_code=status.HTTP_201_CREATED)
def buat_jadwal(
    request: BuatJadwalRequest,
    user=Depends(require_role("konselor", "admin")),
):
    result = supabase.table("jadwal_konsultasi").insert({
        "konselor_id": str(user.id),
        "tanggal": request.tanggal,
        "waktu_mulai": request.waktu_mulai,
        "waktu_selesai": request.waktu_selesai,
        "status": "tersedia",
    }).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Gagal membuat jadwal")
    return {"jadwal": result.data[0], "message": "Jadwal berhasil dibuat"}


@router.get("/jadwal")
def lihat_jadwal_tersedia(user=Depends(get_current_user)):
    result = supabase.table("jadwal_konsultasi").select(
        "jadwal_id, konselor_id, tanggal, waktu_mulai, waktu_selesai, status"
    ).eq("status", "tersedia").order("tanggal").execute()
    return {"jadwal": result.data or []}


@router.get("/jadwal/saya")
def lihat_jadwal_saya(user=Depends(require_role("konselor", "admin"))):
    result = supabase.table("jadwal_konsultasi").select(
        "jadwal_id, tanggal, waktu_mulai, waktu_selesai, status"
    ).eq("konselor_id", str(user.id)).order("tanggal", desc=True).execute()
    return {"jadwal": result.data or []}


@router.patch("/jadwal/{jadwal_id}")
def update_status_jadwal(
    jadwal_id: str,
    request: UpdateJadwalRequest,
    user=Depends(require_role("konselor", "admin")),
):
    result = supabase.table("jadwal_konsultasi").update({
        "status": request.status
    }).eq("jadwal_id", jadwal_id).eq("konselor_id", str(user.id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    return {"message": "Status jadwal diperbarui"}


@router.post("/booking", status_code=status.HTTP_201_CREATED)
def buat_booking(
    request: BookingRequest,
    user=Depends(get_current_user),
):
    jadwal = supabase.table("jadwal_konsultasi").select("*").eq(
        "jadwal_id", request.jadwal_id
    ).maybe_single().execute()

    if not jadwal.data:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan")
    if jadwal.data["status"] != "tersedia":
        raise HTTPException(status_code=409, detail="Jadwal sudah tidak tersedia")

    result = supabase.table("booking_konsultasi").insert({
        "jadwal_id": request.jadwal_id,
        "user_id": str(user.id),
        "catatan": request.catatan,
        "status": "menunggu",
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Gagal membuat booking")

    return {"booking": result.data[0], "message": "Booking berhasil dibuat"}


@router.get("/booking/saya")
def lihat_booking_saya(user=Depends(get_current_user)):
    result = supabase.table("booking_konsultasi").select(
        "booking_id, jadwal_id, status, catatan, created_at, "
        "jadwal_konsultasi(tanggal, waktu_mulai, waktu_selesai, konselor_id)"
    ).eq("user_id", str(user.id)).order("created_at", desc=True).execute()
    return {"bookings": result.data or []}


@router.get("/booking/masuk")
def lihat_booking_masuk(user=Depends(require_role("konselor", "admin"))):
    result = supabase.table("booking_konsultasi").select(
        "booking_id, user_id, status, catatan, created_at, "
        "jadwal_konsultasi!inner(jadwal_id, tanggal, waktu_mulai, waktu_selesai, konselor_id)"
    ).eq("jadwal_konsultasi.konselor_id", str(user.id)).execute()
    return {"bookings": result.data or []}


@router.patch("/booking/{booking_id}")
def update_status_booking(
    booking_id: str,
    request: UpdateBookingRequest,
    user=Depends(get_current_user),
):
    result = supabase.table("booking_konsultasi").update({
        "status": request.status
    }).eq("booking_id", booking_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Booking tidak ditemukan")
    return {"message": f"Status booking diupdate ke '{request.status}'"}
