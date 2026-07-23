# Produksi berbiaya minimum dengan Cloudflare

Target ini menjalankan frontend Ngeblogging sebagai aset statis dan `/api/nara`
sebagai Cloudflare Worker. HP, laptop, VPS, dan Netlify tidak perlu menyala.

## Biaya dan batas nyata

- Hosting aset statis Cloudflare: tanpa biaya request dan tanpa batas request aset.
- Worker dinamis: 100.000 request per hari pada paket Free, dengan 10 ms CPU per pemanggilan.
- GitHub Actions dan Supabase tetap mempunyai kuota masing-masing.
- Alibaba/Qwen tetap memakai kuota akun pemilik; aktifkan **Free Quota Only** agar
  pemakaian berhenti ketika kuota gratis habis dan tidak menimbulkan tagihan.
- Domain `ngeblogging.com` tetap membutuhkan biaya perpanjangan tahunan.

Ini adalah target dengan biaya bulanan server paling rendah, tetapi bukan layanan
tanpa batas atau jaminan uptime 100%.

## Yang sudah disiapkan di repository

- `cloudflare/worker.mjs`: adapter Nara, health check, batas payload, dan static assets.
- `wrangler.jsonc`: SPA fallback, aset global, dan hanya `/api/*` yang memanggil Worker.
- `.github/workflows/cloudflare.yml`: tes, build, dry-run, dan deployment terkunci.
- `GET /api/health`: pemeriksaan runtime tanpa membuka secret.

Workflow tidak berjalan sampai variable `CLOUDFLARE_DEPLOY_ENABLED` bernilai `true`.

## Tahap 1 — buat Worker kosong

1. Buat akun Cloudflare Free.
2. Buka **Workers & Pages → Create → Worker**.
3. Gunakan nama tepat `ngeblogging`, lalu deploy contoh bawaan satu kali.
4. Jangan hubungkan domain utama dahulu.

Worker kosong diperlukan agar secret runtime dapat diisi sebelum kode Nara diterbitkan.

## Tahap 2 — isi secret Worker

Buka **Workers & Pages → ngeblogging → Settings → Variables and Secrets**.
Tambahkan sebagai **Secret**, bukan plaintext variable:

```text
QWEN_API_KEY
QWEN_WORKSPACE_ID
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

Tambahkan model override hanya jika memang diperlukan:

```text
QWEN_MODEL
NARA_MODEL_MINI
NARA_MODEL_WRITER
NARA_MODEL_VISION
NARA_MODEL_MAX
QWEN_API_BASE_URL
```

Jangan menaruh `service_role`, secret key Supabase, API key Qwen, atau token Cloudflare
di file repository, frontend, chat, atau screenshot.

## Tahap 3 — buat token deployment Cloudflare

1. Buka **My Profile → API Tokens → Create Token**.
2. Pilih template **Edit Cloudflare Workers**.
3. Batasi token hanya ke akun dan zone Ngeblogging.
4. Salin token satu kali dan simpan langsung sebagai GitHub secret.
5. Salin **Account ID** dari dashboard Cloudflare.

## Tahap 4 — konfigurasi repository GitHub

Buka **Repository → Settings → Secrets and variables → Actions**.

Secrets:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
```

Variables:

```text
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_PUBLIC_SITE_URL=https://ngeblogging.com
CLOUDFLARE_DEPLOY_ENABLED=false
```

Biarkan `CLOUDFLARE_DEPLOY_ENABLED=false` sampai semua secret telah diperiksa.

## Tahap 5 — deployment dan pengujian sebelum DNS

1. Ubah `CLOUDFLARE_DEPLOY_ENABLED=true`.
2. Buka **Actions → Cloudflare free production → Run workflow**.
3. Tunggu job `deploy` hijau.
4. Buka alamat `https://ngeblogging.<subdomain-akun>.workers.dev` yang diberikan Cloudflare.
5. Periksa `GET /api/health` dan `GET /api/nara`.
6. Uji halaman, login email, Google, GitHub, LinkedIn, CRUD artikel, dan Nara.
7. Tambahkan alamat `workers.dev` tersebut ke daftar Redirect URLs Supabase hanya
   selama pengujian.

Jangan pindahkan domain jika salah satu tes gagal.

## Tahap 6 — pindahkan domain tanpa kehilangan DNS

Untuk domain apex `ngeblogging.com`, Cloudflare harus menjadi pengelola nameserver.

1. Tambahkan `ngeblogging.com` sebagai zone pada paket Free.
2. Pastikan Cloudflare mengimpor seluruh record DNS lama.
3. Bandingkan record `A`, `AAAA`, `CNAME`, `MX`, `TXT`, dan record verifikasi satu per satu.
4. Hapus record `AAAA` hanya jika memang menunjuk ke server yang sudah tidak dipakai.
5. Ganti nameserver di registrar sesuai dua nameserver yang diberikan Cloudflare.
6. Tunggu status zone **Active**.
7. Buka Worker `ngeblogging` → **Settings → Domains & Routes → Add → Custom Domain**.
8. Tambahkan `ngeblogging.com`, lalu `www.ngeblogging.com`.
9. Tambahkan kedua URL produksi ke Supabase **Site URL** dan **Redirect URLs**.
10. Uji kembali sebelum menghapus Netlify sebagai fallback.

Perubahan nameserver adalah tindakan eksternal yang harus dilakukan pemilik akun.
Repository ini sengaja tidak dapat mengubah DNS atau secret secara otomatis.

## Pemeriksaan dan pemulihan

```bash
npm ci --ignore-scripts
npm run test:production
npm run build
npm run cloudflare:dry-run
```

Jika versi baru bermasalah, buka **Workers & Pages → ngeblogging → Deployments**, pilih
deployment terakhir yang sehat, lalu lakukan rollback. Jangan mengubah DNS untuk
rollback aplikasi biasa.
