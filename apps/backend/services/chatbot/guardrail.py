from semantic_router import Route

from core.db import query

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
