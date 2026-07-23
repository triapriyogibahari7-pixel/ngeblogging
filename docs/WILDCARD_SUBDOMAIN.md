# Wildcard subdomain `*.ngeblogging.com`

Aplikasi memakai satu deployment untuk domain utama dan seluruh subdomain tenant.

## Konfigurasi

- Domain utama: `ngeblogging.com`
- Wildcard: `*.ngeblogging.com`
- DNS wildcard diarahkan ke deployment Netlify yang sama.
- Sertifikat HTTPS harus mencakup domain utama dan wildcard.
- Nama sistem seperti `admin`, `api`, `studio`, `www`, dan `auth` tidak boleh dipakai sebagai slug tenant.

Pada saat halaman dibuka, `src/advanced-main.jsx` membaca hostname. Hostname tenant merender `PublicSite`, sedangkan domain utama dan hostname lokal merender aplikasi utama.
