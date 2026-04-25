import os
from dotenv import load_dotenv
from supabase import create_client
from langchain_ollama import OllamaEmbeddings

# Load environment variables
load_dotenv()

# Inisialisasi Supabase dan Embeddings
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))
embeddings = OllamaEmbeddings(model="nomic-embed-text-v2-moe")

def fetch_documents(vector, threshold=0.0, limit=3):
    # Threshold di-set 0.0 agar kita bisa melihat skor terendah sekalipun
    result = supabase.rpc("match_documents", {
        "query_embedding": vector,
        "match_threshold": threshold,
        "match_count": limit
    }).execute()
    return result.data or []

def run_ab_test(test_query: str):
    print(f"\n{'='*60}")
    print(f"🔍 PENGUJIAN QUERY: '{test_query}'")
    print(f"{'='*60}\n")

    # ---------------------------------------------------------
    # SKENARIO A: TANPA PREFIX
    # ---------------------------------------------------------
    print("▶ SKENARIO A: TANPA PREFIX (Hanya menggunakan teks asli)")
    vec_without_prefix = embeddings.embed_query(test_query)
    docs_a = fetch_documents(vec_without_prefix)
    
    for i, doc in enumerate(docs_a):
        # Asumsi RPC Anda me-return 'similarity', sesuaikan jika nama kolomnya beda
        score = doc.get("similarity", 0) 
        content = doc.get("content", "").replace('\n', ' ')[:100] # Ambil 100 karakter pertama
        print(f"  {i+1}. Skor: {score:.4f} | Teks: {content}...")

    print("\n" + "-"*60 + "\n")

    # ---------------------------------------------------------
    # SKENARIO B: DENGAN PREFIX
    # ---------------------------------------------------------
    print("▶ SKENARIO B: DENGAN PREFIX (Menggunakan awalan 'query: ')")
    formatted_query = f"query: {test_query}"
    vec_with_prefix = embeddings.embed_query(formatted_query)
    docs_b = fetch_documents(vec_with_prefix)
    
    for i, doc in enumerate(docs_b):
        score = doc.get("similarity", 0)
        content = doc.get("content", "").replace('\n', ' ')[:100]
        print(f"  {i+1}. Skor: {score:.4f} | Teks: {content}...")
        
    print(f"\n{'='*60}\n")

if __name__ == "__main__":
    # Ganti dengan pertanyaan yang jawabannya PASTI ada di dokumen Anda
    pertanyaan_tes = [
        "apa itu depresi?",
        "bagaimana cara menangani depresi?",
        "apa bedanya depresi dan sedih biasa?"
    ]
    
    for q in pertanyaan_tes:
        run_ab_test(q)