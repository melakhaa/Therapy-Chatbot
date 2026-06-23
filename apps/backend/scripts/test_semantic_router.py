import os
import sys
import time

# Tambahkan path backend ke sys.path agar bisa import module lokal
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.chatbot.core import semantic_router

def test_semantic_router_performance():
    queries = [
        # Guardrail (Krisis/Self-Harm)
        "saya ingin mengakhiri hidup saya",
        "saya sudah tidak kuat lagi hidup",
        # RAG (Edukasi/Medis)
        "apa itu depresi?",
        "bagaimana cara menangani stres?",
        # Conversational (Ngobrol biasa)
        "halo, aku lagi sedih",
        "saya butuh teman bicara",
        # Out of bounds / general
        "siapa presiden indonesia?",
        "cara membuat nasi goreng"
    ]
    
    print("="*65)
    print(f"{'TEST SEMANTIC ROUTER PERFORMANCE (Latency & Route)':^65}")
    print("="*65)
    
    total_time = 0
    
    for i, query in enumerate(queries, 1):
        print(f"\n[{i}] Query: '{query}'")
        
        # Mulai timer
        start_time = time.time()
        
        try:
            # Panggil router
            result = semantic_router(query)
            
            # Hitung waktu
            latency = time.time() - start_time
            total_time += latency
            
            # Jika tidak ada rute yang cocok, semantic router mengembalikan None untuk namenya.
            route_name = result.name if result.name else "conversational (fallback/none)"
            
            # Beberapa versi semantic-router punya atribut similarity_score.
            # Kita gunakan getattr agar tidak error jika versinya berbeda.
            similarity_score = getattr(result, "similarity_score", "N/A")
            if isinstance(similarity_score, float):
                similarity_score = f"{similarity_score:.4f}"
            
            print(f"   Latency    : {latency:.4f} detik")
            print(f"   Route Arah : {route_name.upper()}")
            print(f"   Similarity : {similarity_score}")
            
        except Exception as e:
            print(f"   [Error] saat memproses kueri: {e}")

    print("\n" + "="*65)
    print(f"Rata-rata waktu Semantic Routing: {(total_time/len(queries)):.4f} detik/kueri")
    print("="*65)

if __name__ == "__main__":
    test_semantic_router_performance()
