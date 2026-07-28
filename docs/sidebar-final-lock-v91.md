# Sidebar visual authority v92

## Backup

Kondisi produksi sebelum koreksi v92 disimpan pada branch:

`backup/sidebar-v91-production-20260728`

## Authority terakhir

`index.html` wajib memuat setelah seluruh stylesheet dan runtime Studio:

- `/src/sidebar-final-v91.css?v=92`
- `/src/sidebar-final-v91.js?v=92`

Nama file tetap dipertahankan agar tidak menambah lapisan authority baru, sedangkan query `v=92` memaksa browser mengambil isi koreksi terbaru.

## Kontrak Domain

Domain wajib tetap berada di dalam `nav`, langsung setelah Anggota. Runtime hanya boleh mengatur style dan dataset; runtime tidak boleh memindahkan, menambah, atau menghapus node React.

Domain wajib memiliki hasil akhir:

- `position: static`;
- `margin-top: 0` dan `margin-bottom: 0`;
- `order: 0`;
- `flex: 0 0 auto`;
- warna normal sama seperti menu workspace lain;
- warna biru hanya ketika menu Domain aktif;
- tidak pernah memakai warna merah/destruktif;
- tidak memiliki koordinat `bottom` atau spacer otomatis.

## Kontrak logo

Logo mobile menampilkan huruf `n` tanpa titik. Elemen titik kompatibilitas harus dikosongkan, disembunyikan, dan seluruh pseudo-element logo harus menghasilkan `content:none`. Elemen mark utama dinetralkan dari ukuran, posisi, latar, border, bayangan, dan transformasi legacy.

## Kontrak tombol Buat Post mobile

Pada mobile/PWA/perangkat kecil dan bukan mode situs desktop:

- latar biru gradasi resmi Ngeblogging;
- warna teks dan ikon putih;
- tinggi minimum 58 px;
- margin 14 px pada semua sisi;
- tidak terpotong, tidak memakai posisi negatif, dan tidak menggunakan overflow untuk menyembunyikan bagian tombol.

## Pengawasan runtime

Runtime v92 memantau perubahan `class`, `style`, `hidden`, dan `aria-hidden`. Penulisan style bersifat idempoten agar observer tidak menciptakan loop. Bila stylesheet atau runtime lama mencoba mengubah Domain, logo, atau tombol Buat Post, authority v92 memulihkan kontrak di atas.

## PWA

Rilis: `sidebar-polish-v92-20260728`.

Pemulihan satu kali: `pwa-v92`.
