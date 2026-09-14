from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal
from supabase import create_client
from auth import get_current_user
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter(prefix="/assessment", tags=["Assessment"])

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))

# Sesuai ERD: severity thresholds (contoh PHQ-9)
SEVERITY_THRESHOLDS = {
    "minimal":  (0,  4),
    "mild":     (5,  9),
    "moderate": (10, 14),
    "severe":   (15, 999),
}


def _calc_severity(score: int) -> str:
    for label, (lo, hi) in SEVERITY_THRESHOLDS.items():
        if lo <= score <= hi:
            return label
    return "severe"


from pydantic import Field, field_validator
import uuid


# ── Schema ───────────────────────────────────────────────────────────────────

class AnswerItem(BaseModel):
    question_id: int = Field(ge=1, le=100, description="Question identifier")
    score: int = Field(ge=0, le=3, description="Score 0-3 per PHQ-9/GAD-7")

    @field_validator("question_id")
    @classmethod
    def validate_question_id(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("question_id must be positive")
        return v


class AssessmentRequest(BaseModel):
    answers: List[AnswerItem] = Field(min_length=1, max_length=50)
    instrument_type: Literal["PHQ-9", "GAD-7", "SRQ", "custom"] = "PHQ-9"
    session_id: Optional[str] = Field(
        None,
        pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        description="UUID v4 session identifier"
    )

    @field_validator("answers")
    @classmethod
    def validate_answers(cls, v: List[AnswerItem]) -> List[AnswerItem]:
        # Check for duplicate question_ids
        question_ids = [a.question_id for a in v]
        if len(question_ids) != len(set(question_ids)):
            raise ValueError("Duplicate question_ids found in answers")
        return v

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                uuid.UUID(v, version=4)
            except ValueError:
                raise ValueError("session_id must be a valid UUID v4")
        return v


class NotifyRiskRequest(BaseModel):
    user_id: str
    assessment_id: str
    score: int
    session_id: Optional[str] = None


# ── CB-01: submitSelfAssessment ───────────────────────────────────────────────

@router.post("/submit")
def submit_self_assessment(
    request: AssessmentRequest,
    user=Depends(get_current_user),
):
    """
    CB-01 — Terima jawaban kuesioner mahasiswa, hitung skor,
    simpan ke tabel assessments. Auto-trigger CB-02 jika severity severe/moderate.
    """
    score = sum(a.score for a in request.answers)
    severity = _calc_severity(score)
    answers_payload = [a.model_dump() for a in request.answers]

    result = supabase.table("assessments").insert({
        "user_id": str(user.id),
        "instrument_type": request.instrument_type,
        "answers": answers_payload,
        "score": score,
        "severity": severity,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Gagal menyimpan hasil asesmen")

    assessment_id = result.data[0]["assessment_id"]

    # Auto-trigger CB-02 jika severe
    if severity in ("severe", "moderate"):
        _log_high_risk(
            user_id=str(user.id),
            assessment_id=assessment_id,
            score=score,
            session_id=request.session_id,
        )

    return {
        "assessment_id": assessment_id,
        "score": score,
        "severity": severity,
        "instrument_type": request.instrument_type,
        "message": "Asesmen berhasil disimpan",
    }


# ── CB-02: sendHighRiskNotification ──────────────────────────────────────────

@router.post("/notify-risk")
def send_high_risk_notification(request: NotifyRiskRequest):
    """
    CB-02 — Log notifikasi alert ke guardrail_logs agar Operator bisa pantau.
    """
    _log_high_risk(
        user_id=request.user_id,
        assessment_id=request.assessment_id,
        score=request.score,
        session_id=request.session_id,
    )
    return {"status": "notified", "user_id": request.user_id}


# ── GET: riwayat asesmen user ─────────────────────────────────────────────────

@router.get("/history")
def get_assessment_history(user=Depends(get_current_user)):
    """Ambil riwayat asesmen mahasiswa yang login."""
    result = supabase.table("assessments").select(
        "assessment_id, instrument_type, score, severity, taken_at"
    ).eq("user_id", str(user.id)).order("taken_at", desc=True).execute()
    return {"assessments": result.data or []}


# ── Internal helper ───────────────────────────────────────────────────────────

def _log_high_risk(
    user_id: str,
    score: int,
    session_id: Optional[str] = None,
    assessment_id: Optional[str] = None,
):
    """Insert ke guardrail_logs — notifikasi high-risk untuk Operator."""
    supabase.table("guardrail_logs").insert({
        "user_id": user_id,
        "session_id": session_id,
        "triggered_input": f"[ASSESSMENT] score={score}, assessment_id={assessment_id}",
    }).execute()
