# Sidebar final authority v91

## Backup

Kondisi produksi sebelum v91 disimpan pada branch:

`backup/sidebar-final-v90-20260728`

## Authority terakhir

`index.html` wajib memuat setelah seluruh stylesheet dan runtime Studio:

- `/src/sidebar-final-v91.css?v=91`
- `/src/sidebar-final-v91.js?v=91`

Authority ini diperlukan agar perangkat yang masih memuat kombinasi bundle lama tetap menerima geometri sidebar yang benar.

## Kontrak Domain

Domain wajib tetap berada di dalam `nav`, langsung setelah Anggota. Runtime hanya boleh mengatur style dan dataset; runtime tidak boleh memindahkan, menambah, atau menghapus node React.

Domain wajib memiliki hasil akhir:

- `position: static`;
- `margin-top: 0`;
- `margin-bottom: 0`;
- `order: 0`;
- `flex: 0 0 auto`;
- warna normal sama seperti menu workspace lain;
- warna biru hanya ketika menu Domain aktif;
- tidak pernah memakai warna merah/destruktif;
- tidak memiliki koordinat `bottom` atau spacer otomatis.

## Kontrak logo

Logo mobile menampilkan huruf `n` tanpa titik. Elemen titik kompatibilitas harus dikosongkan, disembunyikan, dan seluruh pseudo-element logo harus menghasilkan `content:none`. Elemen mark utama harus dinetralkan dari ukuran, posisi, latar, border, dan transformasi legacy.

## Kontrak tombol Buat Post mobile

Pada mobile/PWA/perangkat kecil dan bukan mode situs desktop:

- latar biru gradasi resmi Ngeblogging;
- warna teks dan ikon putih;
- tinggi minimum 58 px;
- margin 14 px pada semua sisi;
- tidak terpotong, tidak memakai posisi negatif, dan tidak menggunakan overflow untuk menyembunyikan bagian tombol.

## Pengawasan runtime

Runtime v91 memantau perubahan `class`, `style`, `hidden`, dan `aria-hidden`. Penulisan style harus idempoten agar observer tidak menciptakan loop. Bila stylesheet atau runtime lama mencoba mengubah Domain, logo, atau tombol Buat Post, authority v91 wajib memulihkan kontrak di atas.

## PWA

Rilis: `sidebar-final-v91-20260728`.

Pemulihan satu kali: `pwa-v91`.
