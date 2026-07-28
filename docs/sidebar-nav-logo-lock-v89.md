# Sidebar navigation and logo lock v89

Release marker: `sidebar-nav-logo-v89-20260728`

## Backup

Kondisi produksi sebelum perubahan disimpan pada branch:

- `backup/sidebar-react-footer-v88-20260728`
- commit sumber: `d960dd03fb9321abe290af144d0bb3152b653e15`

## Urutan navigasi yang wajib

Menu workspace berada di dalam `<nav>` dan urutannya berakhir dengan:

1. Analitik
2. Anggota
3. Domain

Domain wajib tetap langsung setelah Anggota. Domain tidak boleh diberi `margin-top:auto`, posisi absolut, nilai `bottom`, order khusus, atau aturan `last-child` yang mendorongnya ke footer.

Footer akun berada di luar `<nav>` dan hanya berisi:

1. Pengaturan
2. Keluar

## Logo

Logo sidebar memakai tanda visual `n` tanpa titik. Elemen titik kompatibilitas boleh tetap ada di markup sementara, tetapi wajib `display:none`; semua pseudo-element titik pada `.sn-logo` dan `.sn-logo-mark` wajib dinonaktifkan.

## Kontrak perangkat

- Desktop/laptop/komputer: Domain tetap bersama menu workspace; Pengaturan dan Keluar tetap di footer bawah.
- Mobile/PWA/handphone: logo hanya menampilkan `n`; tidak ada titik biru di bawah; footer tidak menutupi Domain.
- Mode desktop pada ponsel mengikuti kontrak desktop.

## File otoritatif

- `src/StudioNext.jsx`
- `src/sidebar-account-footer-v85.css`
- `public/sw.js`
- `tests/domain-manager-v78.test.mjs`
- `tests/domain-manager-v80.test.mjs`

## Larangan regresi

Pengujian harus gagal bila:

- Domain terdorong oleh `margin-top:auto` atau aturan tombol terakhir;
- Domain keluar dari `<nav>` atau masuk ke footer akun;
- titik logo tampil kembali;
- pseudo-element logo menghasilkan titik tambahan;
- Pengaturan/Keluar kembali masuk ke `<nav>`;
- footer memakai overlay absolut/fixed/sticky.
