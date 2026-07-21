# Ngeblogging

Platform kehadiran digital berbasis AI untuk kreator, bisnis, media, dan komunitas Indonesia.

## Status

MVP interaktif mencakup landing page responsif, studio dashboard, CRUD artikel dan halaman, editor ribbon dengan autosave, status publikasi, pencarian, 12 tema, autentikasi Google/LinkedIn/email yang siap dikonfigurasi, Nara Assistant universal, skema database multi-situs dengan RLS, serta konfigurasi Netlify. Tanpa environment variables, Studio tetap tersedia dalam mode demo lokal.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Pemeriksaan produksi:

```bash
npm run check
npm run build
```

## Deployment Netlify

1. Hubungkan repository ini ke Netlify.
2. Build command: `npm run build`.
3. Publish directory: `dist`.
4. Tambahkan environment variables dari `.env.example` melalui Netlify UI.
5. Jangan pernah menyimpan API key atau secret ke GitHub.

## Mengaktifkan backend

1. Proyek Supabase Ngeblogging sudah memakai migrasi berurutan dalam folder `supabase/migrations`.
2. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` di Netlify. `VITE_SUPABASE_ANON_KEY` hanya disediakan sebagai fallback lama.
3. Aktifkan provider Google dan LinkedIn (OIDC) di Supabase, lalu masukkan client ID/secret dari masing-masing developer console.
4. Tambahkan URL produksi dan preview ke daftar redirect Supabase.
5. Hubungkan endpoint inference OpenAI-compatible untuk Qwen melalui `QWEN_API_BASE_URL`, `QWEN_API_KEY`, dan model Nara pada `.env.example`.
6. Setelah DNS aktif, isi `VITE_PUBLIC_SITE_URL` dan `PUBLIC_SITE_URL` dengan `https://ngeblogging.com`. Callback login akan kembali ke domain Ngeblogging, bukan alamat preview.

Endpoint browser untuk Nara adalah `POST /api/nara`. Secret hanya dibaca oleh Netlify Function dan tidak masuk ke bundle browser. Endpoint memverifikasi access token Supabase, menegakkan paket Free/Pro dan kuota harian di database, memvalidasi lampiran, membatasi origin, serta memakai rate limit Netlify.

## Nara Assistant

- Tersedia bagi pengunjung dan pengguna login melalui tombol mengambang.
- Mendukung kamera, foto, file teks/dokumen, dan pertanyaan suara pada browser yang menyediakan Web Speech API.
- Tingkat Ringan dan Sedang tersedia pada paket Gratis.
- Tingkat Tinggi/Ekstra tinggi serta Nara Writer, Vision, dan Max memerlukan paket Pro.
- Pilihan Pro diperiksa kembali di server; mengubah HTML browser tidak membuka model premium.
- Permintaan akses awal Pro disimpan di `plan_upgrade_requests`. Penagihan baru boleh diaktifkan setelah penyedia pembayaran dan harga final dikonfigurasi.
- Gambar dan file teks dapat diteruskan ke model. File biner seperti PDF/DOCX memerlukan pipeline ekstraksi dokumen sebelum isinya dapat dianalisis penuh.

## Prinsip Nara AI

Qwen3.5-4B adalah model utama yang dijalankan melalui layanan inference terpisah. Netlify menjadi aplikasi dan gateway aman. AI menggunakan RAG, memori bertingkat, tool-use, batas penggunaan wajar, serta konfirmasi eksplisit sebelum tindakan berisiko seperti menerbitkan atau menghapus konten.

Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) untuk rancangan teknis dan tahapan implementasi.
