# Sidebar dan aksi Ringkasan v90

## Backup

Snapshot sebelum perubahan tersimpan pada branch:

`backup/sidebar-home-actions-v89-20260728`

Sumber produksi sebelum v90: `db25d642efbfde8d8cf49a74221d2e1c0b5be7f5`.

## Kontrak sidebar

Urutan menu workspace harus tetap:

1. Ringkasan
2. Posts
3. Pages
4. Tema
5. Media
6. Analitik
7. Anggota
8. Domain

Domain harus tetap berada di dalam elemen `nav`, tepat setelah Anggota. Domain tidak boleh memakai `margin-top:auto`, border pemisah footer, posisi absolut, atau urutan khusus.

Pengaturan dan Keluar berada di `.sn-account-footer`, terpisah dari navigasi workspace.

## Kontrak Ringkasan

Pada browser mode situs desktop di ponsel, kumpulan aksi Ringkasan tidak boleh melewati tepi kanan halaman. Aksi harus:

- membungkus ketika ruang tidak cukup;
- berubah menjadi grid dua kolom pada viewport sampai 1100 px;
- berubah menjadi satu kolom pada viewport sangat sempit;
- mempertahankan seluruh teks dan area klik tombol;
- tidak bergantung pada `overflow:hidden` untuk menyembunyikan bagian tombol.

## Kontrak PWA

Rilis aktif: `sidebar-home-actions-v90-20260728`.

Pemulihan satu kali: `pwa-v90`.

Perubahan berikutnya harus gagal dalam regresi apabila mengembalikan `margin-top:auto` pada tombol terakhir navigasi atau membuat aksi Ringkasan terpotong.
