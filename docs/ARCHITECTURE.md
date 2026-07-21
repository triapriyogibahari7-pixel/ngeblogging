# Arsitektur Ngeblogging

## Sasaran produk

Ngeblogging adalah platform multi-situs untuk menulis, menerbitkan, membangun audiens, dan mengelola kehadiran digital. Produk dibangun bertahap: fondasi antarmuka, MVP publikasi, pertumbuhan, lalu ekosistem.

## Komponen produksi

- **Web:** React + Vite, di-deploy ke Netlify.
- **Backend:** Netlify Functions sebagai API gateway dan tempat validasi izin.
- **Data/Auth/Storage:** Supabase PostgreSQL, Auth, Storage, dan row-level security.
- **AI:** Qwen3.5-4B pada penyedia inference GPU terpisah; tidak dijalankan di browser.
- **Knowledge:** pgvector untuk RAG per situs dan per pengguna.
- **Observability:** log terstruktur, error monitoring, metrik latensi dan biaya.

## Editor dokumen profesional

Studio artikel dan pages memakai Tiptap/ProseMirror dengan ribbon toolbar, gaya dokumen, tabel dan formula dasar, komentar, track changes, version history, autosave, kolaborasi real-time, impor DOCX, serta ekspor HTML/PDF.

## Autentikasi

Supabase Auth menyediakan email/password, magic link, Google OAuth, dan LinkedIn OpenID Connect. Implementasi memakai PKCE, allowlist callback URL, session rotation, account linking, audit login, dan row-level security. Client secret hanya disimpan sebagai environment variable.

## Dua belas tema awal

Editorial, Personal, Business, Newsroom, Portfolio, Magazine, Minimal, Creator, Community, Knowledge Base, Newsletter, dan Organization. Semua responsif, aksesibel, dapat dikustomisasi, dan memakai content schema yang sama.

## Strategi skala

Target jangka panjang adalah ratusan juta akun, tetapi kapasitas hanya dinyatakan setelah load test. Arsitektur memakai CDN/edge cache, pemisahan tenant, read replica, partitioning, queue, object storage, rate limiting, multi-region disaster recovery, autoscaling inference pool, model routing, semantic cache, circuit breaker, dan graceful degradation. Netlify adalah lapisan web/edge awal, bukan satu-satunya server untuk seluruh skala.

## Batas keamanan AI

1. Secret hanya tersedia di server.
2. Semua tool memeriksa user, workspace, peran, dan resource.
3. Draft boleh dibuat langsung; publikasi, penghapusan, perubahan domain, dan undangan tim membutuhkan konfirmasi.
4. Memori dipisahkan antar pengguna dan situs menggunakan RLS.
5. Pengguna dapat melihat, mengubah, mengekspor, dan menghapus memori.
6. Jawaban faktual terbaru harus menggunakan pencarian/RAG dan menyertakan sumber.

## Memori bertingkat

- Context window untuk percakapan aktif.
- Ringkasan percakapan untuk kesinambungan.
- Profil eksplisit: bahasa, gaya, tujuan, dan preferensi.
- Project memory: aturan merek dan kalender editorial tiap situs.
- Knowledge memory: embedding artikel, halaman, dan dokumen.
- Audit trail untuk tindakan agent.

## Roadmap

### Fase 1 — Fondasi (selesai)

Brand, landing page, demo dashboard, konfigurasi Netlify, dokumentasi dan batas keamanan.

### Fase 2 — MVP operasional (sedang berjalan)

Skema Supabase/RLS, OAuth UI, dan gateway Nara sudah tersedia. Berikutnya: sinkronisasi CRUD ke Supabase, onboarding, editor Tiptap, kategori/tag, media, publikasi publik, profil, dan Nara untuk drafting dengan konteks dokumen.

### Fase 3 — Pertumbuhan

Tim dan RBAC, komentar, newsletter, analitik, revisi, custom domain, impor WordPress, billing opsional, dan RAG situs.

### Fase 4 — Platform

Komunitas, marketplace, API publik, otomasi editorial, aplikasi PWA, monetisasi kreator, dan routing model AI adaptif.

## Realitas layanan gratis

Fitur inti dapat digratiskan untuk pengguna, tetapi komputasi GPU, penyimpanan, bandwidth, dan perlindungan penyalahgunaan tetap memiliki biaya operasional. Sistem mempertahankan akses gratis melalui cache, model routing, rate limit adil, antrean, RAG yang hemat konteks, dan sumber pendanaan berkelanjutan. Tidak ada klaim akurasi sempurna; kualitas dibuktikan melalui eval dan pengujian nyata.
