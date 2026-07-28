# Domain single authority v112

Release: `domain-single-authority-v112-20260728`

## Kontrak tampilan

- Halaman Domain hanya memiliki satu pemilik DOM aktif: `domain-manager-v112-20260728`.
- `StudioNext` menyediakan satu host awal dan tidak merender panel custom-domain lama.
- `studio-production-audit-v37.js` tidak lagi membuat `.sp37-domain-host`.
- Authority terakhir menghapus atau menyembunyikan seluruh root Domain lama sebelum dapat menumpuk dengan Shadow DOM Domain Manager.
- Tampilan yang dipertahankan adalah kartu **Hubungkan domain pribadi**, bukan panel lama **Hubungkan custom domain / Target CNAME resmi Ngeblogging**.

## Kontrak akun dan situs

- Satu akun dapat memiliki paling banyak 12 situs.
- Setiap situs aktif mempunyai paling banyak satu domain akar kanonis.
- Halaman Domain membaca `ACTIVE_SITE_STORAGE_KEY` yang sama dengan tombol **Ganti situs** pada Ringkasan.
- Respons `/api/domains/list` difilter ulang berdasarkan `site_id` dan hanya mengembalikan domain kanonis milik situs aktif.
- Domain dari 11 situs lain tidak ditampilkan pada halaman situs yang sedang dikelola.
- Pendaftaran domain kedua pada situs yang sama ditolak dengan `SITE_DOMAIN_LIMIT_REACHED`; pengguna harus mengganti situs terlebih dahulu.

## Audit dan pembukaan situs

- Audit publik dijalankan dari Worker, bukan hanya simulasi browser `no-cors`.
- Audit mengukur status HTTP, HTTPS, waktu respons, tipe konten HTML, subdomain gratis, domain akar, `www`, dan alamat tambahan aktif.
- Sebelum audit, status DNS/HTTPS Cloudflare disegarkan dan daftar domain situs aktif dimuat ulang.
- Tombol buka situs memakai tab browser baru dengan `target="_blank"` dan `rel="noreferrer"`.

## Pemulihan PWA

Cache aktif: `ngeblogging-app-v112-20260728`.

Query pemulihan satu kali: `?ngeblogging_recovery=pwa-v112`.
