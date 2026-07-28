# Sidebar React footer lock v88

Release marker: `sidebar-react-footer-v88-20260728`

## Backup produksi

Kondisi produksi sebelum v88 disimpan pada branch:

- `backup/sidebar-two-layouts-v87-20260728`
- commit sumber: `3cca4de4cd5842bc949bc69183a0d2634ee8a109`

## Struktur otoritatif

`StudioNext.jsx` wajib mempertahankan tiga wilayah React terpisah:

1. `.sn-logo` dengan tanda tunggal `.sn-logo-mark` berisi `n.`;
2. `<nav>` yang hanya berisi menu workspace dan menjadi satu-satunya wilayah sidebar yang dapat digulir;
3. `.sn-account-footer` di luar `<nav>` yang berisi tombol React asli Pengaturan dan Keluar.

## Kontrak desktop/perangkat besar

- Footer selalu terlihat di dasar sidebar.
- Pengaturan tepat di atas Keluar tanpa ruang kosong besar.
- Kedua tombol tidak boleh menggunakan `position:absolute`, `fixed`, atau `sticky`.
- Sidebar collapsed tetap menampilkan kedua ikon.

## Kontrak mobile/PWA/perangkat kecil

- Nav dapat digulir tanpa membawa footer keluar layar.
- Footer tidak menutupi Anggota, Domain, atau menu lain.
- Pengaturan dan Keluar memiliki tinggi minimum 58 px.
- Safe-area bawah tetap dihormati.

## Kontrak logo

- Huruf dan titik merupakan satu mark visual `n.`.
- Titik wajib berada tepat setelah huruf pada baseline yang sama.
- Dilarang mengembalikan pola `.sn-logo > text + sibling span` yang dapat membuat titik turun ke bawah.

## File otoritatif

- `src/StudioNext.jsx`
- `src/sidebar-account-footer-v85.css`
- `src/StudioSecure.jsx`
- `public/sw.js`
- `tests/domain-manager-v78.test.mjs`
- `tests/domain-manager-v80.test.mjs`

## Larangan regresi

Pengujian wajib gagal bila:

- Pengaturan/Keluar kembali dimasukkan ke dalam `<nav>`;
- footer memakai posisi absolut/fixed/sticky;
- muncul `margin-top:auto` pada tombol Pengaturan;
- identitas tombol ditebak dengan `nth-last-child`;
- node navigasi React dihapus dengan `button.remove()`;
- logo `n` dan titik kembali menjadi sibling terpisah.
