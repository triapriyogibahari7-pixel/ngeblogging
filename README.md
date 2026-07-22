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

## Deployment produksi

Repository mendukung dua target tanpa menggandakan logika aplikasi:

- **Netlify** tetap dapat dipakai sebagai deployment cadangan.
- **VPS produksi** memakai Docker Compose, Caddy HTTPS, image GHCR, API Nara portable, health check, dan rollback otomatis.

Panduan lengkap dari VPS kosong sampai perpindahan DNS tersedia di [`docs/PRODUCTION_SERVER.md`](docs/PRODUCTION_SERVER.md). Operasional, diagnosis, rollback, dan pemulihan tersedia di [`docs/PRODUCTION_RUNBOOK.md`](docs/PRODUCTION_RUNBOOK.md).

Validasi paket produksi:

```bash
npm run test:production
```

### Deployment Netlify

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
5. Hubungkan Qwen dari region Singapore melalui `QWEN_API_KEY`, `QWEN_WORKSPACE_ID`, dan `QWEN_REGION=singapore`. `QWEN_API_BASE_URL` dibuat otomatis dan hanya diperlukan untuk penyedia lain.
6. Setelah DNS aktif, isi `VITE_PUBLIC_SITE_URL` dan `PUBLIC_SITE_URL` dengan `https://ngeblogging.com`. Callback login akan kembali ke domain Ngeblogging, bukan alamat preview.

Panduan dari pembuatan API key sampai pengujian live tersedia di [`docs/QWEN_SETUP.md`](docs/QWEN_SETUP.md). Status konfigurasi tanpa membuka secret dapat diperiksa melalui `GET /api/nara`.

Endpoint browser untuk Nara adalah `POST /api/nara`. Secret hanya dibaca oleh Netlify Function dan tidak masuk ke bundle browser. Endpoint memverifikasi access token Supabase, menegakkan paket Free/Pro dan kuota harian di database, memvalidasi lampiran, membatasi origin, serta memakai rate limit Netlify.

Pada VPS, endpoint yang sama dijalankan oleh `api/server.mjs`; browser dan UI tidak perlu diubah. API container tidak membuka port publik dan hanya dapat dicapai melalui Caddy. Status server portable tersedia di `GET /api/health`.

## Nara Assistant

- Tersedia bagi pengunjung dan pengguna login melalui tombol mengambang.
- Mendukung kamera, foto, file teks/dokumen, dan pertanyaan suara pada browser yang menyediakan Web Speech API.
- Tingkat Ringan dan Sedang tersedia pada paket Gratis.
- Tingkat Tinggi/Ekstra tinggi serta Nara Writer, Vision, dan Max memerlukan paket Pro.
- Pilihan Pro diperiksa kembali di server; mengubah HTML browser tidak membuka model premium.
- Permintaan akses awal Pro disimpan di `plan_upgrade_requests`. Penagihan baru boleh diaktifkan setelah penyedia pembayaran dan harga final dikonfigurasi.
- Gambar dan file teks dapat diteruskan ke model. File biner seperti PDF/DOCX memerlukan pipeline ekstraksi dokumen sebelum isinya dapat dianalisis penuh.

## Model Nara AI

Model bawaan server benar-benar berbeda: Nara Mini memakai `qwen3.6-flash`, Writer memakai `qwen3.7-plus`, Vision memakai `qwen3-vl-plus`, dan Max memakai `qwen3.7-max`. Tingkat Tinggi dan Ekstra tinggi mengaktifkan deep thinking Qwen, sedangkan Ringan dan Sedang memprioritaskan kecepatan. Netlify menjadi gateway aman; API key tidak pernah dikirim ke browser.

AI menggunakan RAG, memori bertingkat, tool-use, batas penggunaan wajar, serta konfirmasi eksplisit sebelum tindakan berisiko seperti menerbitkan atau menghapus konten.

Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) untuk rancangan teknis dan tahapan implementasi.
