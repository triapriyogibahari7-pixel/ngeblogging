# Cloudflare Workers Production — Ngeblogging

Dokumen ini adalah sumber utama deployment Ngeblogging. Cloudflare Workers melayani aplikasi, wildcard subdomain pengguna, dan API Nara. Netlify tidak digunakan sebagai target produksi.

## 1. Arsitektur produksi

```text
Pengunjung
   │
   ├── ngeblogging.com
   ├── www.ngeblogging.com
   ├── *.ngeblogging.com
   └── custom domain pengguna
          │
          ▼
Cloudflare DNS + TLS + Worker Routes
          │
          ├── Workers Static Assets → dist/
          ├── SPA fallback → index.html
          ├── /api/health → Cloudflare Worker
          └── /api/nara → Nara handler → Supabase + Qwen Singapore
```

Supabase tetap menjadi lapisan Auth, PostgreSQL, RLS, Realtime, dan Storage. Cloudflare tidak menyimpan service-role key di browser.

## 2. Route yang wajib aktif

`wrangler.jsonc` mendeklarasikan:

```text
ngeblogging.com/*
*.ngeblogging.com/*
```

Route pertama melayani domain utama. Route kedua melayani `www` dan seluruh subdomain tenant seperti `john.ngeblogging.com`.

## 3. DNS zone

Pada zone `ngeblogging.com`, siapkan record proxied:

| Nama | Tipe | Target | Proxy |
|---|---|---|---|
| `@` | A atau AAAA placeholder yang didukung Cloudflare | alamat yang tidak dipakai langsung oleh Worker route | Proxied |
| `www` | CNAME | `ngeblogging.com` | Proxied |
| `*` | CNAME | `ngeblogging.com` | Proxied |

Worker route tetap menjadi pemroses request. Record wildcard diperlukan agar hostname tenant dapat di-resolve oleh DNS dan mendapatkan TLS Cloudflare.

Jangan membuat record DNS per pengguna. Satu record `*` menangani seluruh subdomain gratis.

## 4. Build variables frontend

Build Vite membutuhkan:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_PUBLIC_SITE_URL=https://ngeblogging.com
```

Nilai `VITE_` masuk ke bundle browser. Hanya publishable key Supabase yang boleh dipakai. Jangan pernah memasukkan `service_role`, database password, atau Qwen API key.

## 5. Secret Worker

Buat sebagai **encrypted Secret** pada Worker `ngeblogging`:

```text
QWEN_API_KEY
QWEN_WORKSPACE_ID
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

Wrangler mendeklarasikan nama-nama ini pada `secrets.required`. Deployment akan gagal sebelum rilis apabila salah satunya belum tersedia.

Variabel non-rahasia dideklarasikan pada `wrangler.jsonc`:

```text
PUBLIC_SITE_URL=https://ngeblogging.com
PUBLIC_ALLOWED_ORIGINS=https://ngeblogging.com,https://www.ngeblogging.com
QWEN_REGION=singapore
NARA_RUNTIME=cloudflare-worker-v2
```

Worker menerima origin domain utama, seluruh `*.ngeblogging.com`, preview `workers.dev`/`pages.dev`, serta localhost. Origin lain ditolak sebelum mencapai Nara.

## 6. Perintah validasi

```bash
npm ci --ignore-scripts
npm run test:production
npm run build
npm run cloudflare:dry-run
```

Semua perintah harus lulus. Jangan deploy dengan `--force` untuk melewati test.

## 7. Deployment

### Cloudflare Git integration

Gunakan repository dan branch produksi yang dipilih di dashboard Cloudflare. Build command:

```bash
npm ci --ignore-scripts && npm run test:production && npm run build
```

Deploy command:

```bash
npm run deploy:cloudflare
```

Pastikan root directory adalah root repository dan konfigurasi Worker memakai `wrangler.jsonc`.

### GitHub Actions

Workflow `.github/workflows/cloudflare.yml` dapat dipakai sebagai jalur deployment terkontrol apabila `CLOUDFLARE_DEPLOY_ENABLED=true` dan secret GitHub Cloudflare sudah tersedia. Jangan mengaktifkan dua sistem deployment produksi sekaligus tanpa aturan branch yang jelas.

## 8. Pengujian setelah deploy

Jalankan smoke test berikut secara berurutan:

1. `GET https://ngeblogging.com/api/health` mengembalikan status `ok`.
2. Landing page domain utama tampil tanpa error console fatal.
3. Login dan callback Supabase kembali ke domain aktif.
4. Studio dapat membuat, menyimpan, membuka, menerbitkan, dan menghapus draf.
5. Theme Studio dapat menyimpan draf tema dan menerbitkan versi aktif.
6. Menu Domain dapat meluncurkan situs.
7. `https://<slug>.ngeblogging.com` menampilkan situs yang tepat.
8. Artikel publik dapat dibuka langsung melalui URL.
9. Nara bekerja dari domain utama dan subdomain tenant.
10. Request origin asing ke `/api/nara` ditolak.
11. Payload di atas 20 MiB ditolak dengan HTTP 413.
12. URL preview `workers.dev` membawa `X-Robots-Tag: noindex`.

## 9. Header dan cache

`public/_headers` diterapkan pada static assets Cloudflare:

- CSP dasar;
- anti MIME sniffing;
- kebijakan referrer dan permissions;
- perlindungan framing;
- aset fingerprint `/assets/*` di-cache immutable selama satu tahun;
- preview `workers.dev` tidak diindeks mesin pencari.

Respons API dibuat oleh Worker sehingga header API diterapkan langsung dalam `cloudflare/worker.mjs`.

## 10. Rollback

Jika rilis gagal:

1. Buka Workers & Pages → Worker `ngeblogging` → Deployments.
2. Pilih versi terakhir yang sehat.
3. Rollback versi Worker.
4. Verifikasi `/api/health`, landing page, login, Studio, subdomain tenant, dan Nara.
5. Jangan mengubah DNS selama rollback kode kecuali insiden berasal dari route atau record DNS.

Simpan setidaknya satu deployment sehat sebelum setiap migrasi besar.

## 11. Custom domain pengguna

Subdomain gratis tidak memerlukan record per pengguna. Custom domain milik pengguna memerlukan proses terpisah:

1. pengguna mendaftarkan hostname di Studio;
2. platform memberi token verifikasi;
3. pengguna menambahkan record DNS yang diminta;
4. backend memverifikasi kepemilikan;
5. hostname dipasang sebagai Cloudflare Custom Hostname atau mekanisme SaaS yang dipilih;
6. TLS harus aktif sebelum domain dijadikan primary.

Jangan menganggap route `*.ngeblogging.com` otomatis mencakup domain eksternal.

## 12. Batas kejujuran kapasitas

Cloudflare menghilangkan kebutuhan server web yang selalu menyala dan membuat aset statis sangat efisien. Namun kapasitas keseluruhan tetap bergantung pada kuota Worker, Supabase, Storage, bandwidth, Qwen, email, serta perlindungan penyalahgunaan. Klaim skala harus didasarkan pada load test, metrik produksi, dan anggaran nyata.

Fondasi untuk tumbuh:

- cache edge untuk halaman publik;
- R2 atau object storage untuk media skala besar;
- image variants dan transform asynchronous;
- antrean untuk pekerjaan berat;
- rate limiting dan abuse detection;
- database indexes, partitioning, read replicas, dan sharding saat diperlukan;
- observability, alerting, backup, dan disaster recovery.
