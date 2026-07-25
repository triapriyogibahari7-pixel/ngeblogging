# Mobile/PWA Nara v24

Perubahan ini hanya menangani Studio mode mobile/PWA dan jendela Nara. Landing page, halaman utama publik, tata letak desktop, komputer, tablet, dan Android Desktop-site tidak dirombak.

## Kontrak tampilan Nara

- Launcher Nara tetap satu di kanan bawah.
- Nara terbuka sebagai kotak lengkap di bagian bawah layar mobile, bukan langsung memenuhi layar.
- Tombol perbesar berada tepat sebelum tombol X pada header.
- Tombol yang sama mengembalikan Nara dari layar penuh ke kotak kecil.
- Backdrop di luar kotak memakai warna gelap transparan, bukan kolom putih.
- Kotak tetap memuat percakapan, prompt cepat, model, tingkat kecerdasan, kamera, foto, file, mikrofon, QR, projects, memory, image generation, dan plugins.

## Plugin & connectors

Plugin sekarang dapat dibuka dari dalam percakapan Nara tanpa menutup jendela chat. Drawer menampilkan katalog dan status koneksi untuk GitHub, Supabase, Neon, Cloudflare, PayPal, QRIS, Google Drive, Google Analytics, dan webhook.

Tindakan koneksi menggunakan alur permission-first yang sudah ada:

- `Hubungkan` membuat permintaan koneksi dengan scopes dari katalog.
- `Pending` berarti backend OAuth atau secret vault belum selesai.
- `Connected` berarti koneksi sudah dinyatakan aktif oleh backend.
- Menekan status aktif/pending menonaktifkan koneksi dan menghapus referensi secret dari record pengguna.

Secret OAuth/API tidak ditaruh di browser.

## Sidebar mobile

- Hanya sidebar kiri yang menjadi navigasi mobile.
- Rail 64px tetap terlihat saat tertutup.
- Semua ikon menu tetap terlihat dan dapat disentuh.
- Satu tombol buka/tutup berada di garis tepi sidebar.
- Sidebar berada di atas scrim; scrim berada di bawah sidebar tetapi di atas konten.
- Navigasi bawah dan sheet menu tambahan tetap dinonaktifkan.

## Berkas aktif

- `src/studio-mobile-nara-v24.css`
- `src/nara-mobile-window-v24.js`
- `src/nara-command-center-bridge.js`
- `public/sw.js` cache `ngeblogging-app-v24-20260725`

## Batas perubahan

Patch ini tidak mengubah komponen landing page, renderer situs publik, katalog 100 tema, tata letak desktop, atau domain publik. Perubahan CSS umum v23 tetap menjadi dasar; v24 hanya menambahkan aturan mobile/Nara yang lebih spesifik.
