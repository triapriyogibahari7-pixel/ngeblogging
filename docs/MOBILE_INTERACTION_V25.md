# Mobile interaction v25

Perbaikan ini hanya menyentuh interaksi Studio dan jendela Nara. Landing page, halaman publik tenant, renderer tema, serta tata letak desktop yang sudah disetujui tidak diubah.

## Sidebar mobile

- Viewport dengan lebar maksimal 760px selalu diperlakukan sebagai mobile, tanpa bergantung pada laporan `screen.width` atau user-agent yang sering berbeda antarbrowser.
- Sidebar kiri tetap menjadi satu-satunya navigasi mobile.
- Saat tertutup, rail berukuran 60px dan seluruh ikon menu tetap terlihat, berada di tengah, serta dapat disentuh.
- Scrollbar visual dan pseudo-element lama di dalam rail dihapus agar tidak muncul sebagai kolom atau pil putih vertikal.
- Satu tombol buka/tutup menempel pada garis kanan sidebar. Ikonnya berubah sesuai keadaan buka atau tutup.
- Saat sidebar dibuka, panel menimpa konten dengan scrim. Sidebar dan tombol selalu berada di atas scrim.
- Menu bawah, sheet navigasi tambahan, dan tombol Nara di header tetap dinonaktifkan.
- Menu Tata Letak tetap disisipkan setelah Tema dan membuka pengaturan tata letak.

## Nara dua mode

- Pada mobile, Nara selalu terbuka sebagai kotak lengkap di bagian bawah layar.
- Tombol perbesar berada tepat sebelum tombol X.
- Tombol perbesar mengubah Nara menjadi layar penuh.
- Tombol yang sama mengembalikan Nara ke kotak kecil pada mobile atau drawer desktop pada komputer.
- Pada komputer, drawer Nara yang sudah ada tetap menjadi mode awal; tombol layar penuh kini tetap tersedia.
- Plugin, model, tingkat kecerdasan, file, foto, kamera, mikrofon, QR, Projects, Memory, dan generator gambar tidak dihapus.

## Berkas aktif

- `src/studio-interaction-v25.css`
- `src/studio-runtime-v23.js` dengan marker `studio-mobile-interaction-v25-20260725`
- `src/nara-mobile-window-v24.js` dengan runtime `nara-mobile-window-v25-20260725`
- `public/sw.js` dengan cache `ngeblogging-app-v25-20260725`

## Batas perubahan

Tidak ada selector landing page, public tenant, atau theme renderer di stylesheet v25. Semua aturan sidebar mobile berada di media query `max-width: 760px`; aturan layar penuh Nara hanya aktif ketika atribut `data-nara-window-mode="expanded"` dipilih pengguna.
