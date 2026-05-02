from semantic_router import Route
from semantic_router import SemanticRouter
from semantic_router.encoders import OllamaEncoder

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
        "saya ingin melompat dari gedung",
        "saya mau loncat dari jembatan",
        "saya ingin terjun dari tempat tinggi",
        "saya sudah berdiri di pinggir gedung",
        "mau melompat saja rasanya",
        "saya ingin gantung diri",
        "saya mau menyayat nadi saya",
        "saya sedang memegang silet",
        "saya sudah menelan banyak pil",
        "saya ingin mengakhiri ini dengan racun",
        "saya mau menabrakkan diri ke mobil",
        "saya ingin mengakhiri hidup saya dengan cara cepat",
        "dunia akan lebih baik tanpa saya",
        "saya tidak punya alasan lagi untuk hidup",
        "semua sudah berakhir, saya mau pergi",
        "rasanya saya ingin mati saja malam ini",
        "tidak ada lagi harapan untuk saya",
        "saya ingin menutup mata selamanya",
        "saya sudah lelah dengan segalanya, saya ingin pergi",
        "saya sangat marah dan ingin menghancurkan orang lain",
        "saya ingin melukai orang yang saya benci",
        "saya rasa saya akan menyakiti seseorang hari ini",
        "tolong hentikan saya sebelum saya melukai orang lain",
        "saya ingin melakukan tindakan kekerasan",
        "tolong saya, saya tidak bisa menahan diri",
        "saya butuh bantuan, saya mau melakukan hal buruk",
        "apa yang harus saya lakukan supaya saya tidak mati?",
        "saya takut dengan pikiran saya sendiri untuk melukai diri"
    ]
)

HARDCODED_RESPONSE = """Saya mendengar kamu, dan saya sangat khawatir dengan kondisimu sekarang.

Kamu tidak sendirian. Tolong segera hubungi:
- **Into The Light Indonesia**: 119 ext 8
- **Yayasan Pulih**: (021) 788-42580
- **IGD rumah sakit terdekat**

Apakah kamu aman sekarang?"""

def init_guardrail_router():
    encoder = OllamaEncoder(base_url="http://localhost:11434", name="nomic-embed-text-v2-moe")
    router = SemanticRouter(
        routes=[guardrail_route], 
        encoder=encoder,
        auto_sync="local"
    )
    return router

# test
# if __name__ == "__main__":
#     from semantic_router import SemanticRouter
#     from semantic_router.encoders import OllamaEncoder

#     encoder = OllamaEncoder(base_url="http://localhost:11434", name="nomic-embed-text-v2-moe")
#     router = SemanticRouter(routes=[guardrail_route], encoder=encoder)

#     router = SemanticRouter(
#         routes=[guardrail_route], 
#         encoder=encoder,
#         auto_sync="local" 
#     )
    

    
#     tests = [
#         "saya mau bunuh diri",
#         "apa itu depresi?",
#         "saya sedih banget hari ini",
#         "saya tidak mau hidup lagi",
#     ]

#     for t in tests:
#         result = router(t)
#         print(f"[{result.name}] {t}")