# Pemulihan Produksi Ngeblogging v156

## Status yang sudah dibuktikan

- Source `main` memakai React Studio terbaru.
- Worker produksi `cloudflare/worker-v68.mjs` memaksa `/`, `/login`, `/signin`, `/signup`, callback, dan recovery menggunakan `dist/index.html` React.
- Auth gateway v153, Google, LinkedIn OIDC, email/password, magic link, PKCE callback, dan sesi persisten tetap aktif di source.
- Netlify Deploy Preview PR #225, #226, dan #227 berhasil.
- Build tests v147 sampai v156 berhasil pada Deploy Preview.
- Domain `https://ngeblogging.com`, `/login`, dan `/signup` masih menyajikan marker lama `WHITE-R4-2026.07.12` setelah merge.
- Commit `main` tidak menerima combined status maupun workflow run yang dapat dibaca melalui integrasi GitHub.

## Kesimpulan

Custom domain masih terikat ke published deploy lama, production deploy dikunci, production branch berbeda, GitHub Actions tidak berjalan, secret deployment belum tersedia, atau route Cloudflare belum menunjuk Worker `ngeblogging` v68.

## Authority yang sudah tersedia di repository

1. `cloudflare/worker-v68.mjs`
   - shell React untuk route sistem;
   - endpoint `/release-v154.json`;
   - header tanpa cache;
   - API dan situs tenant diteruskan ke Worker v67.

2. `scripts/write-netlify-redirects.mjs`
   - marker rilis pada `dist/index.html`;
   - fallback SPA;
   - `_headers` tanpa cache;
   - `release-v154.json` statis.

3. `.github/workflows/deploy-netlify-production.yml`
   - build dan test;
   - baca metadata project;
   - unlock published deploy lama;
   - upload ZIP production;
   - purge CDN;
   - verifikasi root, login, release probe, dan custom domain.

4. `.github/workflows/deploy-production.yml`
   - build dan deploy Cloudflare;
   - verifikasi Worker, root, login, signup, service worker, health, dan auth gateway.

## Tindakan control-plane yang wajib

### GitHub

- Pastikan GitHub Actions diizinkan untuk repository.
- Tambahkan secret `NETLIFY_AUTH_TOKEN`.
- Tambahkan secret `NETLIFY_SITE_ID` bila project ID bukan `ngeblogging.netlify.app`.
- Pastikan secret Cloudflare tetap tersedia untuk workflow produksi.
- Jalankan workflow `Publish Ngeblogging Netlify Production` atau push baru ke `main`.

### Netlify

- Project yang benar harus bernama/beralamat `ngeblogging.netlify.app`.
- Pastikan production branch adalah `main`, atau gunakan workflow publisher v156 yang tidak bergantung pada production branch.
- Buka `Stop auto publishing` bila aktif.
- Unlock published deploy lama bila terkunci.
- Pastikan `ngeblogging.com` dan `www.ngeblogging.com` terpasang pada project yang sama.
- Publish deploy yang memiliki `/release-v154.json`.

### Cloudflare

- Route `ngeblogging.com/*`, `www.ngeblogging.com/*`, dan `*.ngeblogging.com/*` harus menunjuk Worker service `ngeblogging`.
- Worker aktif harus dibangun dari `cloudflare/worker-v68.mjs`.
- Periksa tidak ada Pages project, redirect rule, origin rule, cache rule, atau Worker route lain yang lebih dahulu mengambil apex domain.
- Purge cache setelah route diperbaiki.

## Pemeriksaan selesai

Produksi dinyatakan pulih hanya jika:

- `/release-v154.json` mengembalikan `2026.07.30-production-entry-v154`;
- root, `/login`, dan `/signup` memiliki marker `ngeblogging-production-entry`;
- ketiganya tidak mengandung `WHITE-R4-2026.07.12`;
- Google mengarah ke OAuth Google;
- LinkedIn mengarah ke OAuth LinkedIn OIDC;
- email/password mencapai auth gateway dan membentuk sesi;
- refresh mempertahankan sesi sampai pengguna menekan Keluar.
