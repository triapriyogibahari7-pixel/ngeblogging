# Ngeblogging

Platform kehadiran digital berbasis AI untuk kreator, bisnis, media, dan komunitas Indonesia.

## Status

MVP operasional mencakup landing page responsif, dashboard dengan navigasi mobile, CRUD artikel/halaman tersinkron Supabase, cursor pagination, editor ribbon dengan autosave dan pratinjau perangkat, status publikasi, pencarian server, Theme Studio Pro dengan 12 tema, backup/impor/pemulihan/Edit HTML sandbox, peluncuran situs publik melalui subdomain, autentikasi sosial/email, Nara Assistant universal, serta skema multi-situs dengan RLS. Tanpa environment variables, Studio tetap tersedia dalam mode demo lokal.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Menjalankan aplikasi dan Worker Cloudflare secara lokal:

```bash
npm run build
npm run dev:cloudflare
```

Pemeriksaan produksi lengkap:

```bash
npm run test:production
npm run build
npm run cloudflare:dry-run
```

## Produksi: Cloudflare Workers

Cloudflare Workers adalah target produksi utama Ngeblogging:

- aset Vite dilayani melalui Workers Static Assets;
- SPA fallback menangani dashboard dan situs publik;
- `ngeblogging.com/*` dan `*.ngeblogging.com/*` diarahkan ke Worker yang sama;
- subdomain seperti `namasitus.ngeblogging.com` diselesaikan sebagai tenant publik;
- `/api/nara` berjalan di Worker dengan secret terenkripsi;
- `/api/health` menyediakan pemeriksaan kesehatan tanpa membuka secret;
- header keamanan dan cache aset fingerprint diterapkan melalui `public/_headers`;
- observability Worker aktif dengan sampling terbatas.

Konfigurasi sumber kebenaran berada di [`wrangler.jsonc`](wrangler.jsonc). Panduan aktivasi lengkap tersedia di [`docs/CLOUDFLARE_PRODUCTION.md`](docs/CLOUDFLARE_PRODUCTION.md).

### Secret Worker wajib

Simpan sebagai **Cloudflare Secrets**, bukan nilai teks di repository:

- `QWEN_API_KEY`
- `QWEN_WORKSPACE_ID`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Variabel publik saat build Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PUBLIC_SITE_URL=https://ngeblogging.com`

### Wildcard subdomain

Wrangler mendeklarasikan dua route produksi:

```text
ngeblogging.com/*
*.ngeblogging.com/*
```

Zone Cloudflare tetap harus memiliki record DNS proxied untuk domain utama, `www`, dan wildcard `*`. Setelah deploy, uji domain utama, satu subdomain tenant, endpoint kesehatan, login callback, penerbitan artikel, dan Nara sebelum menjadikan rilis sebagai produksi utama.

## Backend dan data

1. Proyek Supabase Ngeblogging memakai migrasi berurutan dalam folder `supabase/migrations`.
2. Browser memakai publishable key dengan RLS; service-role key tidak boleh masuk ke bundle frontend.
3. Aktifkan provider login yang dibutuhkan di Supabase dan daftarkan callback domain utama serta preview Cloudflare.
4. Qwen region Singapore dikonfigurasi melalui secret Worker.
5. `PUBLIC_SITE_URL` dan `VITE_PUBLIC_SITE_URL` harus menggunakan `https://ngeblogging.com`.

Endpoint browser untuk Nara adalah `POST /api/nara`. Secret hanya dibaca oleh Cloudflare Worker. Endpoint memverifikasi token Supabase, menegakkan paket dan kuota, memvalidasi lampiran, membatasi origin termasuk wildcard tenant, membatasi payload, serta menghasilkan request ID untuk diagnosis.

Runtime Docker/VPS dalam `api/server.mjs` dipertahankan hanya sebagai jalur pemulihan bencana opsional. Ia bukan target deployment utama dan tidak diperlukan agar Ngeblogging berjalan di Cloudflare.

## Theme Studio dan peluncuran situs

- Pengaturan aktif/draf tema disimpan per situs di `site_theme_settings`; versi tersimpan berada di `site_theme_versions`.
- Tema dapat disesuaikan, dipratinjau pada desktop/tablet/mobile, dicadangkan, diimpor, dipulihkan, dan diedit sebagai HTML/CSS/JavaScript terisolasi.
- Menu **Domain → Launch situs sekarang** mengaktifkan situs publik pada `slug.ngeblogging.com`.
- Halaman publik membaca hanya situs aktif, konfigurasi tema terbit, dan konten berstatus `published` serta `public`.
- Daftar konten memakai cursor dan ukuran halaman terbatas; isi artikel diambil saat artikel dibuka.

## Nara Assistant

- Tersedia bagi pengunjung dan pengguna login melalui tombol mengambang.
- Mendukung kamera, foto, file teks/dokumen, dan pertanyaan suara pada browser yang mendukung Web Speech API.
- Tingkat Ringan dan Sedang tersedia pada paket Gratis.
- Tingkat Tinggi/Ekstra tinggi serta Nara Writer, Vision, dan Max memerlukan paket Pro.
- Pilihan Pro diperiksa kembali di server; mengubah HTML browser tidak membuka model premium.
- Gambar dan file teks dapat diteruskan ke model. PDF/DOCX biner memerlukan pipeline ekstraksi dokumen untuk analisis penuh.

## Model Nara AI

Nara Mini memakai `qwen3.6-flash`, Writer memakai `qwen3.7-plus`, Vision memakai `qwen3-vl-plus`, dan Max memakai `qwen3.7-max`. Tingkat Tinggi dan Ekstra tinggi mengaktifkan deep thinking Qwen, sedangkan Ringan dan Sedang memprioritaskan kecepatan. Cloudflare Worker menjadi gateway aman; API key tidak pernah dikirim ke browser.

AI menggunakan RAG, memori bertingkat, tool-use, batas penggunaan wajar, serta konfirmasi eksplisit sebelum tindakan berisiko seperti menerbitkan atau menghapus konten.

Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) untuk rancangan teknis dan tahapan implementasi.
