# Production Promotion v167

Tanggal: 30 Juli 2026

## Tujuan

Memastikan branch yang mungkin dipilih Cloudflare Workers Builds sebagai production branch menerima source terbaru tanpa menghapus atau mengganti fitur Studio.

## Kondisi sebelum promosi

- `main`: `4c4858e1d2252695ffd68b47cd1afe696de1a8ff` (v166)
- `production`: `be52fca126f20635a8b699445ebf59044518bb31` (v161)
- Selisih: tujuh commit
- Domain publik masih menyajikan `WHITE-R4-2026.07.12`

## Tindakan

1. Fast-forward branch `production` ke source v166 tanpa force.
2. Tambahkan marker operasional v167 ini pada `main`.
3. Fast-forward kembali branch `production` ke commit marker v167 agar kedua kemungkinan production branch (`main` atau `production`) memicu Workers Build.
4. Pertahankan seluruh source v159-v166: enam mode, sidebar/drawer lengkap, Ringkasan, Posts, Pages, editor 5.000 kata, SEO mobile, 100 tema, Media, Analitik, Anggota, Komentar, Domain, API Keys, onboarding, auth PKCE/persist session, serta Nara non-modal.

## Kriteria verifikasi

Promosi belum boleh dianggap selesai sebelum:

- root, `/login`, `/signup`, dan `/studio` memuat React shell terbaru;
- `/release-v165.json` tersedia;
- marker `ngeblogging-production-domain-attach-v165` muncul;
- `WHITE-R4-2026.07.12` tidak muncul;
- auth gateway merespons sesuai kontrak;
- login akun nyata berhasil dan sesi bertahan sampai tombol Keluar ditekan.

Dokumen ini hanya marker pemicu deployment dan audit. Dokumen ini tidak mengklaim kapasitas produksi, tidak mengubah database, dan tidak menghapus fitur lama.
