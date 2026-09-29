from semantic_router import Route
import re

from core.db import query

# ── Deterministic crisis detection ───────────────────────────────────────────
# The semantic router is fuzzy: in testing it missed "aku udah minum obat banyak",
# "aku pegang pisau sekarang", and "aku mau loncat dari gedung" and sent all three
# to the LLM. Safety must not depend on embedding distance, so every message is
# checked against this list first (core.semantic_router) and only then routed.
#
# Bias is deliberate: a false positive shows a student the hotline card, which is
# harmless. A false negative means a student in crisis talks to an LLM.
CRISIS_PHRASES = (
    # ending life
    "bunuh diri", "bunuhdiri", "bunuh diriku", "membunuh diriku", "bunuh diri ku",
    "akhiri hidup", "akhiri hidupku", "mengakhiri hidup", "mengakhiri semuanya",
    "akhiri semuanya", "akhir segalanya", "sudahi hidupku",
    "mati aja", "mau mati", "ingin mati", "pengen mati", "pengin mati", "pgn mati",
    "mau meninggal", "ingin meninggal", "pengen meninggal",
    "mending mati", "mendingan mati", "lebih baik mati", "lebih baik aku mati",
    "gak mau hidup", "ga mau hidup", "nggak mau hidup", "tidak mau hidup", "gamau hidup",
    "gak pengen hidup", "gak ingin hidup", "tidak ingin hidup",
    "tidak kuat hidup", "gak kuat hidup", "nggak kuat hidup", "udah gak kuat hidup",
    "tidak sanggup hidup", "gak sanggup hidup", "gak sanggup lagi",
    "gantung diri", "menggantung diri",
    "loncat dari gedung", "melompat dari gedung", "loncat dari jembatan",
    "lompat dari gedung", "terjun dari gedung",
    # active self-harm
    "menyakiti diri", "menyakiti diriku", "melukai diri", "melukai diriku",
    "nyakitin diri", "nyakiti diri", "sakiti diri", "nyakitin diri sendiri",
    "self harm", "selfharm", "nyayat", "menyayat", "mengiris tangan", "nyayat tangan",
    "pegang pisau", "memegang pisau", "pegang gunting", "pegang silet", "pegang obat",
    "minum obat banyak", "minum obat berlebihan", "minum obat sekaligus",
    "overdosis", "overdose", "minum racun",
    # harm to others
    "membunuh orang", "mau membunuh", "ingin membunuh", "membunuh seseorang",
    "menyakiti orang", "melukai orang", "melukai keluarga", "menyakiti keluarga",
)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", text.lower())).strip()


_NORMALIZED_CRISIS = tuple(_normalize(p) for p in CRISIS_PHRASES)


def is_crisis(text: str) -> bool:
    """True if the message clearly signals self-harm, suicide, or harm to others."""
    if not text:
        return False
    normalized = _normalize(text)
    return any(phrase in normalized for phrase in _NORMALIZED_CRISIS)

guardrail_route = Route(
    name="guardrail",
    utterances=[
        "saya ingin mengakhiri hidup saya",
        "saya mau bunuh diri",
        "saya tidak mau hidup lagi",
        "lebih baik saya mati saja",
        "saya ingin menyakiti diri sendiri",
        "saya sudah tidak kuat lagi hidup",
        "hidup saya tidak ada gunanya",
        "saya mau menghilang selamanya",
        "saya ingin membunuh seseorang",
        "saya mau menyakiti orang lain",
        "saya ingin melukai keluarga saya",
        "saya sedang memegang pisau",
        "saya sudah minum obat banyak",
        "tolong saya mau mati sekarang",
        "aku pengen mati aja",
        "gue udah gak kuat hidup",
        "aku udah minum obat banyak",
        "aku pegang pisau sekarang",
        "aku mau loncat dari gedung",
        "mending aku mati",
        "aku mau membunuh diriku",
        "aku pengen nyakitin diri sendiri",
        "saya berencana mengakhiri semuanya",
        "aku gak mau hidup lagi",
    ]
)

HARDCODED_RESPONSE = """Saya mendengar kamu, dan saya sangat khawatir dengan kondisimu sekarang.

Kamu tidak sendirian. Tolong segera hubungi:
- **Into The Light Indonesia**: 119 ext 8
- **Yayasan Pulih**: (021) 788-42580
- **IGD rumah sakit terdekat**

Apakah kamu aman sekarang?"""

HARDCODED_HOTLINES = [
    {"nama": "Into The Light Indonesia", "nomor": "119 ext 8"},
    {"nama": "Yayasan Pulih", "nomor": "(021) 788-42580"},
    {"nama": "IGD Rumah Sakit Terdekat", "nomor": "118"},
]


def get_hotlines_from_db():
    try:
        rows = query("select nama, nomor, deskripsi from hotline")
        if rows:
            return rows
    except Exception:
        pass
    return HARDCODED_HOTLINES
