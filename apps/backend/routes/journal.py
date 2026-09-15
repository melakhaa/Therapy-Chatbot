from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Literal
from supabase import create_client
from auth import get_current_user
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter(prefix="/journal", tags=["Journal"])
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))


class SaveJournalRequest(BaseModel):
    content: str
    mood: Optional[Literal["Calm", "Anxious", "Focused", "Tired"]] = None


class UpdateJournalRequest(BaseModel):
    content: Optional[str] = None
    mood: Optional[Literal["Calm", "Anxious", "Focused", "Tired"]] = None


@router.post("", status_code=status.HTTP_201_CREATED)
def save_journal(request: SaveJournalRequest, user=Depends(get_current_user)):
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Konten jurnal tidak boleh kosong")

    result = supabase.table("journals").insert({
        "user_id": str(user.id),
        "content": request.content.strip(),
        "mood": request.mood,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Gagal menyimpan jurnal")

    return {"journal": result.data[0], "message": "Jurnal berhasil disimpan"}


@router.get("")
def get_journals(user=Depends(get_current_user), limit: int = 20, offset: int = 0):
    result = supabase.table("journals").select(
        "journal_id, content, mood, created_at, updated_at"
    ).eq("user_id", str(user.id)).order(
        "created_at", desc=True
    ).range(offset, offset + limit - 1).execute()

    return {"journals": result.data or [], "total": len(result.data or [])}


@router.get("/today")
def get_today_journal(user=Depends(get_current_user)):
    from datetime import date
    today = date.today().isoformat()
    result = supabase.table("journals").select(
        "journal_id, content, mood, created_at"
    ).eq("user_id", str(user.id)).gte(
        "created_at", f"{today}T00:00:00"
    ).order("created_at", desc=True).limit(1).execute()

    return {"journal": result.data[0] if result.data else None}


@router.patch("/{journal_id}")
def update_journal(
    journal_id: str,
    request: UpdateJournalRequest,
    user=Depends(get_current_user),
):
    update_data = {}
    if request.content is not None:
        update_data["content"] = request.content.strip()
    if request.mood is not None:
        update_data["mood"] = request.mood

    if not update_data:
        return {"message": "Tidak ada yang diubah"}

    result = supabase.table("journals").update(update_data).eq(
        "journal_id", journal_id
    ).eq("user_id", str(user.id)).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Jurnal tidak ditemukan")
    return {"journal": result.data[0], "message": "Jurnal diperbarui"}


@router.delete("/{journal_id}", status_code=status.HTTP_200_OK)
def delete_journal(journal_id: str, user=Depends(get_current_user)):
    result = supabase.table("journals").delete().eq(
        "journal_id", journal_id
    ).eq("user_id", str(user.id)).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Jurnal tidak ditemukan")
    return {"message": "Jurnal dihapus"}
