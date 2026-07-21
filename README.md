# Ngeblogging

Platform kehadiran digital berbasis AI untuk kreator, bisnis, media, dan komunitas Indonesia.

## Status

MVP interaktif mencakup landing page responsif, studio dashboard, CRUD artikel dan halaman, editor ribbon dengan autosave, status publikasi, pencarian, 12 tema, autentikasi Google/LinkedIn/email yang siap dikonfigurasi, gateway Nara AI, skema database multi-situs dengan RLS, serta konfigurasi Netlify. Tanpa environment variables, Studio tetap tersedia dalam mode demo lokal.

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
5. Hubungkan endpoint inference OpenAI-compatible untuk Qwen melalui `QWEN_API_BASE_URL`, `QWEN_API_KEY`, dan `QWEN_MODEL`.

Endpoint browser untuk Nara adalah `POST /api/nara`. Secret hanya dibaca oleh Netlify Function dan tidak masuk ke bundle browser.

## Prinsip Nara AI

Qwen3.5-4B adalah model utama yang dijalankan melalui layanan inference terpisah. Netlify menjadi aplikasi dan gateway aman. AI menggunakan RAG, memori bertingkat, tool-use, batas penggunaan wajar, serta konfirmasi eksplisit sebelum tindakan berisiko seperti menerbitkan atau menghapus konten.

Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) untuk rancangan teknis dan tahapan implementasi.
