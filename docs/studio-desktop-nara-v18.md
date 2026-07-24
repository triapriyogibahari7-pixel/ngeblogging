# Studio Desktop dan Nara v18

## Perilaku perangkat

- Mobile browser biasa memakai layout mobile dan sidebar rail.
- Browser telepon yang mengaktifkan **Desktop site** memakai layout desktop 980px atau lebih, bukan dipaksa kembali menjadi canvas mobile.
- Tablet, laptop, desktop, dan aplikasi standalone memakai klasifikasi masing-masing dari runtime PWA.

## Nara launcher alternatif

Launcher React asli tetap menjadi sumber state dan tidak dihapus. Runtime v18 membuat satu proxy tombol di `document.body`, di luar stacking context Studio. Ketika diklik, proxy menutup sidebar mobile yang sedang terbuka lalu memicu launcher React asli. Seluruh model, tingkat kecerdasan, gambar, file, mikrofon, memory, projects, plugins, dan QR tetap berada pada komponen Nara yang sama.

## Pemeriksaan

1. Mobile normal: sidebar rail dan satu tombol edge.
2. Desktop site pada telepon: sidebar desktop 220px, header desktop, daftar dan editor dua kolom.
3. Klik Nara saat sidebar terbuka dan tertutup.
4. Pastikan dialog Nara berada di atas scrim dan semua kontrol dapat disentuh.
5. Pastikan menu Tata Letak membuka customizer Tema.
6. Periksa cache service worker `v18`.
