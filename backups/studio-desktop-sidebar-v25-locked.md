# Cadangan sidebar desktop yang dikunci

Cadangan ini merekam geometri sidebar desktop/laptop yang telah dinilai baik sebelum pemisahan perangkat v26.

- Sumber produksi: `e3c3e1603fbd0aa1b3a6a467af154399b730723b`
- Panel terbuka: `220px`
- Rail tertutup: `70px`
- Konten utama mengikuti lebar panel secara tepat.
- Tombol desktop tetap berada di header dan tidak memakai tombol tepi khusus mobile.
- Berkas CSS cadangan tidak dimuat oleh `index.html`, sehingga tidak dapat menimpa produksi secara tidak sengaja.

## Pemulihan

1. Periksa dahulu perbedaan terhadap `src/studio-device-sidebar-v26.css`.
2. Salin hanya blok `@media (min-width: 1101px)` dari berkas cadangan.
3. Jalankan seluruh pengujian sumber, build produksi, dan audit Cloudflare.
4. Jangan menyalin aturan mobile ke desktop.

Git juga tetap menyimpan seluruh riwayat commit sebagai lapisan cadangan kedua.