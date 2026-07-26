# Alternatif custom domain tanpa Cloudflare for SaaS

Dokumen ini sengaja memisahkan kemampuan yang benar-benar gratis dari layanan Cloudflare Custom Hostnames/Cloudflare for SaaS yang meminta aktivasi berbayar.

## 1. Netlify Domain Alias — mode utama Ngeblogging v51

Status: **diimplementasikan**.

Ngeblogging memakai project `ngeblogging.netlify.app` sebagai bridge publik. React membaca hostname pengunjung dan memuat tenant yang sesuai dari Supabase. API publik diproksi ke `https://ngeblogging.com/api/*` melalui `netlify.toml`.

Alur domain utama:

- Tambahkan `domain.com` dari menu Domain Ngeblogging.
- Tambahkan `domain.com` sebagai Domain alias pada project Netlify jika mode API belum diberi token.
- Pasang `A @ 75.2.60.5`.
- Pasang TXT verifikasi yang dibuat Ngeblogging.
- Tekan **Periksa status** sampai DNS dan HTTPS aktif.

Alur WWW/subdomain:

- Tambahkan `www.domain.com`, `blog.domain.com`, atau `cloud.console.domain.com`.
- Tambahkan hostname yang sama sebagai Domain alias pada Netlify jika mode manual.
- Pasang CNAME ke `ngeblogging.netlify.app`.
- Pasang TXT verifikasi yang dibuat Ngeblogging.
- Tekan **Periksa status**.

Otomatisasi opsional dari Codespaces:

```bash
export NETLIFY_AUTH_TOKEN='token-pribadi-jangan-dikirim-ke-chat'
export NETLIFY_SITE_ID='ngeblogging.netlify.app'
export NETLIFY_SITE_HOSTNAME='ngeblogging.netlify.app'
npm run domain:netlify -- add blog.domain.com
npm run domain:netlify -- list
npm run domain:netlify -- ssl
```

Netlify merekomendasikan tidak lebih dari 50 alias pada satu site. Sebelum melewati angka itu, buat project bridge kedua dan bagi domain antarproject. Ini batas operasional provider, bukan batas database Ngeblogging.

## 2. Cloudflare Pages custom domain

Status: **alternatif manual, tidak dipilih sebagai default**.

Cocok untuk project statis terpisah. Subdomain dapat diarahkan ke project Pages. Domain apex mengharuskan domain menjadi zone Cloudflare dan nameserver diarahkan ke Cloudflare. Karena itu opsi ini tidak cocok untuk semua pengguna yang ingin mempertahankan DNS di provider lain.

## 3. GitHub Pages per repository

Status: **alternatif ekspor statis**.

Setiap situs diekspor ke repository sendiri dan memakai satu custom domain melalui file `CNAME`. Cocok untuk situs statis, portofolio, dan dokumentasi. Fitur server Nara, analitik real-time, anggota, dan API dinamis harus tetap memanggil layanan Ngeblogging atau dinonaktifkan pada hasil ekspor.

## 4. Bring-your-own deployment dari repository/Codespaces

Status: **alternatif distribusi skala besar**.

Setiap pengguna atau organisasi menghubungkan repository hasil ekspor ke akun Netlify, Cloudflare Pages, Vercel, atau penyedia lain milik mereka sendiri. Domain dan kuota menjadi tanggung jawab akun pengguna, sehingga Ngeblogging tidak menanggung seluruh alias dalam satu akun. Codespaces dipakai untuk build, validasi, dan menjalankan skrip deployment; Codespaces bukan hosting produksi permanen.

## Keputusan produksi v51

- Default: Netlify bridge gratis.
- Tanpa token Netlify: mode manual tetap aktif dan menghasilkan dua record DNS.
- Dengan token Netlify: domain alias ditambahkan/dihapus otomatis melalui API.
- Cloudflare for SaaS tidak diperlukan untuk mode ini.
- Supabase tetap memakai JWT pengguna + Row Level Security; service-role server tidak diperlukan.
