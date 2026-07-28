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
- tidak memiliki koordinat `bottom` atau spacer otomatis.

## Kontrak logo

Logo mobile menampilkan huruf `n` tanpa titik. Elemen titik kompatibilitas harus disembunyikan dan seluruh pseudo-element logo harus menghasilkan `content:none`.

## Kontrak tombol Buat Post mobile

Pada mobile/PWA/perangkat kecil dan bukan mode situs desktop:

- latar putih bersih;
- warna teks gelap;
- border netral;
- tinggi minimum 58 px;
- margin 14 px pada semua sisi;
- tidak terpotong, tidak memakai posisi negatif, dan tidak menggunakan overflow untuk menyembunyikan bagian tombol.

## PWA

Rilis: `sidebar-final-v91-20260728`.

Pemulihan satu kali: `pwa-v91`.
