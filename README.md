# Ngeblogging

Platform kehadiran digital berbasis AI untuk kreator, bisnis, media, dan komunitas Indonesia.

## Status

MVP interaktif mencakup landing page responsif, studio dashboard, CRUD artikel dan halaman, editor ribbon dengan autosave, status publikasi, pencarian, 12 tema, demo Nara AI, serta konfigurasi Netlify. Data studio saat ini disimpan aman di browser sebagai mode lokal; Supabase menjadi tahap aktivasi backend multi-pengguna.

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

## Prinsip Nara AI

Qwen3.5-4B adalah model utama yang dijalankan melalui layanan inference terpisah. Netlify menjadi aplikasi dan gateway aman. AI menggunakan RAG, memori bertingkat, tool-use, batas penggunaan wajar, serta konfirmasi eksplisit sebelum tindakan berisiko seperti menerbitkan atau menghapus konten.

Lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) untuk rancangan teknis dan tahapan implementasi.
