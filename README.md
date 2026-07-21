# Ngeblogging

Platform kehadiran digital berbasis AI untuk kreator, bisnis, media, dan komunitas Indonesia.

## Status

Fondasi MVP mencakup landing page responsif, visual dashboard, demo Nara AI, konfigurasi Netlify, dan arsitektur siap dikembangkan menuju autentikasi serta publikasi nyata.

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
