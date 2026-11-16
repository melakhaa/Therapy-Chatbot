# Rencana perbaikan Semantic Router dan RAG

**Status: dieksekusi 16 November 2026 (Tahap 1, 2, 3, 5). Tahap 4 — biaya generasi dan SLA
<40 detik — sengaja ditunda atas permintaan; angka generasi di bawah bukan gate kelulusan.**
Disusun dari pengujian ulang dan diagnosis read-only pada commit
`19a46fc0a64ff6af5a6723a7d226a95cd1c3c3d5`.
Tujuan: memperbaiki kegagalan nyata sampai seluruh gate yang disepakati lulus, tanpa menurunkan
ambang kelulusan tes, mengubah label agar cocok dengan prediksi, menyembunyikan error, atau
menghafalkan dataset.
Lulus pada dataset terbatas bukan jaminan ketepatan 100% untuk semua pesan pengguna.

Dokumen terkait:
- [Rencana pengujian/coverage](rag-semantic-routing-test-plan.md).
- [Panduan menjalankan tes](rag-semantic-routing-testing.md).
- [C500](C500_Sajiwa_Pengujian_Produk.md): hasil historis, jangan ditimpa sebelum ada bukti baru.
- [Aturan pengujian dan TDD](testing-conventions.md).

## 0. Hasil eksekusi

Gate yang dibekukan di §3, diukur ulang lewat router dan korpus nyata:

| Gate | Sebelum | Sesudah | Status |
| --- | --- | --- | --- |
| Router makro precision (set regresi 100 pesan) | 85,65% | 100% | lulus |
| Router makro recall | 76% | 100% | lulus |
| Parafrasa konsisten dan benar | 8/8 konsisten, 7/8 benar | 8/8 dan 8/8 | lulus |
| Held-out v1 (dipakai sekali untuk analisis error) | — | P 97,7% / R 97,5% | lulus ambang, bukan set bersih |
| Held-out v2 (dikumpulkan setelah perbaikan keselamatan) | — | P 95,8% / R 95,0% | lulus |
| Hit Rate@5 | 12/15 (80,0%) | 13/15 (86,7%) | lulus |
| Luar domain tanpa konteks | 5/5 | 5/5 | lulus |
| Latensi retrieval | maks 0,075 dtk | maks 0,075 dtk | lulus (<3 dtk) |
| Streaming integrasi | 4 assertion gagal (timeout 60 dtk) | lulus penuh | lulus |
| `npm test` | lulus | lulus (172 tes backend + workspace) | lulus |
| `npm run test:integration` | gagal | lulus tanpa SKIP | lulus |

Perubahan yang menghasilkan angka itu:

1. `guardrail.is_crisis` — frasa krisis implisit ditambah (keinginan menghilang, tidak bangun
   lagi, lompat dari balkon/atap, menenggak semua obat, hidup tidak berarti, menyudahi
   semuanya). Dua frasa (`capek hidup`, `melukai keluarga`) dikeluarkan dari **utterance rute**
   karena menarik pesan biasa ("capek menghadapi tugas", "ingin pulang bertemu keluarga") ke
   jalur krisis; keduanya tetap di `CRISIS_PHRASES`, jadi deteksi deterministik tidak melemah.
2. `guardrail.strip_profanity` — tidak lagi memakai normalisasi krisis pada seluruh teks, jadi
   "gangguan", "SSRI", "PHQ-9" dan "minggu" tidak lagi dirusak sebelum retrieval; pesan tanpa
   makian dikembalikan apa adanya.
3. Router — `top_k=10`, `aggregation="max"`, threshold per rute (`core.ROUTE_THRESHOLDS`).
   Utterance provenance ditambah untuk pertanyaan sumber/kredensial yang menyebut topik.
4. Retrieval — `retrieve_docs` menambahkan potongan tetangga (`NEIGHBOUR_WING=150`) pada setiap
   hit, tetap maksimal `k` entri dan bentuk respons yang sama.
5. Ingestion — `scripts/embed.py` tidak lagi menulis DB saat diimpor, default dry-run,
   penggantian per sumber atomik dengan backup JSON, dan migration 012 memberi policy delete
   yang hanya aktif saat transaksi ingestion menyalakan flag-nya.
6. Streaming — timeout client Ollama 60 → 300 detik (jawaban nyata 81–181 detik di mesin CPU
   referensi) dan exception generasi dicatat beserta rute.

**Yang sengaja tidak dikerjakan:** gate latensi <40 detik (Tahap 4), review independen label
fixture oleh peninjau manusia, review grounding isi jawaban, uji load, dan uji outage proses
terpisah. Dataset `regression` dipakai untuk kalibrasi dan `heldout_v1` dipakai sekali untuk
analisis error, jadi keduanya bukan bukti generalisasi murni; `heldout_v2` adalah set paling
bersih yang tersedia. Dua miss retrieval yang tersisa (dampak depresi sedang, penanganan
self-stigma) berakar pada isi tabel yang padat dan peringkat 8, bukan pada batas chunking.

## 1. Baseline dan bukti

| Area | Hasil aktual | Penilaian |
| --- | --- | --- |
| Router, 100 pesan / 25 per kelas | Akurasi 76%; precision makro 85,65%; recall makro 76% | Gagal gate precision **dan** recall ≥85% |
| RAG/provenance sebagai rute | Recall 68% / 44% | Banyak pertanyaan faktual dan sumber jatuh ke conversational |
| Guardrail | 24/25 krisis benar; satu pesan curhat biasa salah diarahkan ke guardrail | False negative dan false positive harus ditangani terpisah |
| Parafrasa | 8/8 kelompok konsisten, tetapi hanya 7/8 kelompok benar; 35/40 kalimat benar | Konsistensi saja bukan keberhasilan |
| Retrieval | Hit Rate@5 12/15 = 80%; 5/5 luar domain tanpa konteks | Lulus tepat ambang, belum memiliki margin |
| Batas retrieval | k=5, semua skor hasil >0,3; korpus 115 chunk berdimensi 768 | Sudah lulus, pertahankan |
| Waktu retrieval HTTP | Rata-rata 0,0611 dtk; maksimum 0,0715 dtk / 20 kueri | Lulus <3 dtk; pengukuran warm, satu klien |
| Sitasi | 4/4 jawaban aktual mencantumkan sumber di awal | Lulus sitasi; kebenaran dukungan isi belum dinilai independen |
| Generasi RAG | TTFT 55,40–57,91 dtk; selesai 81,52–180,66 dtk | 0/4 memenuhi total <40 dtk |
| Integrasi streaming | Sekali `generation_failed` sekitar 60,36 dtk, menghasilkan empat assertion gagal | Belum stabil; jangan menghapus hasil gagal karena run lain berhasil |
| Kontrak/unit | 30 tes fokus + 15 tes sementara lulus; `npm test` lulus | Jangan dirusak oleh optimasi |
| DB/RLS/cleanup | Self-check RLS lulus; akun uji dihapus; checksum korpus tetap | Pertahankan isolasi dan cleanup |

Bukti sementara di `/tmp/sajiwa-rag-router-checks/`:
`results.json`, `live-results.json`, `fixtures.json`, `rag-fixtures.json`,
`integration-live.log`, `diagnosis.json`, `results.md`, dan `live-follow-up.md`.
File `/tmp` bukan arsip permanen. Angka ringkas di atas dicatat di sini agar diagnosis tidak
hilang; runner/fixture yang layak harus dipindahkan ke repo pada tahap implementasi.

Dataset ini baseline eksploratif baru, **bukan** dataset asli C500. Label dan oracle relevansi
berbasis frasa belum ditinjau independen. Model/dependensi juga berbeda dari lingkungan
historis C500. Perbandingan bukan bukti regresi antarversi tanpa eksperimen terkontrol.

## 2. Kelemahan yang ditemukan

### A. Router: threshold/agregasi dan cakupan utterance

**Terukur:** seluruh rute memakai threshold 0,5, `top_k=5`, agregasi `mean`.
Jumlah utterance: guardrail 34, conversational 14, RAG 10, provenance 11.
Pada 21 dari 24 kegagalan klasifikasi, hasil router mentah adalah `None`; lapisan HTTP kemudian
menggunakan fallback conversational. Jadi tidak semuanya berarti model memilih conversational.

Contoh diagnosis tanpa mengubah router:
- Pertanyaan gangguan kecemasan menyeluruh: kecocokan RAG tertinggi **0,5720**, tetapi rata-rata
  lima kandidat **0,4020**, sehingga ditolak threshold 0,5.
- Pertanyaan jumlah klien yang pernah ditangani: kecocokan provenance tertinggi **0,6851**,
  tetapi rata-rata kandidat provenance **0,4489**, lalu fallback.
- Pertanyaan hubungan stres dengan kesehatan mental: RAG **0,5274** kalah tipis dari
  conversational **0,5364**; ini salah pemilihan rute, bukan kegagalan threshold.
- Pertanyaan asal pengetahuan tentang depresi: lima kandidat teratas seluruhnya RAG;
  intent sumber kalah oleh kemiripan topik depresi.

**Bukti kode:** `core.py` memakai default encoder/router. Utterance di `rag.py` berpusat pada
pertanyaan depresi; variasi sumber, identitas, pengalaman klinis di `provenance.py` terbatas.
Utterance conversational `kamu siapa?` juga berdekatan dengan intent identitas provenance.

**Kesimpulan:** perlu kalibrasi agregasi dan threshold keputusan per rute beserta cakupan
utterance yang lebih representatif. Threshold keputusan router boleh dikalibrasi pada development
set; ambang kelulusan evaluasi tidak diubah. Menurunkan semua threshold keputusan sekaligus
bukan solusi: false positive bisa naik.
Encoder Ollama versi terpasang mengirim teks mentah tanpa task prefix, berbeda dari jalur RAG.
Pengaruh prefix terhadap klasifikasi **belum dibuktikan**; hanya eksperimen terkontrol, bukan
alasan langsung mengubah seluruh encoder atau vektor korpus.

### B. Guardrail: krisis implisit terlewat, kemiripan curhat terlalu mudah dianggap krisis

- `Hidupku gak ada artinya, mending aku gak ada.` tidak tertangkap gate deterministik;
  skor rata-rata guardrail **0,4621**, lalu fallback conversational.
- `Aku sedang capek menghadapi tugas yang menumpuk.` tidak cocok gate deterministik, tetapi
  satu kandidat guardrail memiliki skor **0,5129**, sehingga rute guardrail menang.

Kedua kegagalan memiliki mekanisme berbeda. Menurunkan threshold guardrail agar kasus pertama
lulus tidak memperbaiki kasus kedua. Pola krisis perlu mempertimbangkan konteks keinginan
menghilang/meninggal, bukan semua kemunculan kata `capek`, `sedih`, atau `tidak berarti`.
Jangan mengendurkan deteksi krisis eksplisit untuk mengejar precision.

### C. RAG: jawaban tersedia, tetapi konteks tabel/kalimat pecah

Diagnosis membandingkan hasil retrieval dengan **exact scan seluruh 115 chunk**, bukan hanya
hasil indeks HNSW. Top-5 exact sama dengan top-5 aktual untuk ketiga kegagalan berikut:

| Kueri gagal | Chunk referensi, indeks metadata berbasis nol | Peringkat exact / similarity | Temuan |
| --- | --- | --- | --- |
| Dampak depresi sedang terhadap aktivitas | 30 | 52 / 0,3911 | Isi baris fungsi terpisah dari label kategori/kolom; awalan chunk terpotong |
| Materi psikoedukasi | 61 | 74 / 0,3678 | Chunk 60 terambil, tetapi daftar regulasi diri/manajemen stres lanjut di chunk 61 |
| Penanganan self-stigma | 77 dan 78 | 8 / 0,4897 dan 42 / 0,4169 | Jawaban terbelah dan bercampur bagian pemantauan lain |

`embed.py` meratakan paragraf/tabel menjadi satu string lalu memotong setiap 500 karakter,
overlap 50. Heading dan hubungan header–sel tidak dipertahankan per chunk; beberapa batas
memotong kata/kalimat. Ini kandidat penyebab struktural yang didukung isi chunk dan peringkat,
bukan sekadar kekurangan threshold. Semua chunk referensi di atas sudah memiliki skor >0,3.

**Implikasi:** menurunkan threshold 0,3 tidak akan memasukkan peringkat 52/74 ke top-5.
Menaikkan k atau mengganti indeks juga bukan langkah pertama; biaya prompt bisa naik.
Oracle frasa tetap perlu ditinjau: hasil yang mendukung sebagian jawaban belum tentu sepenuhnya
salah, tetapi tidak otomatis memenuhi informasi spesifik yang ditanyakan.

### D. Generasi: bottleneck model/perangkat, bukan similarity search

- Pemeriksaan Ollama setelah run menunjukkan model `llama3-8b-instruct:Q4_K_M` memakai
  **100% CPU**, `size_vram=0`, sekitar 5,6 GB, `num_ctx=4096`.
- Perangkat yang diamati: Ryzen 5 7520U, 8 logical CPU, sekitar 14 GiB RAM.
- Retrieval sekitar 61 ms, tetapi token pertama sekitar 57 detik. Output aktual panjangnya
  370–1.329 karakter; konfigurasi tidak menetapkan `num_predict` atau instruksi jawaban ringkas.
- RAG memasukkan semua lima chunk beserta label sumber; `history.py` mengizinkan tambahan
  4.000 karakter. Batas history tersebut bukan anggaran gabungan seluruh prompt.
  **Run empat jawaban ini tanpa history**, jadi history bukan penyebab terukur pada run itu.

**Kesimpulan:** pemangkasan output saja tidak cukup, karena TTFT sudah >40 detik. Perlu profil
prompt evaluation, decoding, pemuatan model dan antrean, lalu optimasi input/perangkat/model.
Keberhasilan model 8B <40 detik pada CPU ini **belum dapat dijanjikan**.

### E. Streaming: empat assertion gagal, kemungkinan satu akar generasi gagal

Run integrasi gagal pada token, `[DONE]`, waktu kedatangan token, dan persistensi assistant.
Keempatnya mengikuti satu `generation_failed` setelah sekitar 60,36 detik. Timeout client
Ollama dikonfigurasi 60 detik, sehingga read timeout merupakan dugaan kuat, **belum terbukti**:
`routes/chat.py` menangkap exception generasi tanpa mencatat tipe penyebabnya.

Tidak menyimpan jawaban assistant yang belum selesai dan tidak mengirim `[DONE]` setelah error
adalah perilaku yang benar. Jangan mengubahnya demi meluluskan assertion jalur sukses.
Menambah timeout dapat mengurangi error tetapi tidak memenuhi SLA <40 detik.

### F. Risiko tambahan: pembersihan makian mengubah istilah medis

`core.chat_stream()` memanggil `strip_profanity()` sebelum retrieval/generasi. Fungsi itu memakai
normalisasi krisis untuk seluruh teks, bukan hanya token makian. Hasil teramati:
- `gangguan` menjadi `ganguan`;
- `SSRI` menjadi `sri`;
- `PHQ-9` menjadi `phq 9`;
- `minggu` menjadi `mingu`.

`/rag/context` memakai teks asli, sedangkan RAG lewat `/chat` memakai teks yang berubah.
Ini risiko perbedaan retrieval antarjalur yang terkonfirmasi; besar pengaruhnya pada kualitas
belum diukur. Perbaiki tanpa menghilangkan normalisasi deteksi krisis/variasi makian.

## 3. Kriteria keberhasilan yang dibekukan sebelum implementasi

| Gate | Kriteria |
| --- | --- |
| Regresi deterministik dan keselamatan | Seluruh assertion kontrak lulus; krisis eksplisit/implisit yang sudah dilabeli berisiko tidak lolos ke LLM; kasus curhat negatif yang disepakati tetap normal |
| Router C500 | Precision makro dan recall makro masing-masing ≥85%, bukan hanya akurasi |
| Regresi salah-rute yang diketahui | Semua kasus gagal yang telah disepakati labelnya diperbaiki; tidak mengorbankan kasus lama yang benar |
| Target tambahan per kelas | Usulan: precision dan recall tiap kelas ≥85% pada held-out baru; laporkan terpisah dari gate makro asli C500 |
| Parafrasa | 8/8 kelompok konsisten **dan benar**; 40/40 kalimat pada set regresi tetap benar |
| Retrieval | Hit Rate@5 ≥80% pada set beku; target engineering ≥14/15 sebagai margin, bukan mengganti ambang C500. Usahakan ketiga miss teratasi tanpa regresi |
| Domain/no-context | 5/5 luar domain tanpa konteks; fixed reply tanpa LLM; fakta di luar isi korpus tidak boleh diarang |
| Sitasi/grounding | 4/4 jawaban selesai dan mencantumkan sumber; review bahwa klaim utama didukung konteks, tanpa nasihat medis yang tidak didukung |
| Latensi retrieval | Setiap 20 kueri <3 dtk, termasuk embedding; error tetap kegagalan, bukan sampel yang dibuang |
| Latensi jawaban | Setiap empat kasus RAG selesai <40 dtk pada perangkat/config target; token pertama bukan pengganti waktu selesai |
| Stabilitas | Seluruh skenario sukses selesai tanpa error; error yang sengaja diinjeksi menghasilkan kontrak error yang benar; cleanup/RLS lulus |
| Regresi repo | `npm test` dan `npm run test:integration` lulus tanpa SKIP; evaluator mutu/performa juga nonzero bila gate gagal |

Semua gate inti harus lulus untuk menyatakan pekerjaan selesai. Target engineering tambahan
bukan angka keberhasilan yang boleh diklaim sebelum diukur. Ulangi pengujian generasi pada
minimal tiga putaran berurutan; laporkan setiap putaran, bukan memilih yang tercepat.
Pisahkan run cold dan warm. Jika target <40 detik diharapkan juga cold, ukur dan tuntaskan itu;
jangan menyembunyikan startup di luar stopwatch tanpa mencatat cakupan pengukuran.

## 4. Urutan implementasi: satu slice test-first setiap kali

### Tahap 0 — Jadikan hasil dapat direproduksi

- [ ] Review label ambigu dan relevansi terhadap DOCX bersama peninjau; simpan alasan dan versi
  fixture. Koreksi kesalahan oracle harus transparan dan menghasilkan versi baseline baru,
  bukan diam-diam mengubah hasil lama menjadi lulus.
- [x] Pindahkan runner/fixture sementara yang diperlukan ke `apps/backend/tests/integration/`
  dan fixture sintetisnya. Jadikan satu evaluator menggabungkan **semua** gate, termasuk
  macro/per-class router dan ketepatan parafrasa. Runner sementara `run_live.py` hanya mencatat
  ulang akurasi; exit statusnya belum mencakup gate mutu router tersebut.
- [x] Pisahkan dataset utterance/tuning dari evaluasi. Set 100+40 yang sudah dilihat menjadi
  regression set; buat held-out baru dengan label ditetapkan sebelum tuning. Jangan menyalin
  kalimat pengujian ke utterance dan menyebutnya generalisasi.
- [ ] Tambahkan self-check perhitungan confusion matrix, macro-F1, recall, Hit Rate dan p95
  dengan contoh literal; bedakan SKIP, kegagalan setup, error request dan kegagalan mutu.
- [ ] Simpan commit, versi dependency/model, fingerprint corpus, parameter, hardware dan
  hasil per kasus. Jangan merekam JWT, rahasia atau percakapan nyata.

### Tahap 1 — Tutup celah keselamatan dan jaga teks pengguna

- [x] Red: reproduksi krisis implisit yang lolos serta pasangan curhat nonkrisis pada seam
  `is_crisis`/HTTP. Green: perluas pola deterministik secara sempit dan tambah variasi
  utterance krisis yang wajar; jangan memakai keyword `capek` sebagai pemicu umum.
- [x] Tambahkan kasus kontras krisis eksplisit, idiom sehari-hari, pertanyaan edukasi,
  negasi/kutipan, dan makian bercampur krisis. Tinjau kebijakan negasi dengan peninjau;
  jangan membalik kebijakan konservatif lama hanya demi menurunkan false positive.
- [x] Red: istilah medis dan pesan bersih tidak berubah oleh penghapusan makian. Green:
  gunakan normalisasi untuk mengenali token makian, pertahankan teks token nonmakian.
  Deteksi krisis tetap berjalan sebelum pembersihan.
- [x] Jalankan ulang tes makian/guardrail/history serta perbandingan konteks `/rag/context`
  dengan jalur chat untuk pertanyaan bersih yang sama.

### Tahap 2 — Kalibrasi router, bukan menambah classifier baru

- [x] Buat pasangan pertanyaan fakta vs curhat pribadi, sumber/identitas vs topik kesehatan,
  serta capek akademik vs keinginan mati pada development set.
- [x] Perluas utterance RAG untuk kecemasan, terapi, skrining, rujukan dan konseling; provenance
  untuk identitas AI, kredensial, pengalaman klinis dan sumber jawaban; conversational untuk
  variasi curhat mahasiswa. Utterance harus baru, bukan salinan regression/held-out set.
- [x] Tetapkan batas intent `kamu siapa?` vs pertanyaan kredensial/identitas sebelum mengubah
  utterance yang saling bertabrakan. Semua pertanyaan sumber eksplisit harus tetap dijawab
  dari dokumen nyata lewat handler provenance, bukan klaim generatif.
- [x] Bandingkan baseline `mean` dengan opsi agregasi library yang tersedia dan threshold
  per rute pada development set. Pilih perubahan terkecil yang memperbaiki recall tanpa
  mengorbankan precision/safety; baru validasi pada held-out.
- [x] Jika perlu, uji encoder dengan task prefix secara terpisah dari perubahan utterance.
  Rebuild indeks route hanya untuk eksperimen itu; jangan otomatis re-embed corpus RAG
  yang sudah memakai prefix benar. Tidak perlu dependency encoder baru untuk langkah awal.
- [x] Hanya bila masih diperlukan, evaluasi aturan sempit untuk intent identitas/sumber yang
  eksplisit. Jangan memakai aturan `semua pertanyaan → RAG` atau `semua kamu → provenance`.
- [x] Freeze konfigurasi kandidat sebelum menjalankan final evaluation; laporkan matrix,
  raw no-match vs salah-rute, nilai per kelas, dan dua metrik parafrasa.

### Tahap 3 — Perbaiki konteks ingestion/retrieval tanpa memperbesar prompt membabi buta

- [x] Red: fixture DOCX kecil dengan heading, tabel beberapa kolom, sel kosong/merged dan
  baris panjang tetap mempertahankan hubungan kategori–jawaban setelah ekstraksi/chunking.
- [x] Green: pisahkan entry point `embed.py` agar import tidak menulis DB; pertahankan batas
  paragraf/kalimat dan konteks heading/header pada chunk. Hindari potongan kata dan angka
  kategori yang kehilangan kolom asal. Gunakan `python-docx` yang sudah terpasang.
- [x] Pertahankan batas 500 karakter dan kontrak overlap 50 yang sekarang diuji pada baseline.
  Bila strategi struktur memerlukan kontrak lain, ajukan eksplisit dan simpan perbandingan
  baseline; jangan mengubah ukuran tersembunyi untuk meluluskan C500 lama.
- [x] Buat re-ingestion aman dan atomik per sumber: siapkan embedding baru sebelum mengganti
  dokumen lama, verifikasi dimensi/citation, rollback bila gagal. Jangan menjalankan loop
  insert lama berulang atau menghapus seluruh tabel. Uji tidak ada duplikasi dan corpus lama
  tetap bisa dipakai bila embedding/upload gagal.
- [x] Uji corpus kandidat di DB disposable, bukan langsung mengganti corpus pengguna.
  Bandingkan rank jawaban tiga miss, Hit Rate@5, false positive luar domain, prompt size,
  latency dan kualitas jawaban; simpan mapping sumber/chunk versi baru.
- [x] Jika struktur belum cukup, evaluasi kandidat retrieval lebih luas **lalu pilih maksimal
  lima konteks** dengan konteks tetangga atau ranking leksikal sederhana. K=8 saja hanya
  berpotensi membantu self-stigma, bukan rank 52/74. Jangan tambah reranker/layanan baru
  sebelum alternatif kecil dibuktikan tidak cukup.
- [x] Bedakan kandidat internal dengan lima hasil final; k/threshold kontrak publik tetap
  jelas dan tidak ada trik menambah jumlah jawaban yang dihitung sebagai Hit Rate@5.

### Tahap 4 — Kurangi biaya generasi dan buktikan kelayakan perangkat

**Ditunda atas permintaan:** target <40 detik adalah masalah terpisah. Semua butir di bawah
belum dieksekusi dan tidak boleh diklaim lulus.

Tahap profiling dapat dimulai lebih awal setelah baseline beku karena hambatan perangkat
bisa menentukan kelayakan SLA; jangan menunggu seluruh tuning selesai untuk mengetahuinya.

- [ ] Tambahkan pengukuran minimal fase retrieval, prompt evaluation, model load/queue,
  first token dan decoding; gunakan metadata timing Ollama bila tersedia. Catat tipe
  exception dan durasi secara aman, tanpa prompt/response mentah atau rahasia.
- [ ] Uji konfigurasi 8B saat ini sebagai kontrol. Ukur jumlah token prompt/output, throughput,
  CPU/GPU dan memori; jangan menyimpulkan semua TTFT berasal dari model load.
- [ ] Kurangi konteks berulang/tidak relevan dan label sumber duplikat tanpa membuang informasi
  yang diperlukan. Tetapkan anggaran gabungan system + konteks + history + jawaban.
- [ ] Instruksikan jawaban ringkas yang tetap lengkap, bersitasi dan aman. Eksperimen batas
  generasi hanya setelah mengukur kebutuhan jawaban; keluaran terpotong karena limit tidak
  boleh dihitung sebagai jawaban selesai yang berkualitas.
- [ ] Pertahankan retrieval k=5 untuk evaluasi; pemilihan konteks generasi, jika berubah,
  harus eksplisit dan diuji groundedness-nya. Jangan mempercepat dengan menghilangkan RAG.
- [ ] Decision gate perangkat/model: bila TTFT 8B tetap >40 dtk, optimasi panjang output
  tidak mungkin memenuhi target total. Pilih GPU yang sesuai untuk model tim, atau minta
  persetujuan mengevaluasi model lokal lebih ringan (mis. `llama3.2:3b` yang sudah terpasang).
  Model ringan bukan pengganti otomatis: ulangi kualitas bahasa, grounding, sitasi dan safety.
  Catat sebagai konfigurasi baru; jangan mengklaimnya hasil model fine-tune 8B.
- [ ] Jangan menaikkan ambang 40 detik, menyajikan jawaban hardcoded untuk empat pertanyaan,
  atau melakukan cache khusus dataset agar benchmark terlihat cepat.

### Tahap 5 — Stabilitas streaming dan full regression

- [x] Red: bedakan kegagalan embedding, retrieval DB, generasi sebelum token dan setelah
  sebagian token. Capture exception type agar dugaan timeout integrasi dapat dibuktikan.
- [x] Green: perbaiki akar latensi/timeout pada batas yang terukur. Pertahankan error frame,
  tidak ada `[DONE]` sukses saat gagal, dan tidak menyimpan assistant parsial.
- [x] Ulangi skenario streaming sukses dengan session baru, prompt yang sama dan kondisi
  cold/warm tercatat. Pastikan metadata, token, DONE, persistensi lengkap, history dan RLS.
  Jangan memecah satu respons menjadi token palsu agar assertion banyak token lulus.
- [x] Jalankan `npm test`, `npm run test:integration`, evaluator khusus, dan ulang generasi
  minimal tiga putaran tanpa beban uji lain. Run sukses tidak menghapus bukti run gagal.
- [x] Update panduan run (C500 **tidak** diubah: hasil historisnya tetap, hasil baru ada di §0
  dokumen ini). Gate inti sudah lulus; sisa pekerjaan Tahap 0/4 dicatat di bawah.

## 5. Seam, file terdampak dan batas perubahan

Implementasi mengikuti loop **satu failing test → perbaikan minimum → regression**, bukan
menulis seluruh kode dahulu. Tes karakterisasi yang sudah hijau jangan diklaim sebagai TDD.
Seam baru perlu disepakati dan dicatat dalam `testing-conventions.md` sebelum tes permanen.

| Seam/file | Tier dan cakupan | Yang tidak dibuktikan |
| --- | --- | --- |
| `guardrail.py`: `is_crisis`, `strip_profanity` | Unit, seam sudah disepakati; safety dan pemeliharaan teks | Akurasi embedding pada ungkapan baru |
| `core.py`: `semantic_router`, `chat_stream` | Seam unit tambahan untuk dispatch/bypass, perlu dicatat; fake hanya DB/Ollama | Kualitas model nyata |
| `rag.py`: `build_messages` | Unit existing; struktur prompt, sumber dan no-context | Retrieval aktual dan kepatuhan LLM |
| `embed.py`: ekstraksi/chunking/ingestion | Seam tambahan; unit format dan integration penulisan atomik | Mutu jawaban model |
| API `/router/intent`, `/rag/context`, `/chat`, `/chat/stream` | Integration live; boundary yang sudah disepakati | UI mobile, generalisasi di luar fixture |
| `llm.py`, `history.py` | Konfigurasi/performa serta budget dengan tes unit existing + live | Jaminan latency lintas perangkat |

Scope implementasi yang harus ditelusuri bersama:
- `apps/backend/services/chatbot/{core,guardrail,rag,provenance,conversational,llm,history}.py`
  sesuai slice yang memang dibutuhkan, tidak semuanya otomatis diubah.
- Callers: `apps/backend/routes/chat.py` dan `apps/backend/scripts/embed.py`;
  `scripts/test_rag_performance.py` hanya diagnostic, bukan gate C500.
- Tes unit guardrail, provenance, citation, history, streaming dan session; smoke integration;
  fixture/evaluator baru dan instruksi run.
- `docs/semantic-router-conventions.md`, `docs/ollama-conventions.md`, panduan pengujian,
  dan C500 bila behavior/config atau hasil resmi berubah.
- DB migration **hanya jika benar-benar membutuhkan perubahan schema/SQL**. Diagnosis saat ini
  tidak menunjukkan perlunya mengganti pgvector/HNSW. Backfill/re-ingestion tidak boleh
  menyentuh data mahasiswa atau menghapus sumber lain.

Tetap pertahankan nama rute dan bentuk JSON/SSE, autentikasi/RLS, enkripsi, fixed crisis/provenance
response, metadata citation, serta opsi model yang dipakai deployment. Tidak ada perubahan
mobile/dashboard yang direncanakan; jika kontrak harus berubah, scope dan caller perlu ditinjau ulang.

## 6. Risiko dan keputusan sebelum eksekusi

1. **SLA hardware (belum diukur ulang):** dengan model 8B CPU-only, hasil <40 dtk belum
   terbukti layak. Perubahan model/hardware perlu persetujuan dan evaluasi mutu baru; tidak
   boleh dijanjikan pasti lulus. Setelah perubahan ini, konteks RAG sedikit lebih panjang
   (potongan tetangga), jadi ukur ulang sebelum memutuskan model/perangkat.
2. **Overfitting:** dataset yang sudah dilihat bukan held-out lagi. Jangan menjadikan kenaikan
   skor regresi satu-satunya bukti. Bekukan held-out baru dan minta review label.
3. **Safety:** jangan mengorbankan recall krisis untuk akurasi rata-rata; tangani negasi/kutipan
   secara konservatif dan berdasarkan kebijakan yang disetujui, bukan shortcut regex luas.
4. **Corpus:** perubahan chunking memerlukan embedding ulang dan fingerprint baru. Lakukan
   backup/replace per sumber secara atomik; jangan menaikkan jumlah chunk lewat duplikasi.
5. **Grounding:** review isi jawaban belum selesai. Empat sitasi yang benar tidak membuktikan
   empat jawaban bebas klaim tak berdasar atau aman secara klinis.
6. **Batas janji:** “semua lulus” berarti semua gate/test yang telah disepakati pada konfigurasi
   yang dicatat. Kegagalan tersisa tetap ditulis apa adanya; bukan mengganti expected output.

**Langkah berikut:** Tahap 0 yang tersisa (review label oleh peninjau, self-check literal untuk
rumus metrik, pencatatan fingerprint/commit di repo) dan Tahap 4 (SLA generasi) — keduanya
belum dikerjakan. Perubahan yang sudah masuk: `guardrail.py`, `core.py`, `rag.py`,
`provenance.py`, `routes/chat.py`, `llm.py`, `scripts/embed.py`,
`db/migrations/012_documents_ingest_replace.sql`, dua evaluator di `tests/integration/`,
fixture-nya, dan dokumentasi terkait.
