# Tambahan kebutuhan editor v444
Status: spesifikasi, belum diimplementasikan. Tahap 3a menambahkan 120 preset, bukan 120 keluarga font.

## Offline dan online
- Editor yang sudah dimuat harus dapat menyunting dan menyimpan draf lokal tanpa jaringan. Pembukaan ulang offline memerlukan cache aplikasi dan pengujian service worker.
- Penyimpanan lokal menggunakan IndexedDB dengan kunci user/site/document; tangani kuota, kegagalan tulis, logout dan perangkat bersama. Jangan memberi status tersimpan jika transaksi gagal.
- Saat online kembali, bandingkan revisi server dan lokal. Konflik harus meminta pilihan pengguna, bukan menimpa otomatis. Penerbitan memerlukan jaringan dan otorisasi server.
- Font offline harus dibundel atau diunduh dan diverifikasi dahulu. Jangan menghitung fallback sebagai keluarga font berbeda.
- Uji putus jaringan, muat ulang offline, perubahan paralel dua tab/perangkat, token kedaluwarsa, kuota penuh, serta pemulihan draf.

## Lembar kerja rumus
- Sediakan blok lembar kerja tersendiri dalam Post/Pages; jangan menafsirkan HTML artikel sebagai kode.
- Target awal: SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, IF, AND, OR, NOT, ROUND, ABS, SUMIF, COUNTIF, CONCAT dan referensi sel/rentang. Ini target, bukan fungsi yang sudah tersedia.
- Gunakan parser/mesin rumus yang ditinjau lisensinya; dilarang eval atau Function. Tidak menjanjikan kompatibilitas Excel penuh atau XLSX.
- Simpan formula, nilai, tipe dan versi mesin; bedakan tampilan publik read-only dari editor.
- Tangani pembagian nol, referensi rusak, siklus, batas ukuran, locale angka dan tanggal. Uji rumus offline dan hasil setelah sinkronisasi.
- Rumus merupakan lingkup tambahan di luar katalog 120 fungsi yang sudah dicatat; kembangkan tahap 6 sebelum ekspor tahap 8 dan pengujian tahap 10.
