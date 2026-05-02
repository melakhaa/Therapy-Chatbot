import os, sys, ollama
from docx import Document
from docx.oxml.ns import qn
from dotenv import load_dotenv
from supabase import create_client
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " ", ""]
)

def extract_text_docx(filepath):
    doc = Document(filepath)
    full_text = []

    for block in doc.element.body:
        # Jika block adalah paragraf, gabungkan semua teks di dalamnya
        if block.tag.endswith('}p'):
            text = "".join(node.text or "" for node in block.iter() if node.tag.endswith('}t'))
            if text.strip():
                full_text.append(text.strip())
        # Jika block adalah tabel, gabungkan teks dari setiap sel dengan pemisah "|"
        elif block.tag.endswith('}tbl'):
            for row in block.iter(qn('w:tr')):
                cells = []
                for cell in row.iter(qn('w:tc')):
                    text = "".join(node.text or "" for node in cell.iter() if node.tag.endswith('}t'))
                    if text.strip():
                        cells.append(text.strip())
                if cells:
                    full_text.append(" | ".join(cells))

    return "\n".join(full_text)

def is_useful_chunk(chunk: str) -> bool:
    """Filter chunk sampah: terlalu pendek atau rasio huruf terlalu rendah."""
    text = chunk.strip()
    if len(text) < 50:
        return False
    # Skip chunk yang mayoritas bukan huruf (tabel angka, simbol, dsb)
    alpha_ratio = sum(c.isalpha() or c.isspace() for c in text) / max(len(text), 1)
    if alpha_ratio < 0.4:
        return False
    return True

def embed_and_upload(filepath):
    text = extract_text_docx(filepath)
    chunks = splitter.split_text(text)
    filename = os.path.basename(filepath)

    uploaded = 0
    skipped = 0

    for i, chunk in enumerate(chunks):
        if not is_useful_chunk(chunk):
            print(f"  [SKIP] chunk {i+1}: terlalu pendek atau noisy")
            skipped += 1
            continue

        res = ollama.embed(
            model="nomic-embed-text-v2-moe",
            input=f"passage: {chunk}"
        )
        embedding = res["embeddings"][0]

        supabase.table("documents").insert({
            "content": chunk,
            "embedding": embedding,
            "metadata": {"source": filename, "chunk": i}
        }).execute()

        uploaded += 1
        print(f"  [{filename}] uploaded {uploaded} (chunk {i+1}/{len(chunks)})")

    print(f"  [{filename}] Selesai: {uploaded} uploaded, {skipped} skipped dari {len(chunks)} total chunks")

# --clear flag: hapus semua data lama sebelum re-embed
if "--clear" in sys.argv:
    print("Menghapus semua data lama di tabel documents...")
    supabase.table("documents").delete().neq("document_id", 0).execute()
    print("Data lama dihapus!\n")

# Run semua .docx di folder docs
for filename in os.listdir("docs"):
    if filename.endswith(".docx"):
        print(f"\nMemproses: {filename}")
        embed_and_upload(f"docs/{filename}")

print("\nSelesai!")