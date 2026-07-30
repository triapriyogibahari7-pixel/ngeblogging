# Legacy Worker Entry Authority v157

Produksi masih menyajikan `WHITE-R4-2026.07.12` walaupun Wrangler v154 dan fallback Netlify telah digabung. Ini menunjukkan control-plane hosting dapat tetap menunjuk entry Worker lama yang dikonfigurasi langsung di dashboard.

Authority v157 memasang `tryServeSystemShellV157` saat build ke:

- `cloudflare/worker.mjs`
- `cloudflare/worker-v22.mjs`
- `cloudflare/worker-v35.mjs`
- `cloudflare/worker-v37.mjs`
- `cloudflare/worker-v41.mjs`

Cakupan authority dibatasi pada `ngeblogging.com` dan `www.ngeblogging.com`, metode GET/HEAD, root, route login/daftar/recovery/callback, serta query autentikasi. Request `/api/*`, asset biasa, dan seluruh subdomain tenant tidak diintersep.

Probe produksi: `/release-v157.json`.

Kriteria berhasil:

1. Probe mengembalikan `2026.07.30-system-shell-v157`.
2. Root, `/login`, dan `/signup` mempunyai meta `ngeblogging-system-shell`.
3. Halaman tidak mengandung `WHITE-R4-2026.07.12`.
4. Google dan LinkedIn membuka provider OAuth.
5. Email/password mencapai auth gateway dan membentuk sesi valid.
6. Refresh mempertahankan sesi sampai pengguna menekan Keluar.
