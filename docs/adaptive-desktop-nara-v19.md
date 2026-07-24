# Adaptive Desktop dan Nara v19

## Masalah produksi yang diperbaiki

Browser Android dengan opsi **Situs desktop** melaporkan viewport sekitar 980 piksel lalu mengecilkan seluruh halaman ke layar fisik telepon. Rilis sebelumnya mempertahankan kanvas 980 piksel tersebut sehingga Studio, sidebar, editor, dan Nara terlihat sangat kecil atau terpotong. Kertas editor juga mempertahankan tinggi 980 piksel dan menghasilkan ruang kosong yang sangat panjang.

## Strategi v19

V19 memakai lebar dan tinggi fisik yang dihitung oleh `pwa-runtime.js`, lalu mengimbangi skala desktop browser dengan `zoom: var(--sn-browser-scale)`. Komponen dirender pada lebar layar fisik sehingga teks tetap terbaca, tetapi status perangkat tetap dicatat sebagai desktop-site phone.

Mode ini disebut **adaptive desktop phone**. Ini bukan bottom navigation dan bukan kanvas desktop mini. Studio mempertahankan satu rail ikon kiri, satu tombol edge, sidebar berlabel sebagai overlay, header Studio, menu Tata Letak, daftar konten, editor lengkap, serta seluruh pengaturan publikasi.

## Sidebar

- Hanya tombol React asli dengan authority `single-v19` yang boleh terlihat.
- Sidebar dimulai dalam keadaan collapsed pada telepon.
- Saat collapsed, seluruh ikon menu tetap tersedia.
- Saat dibuka, sidebar memakai lebar terbaca dan scrim dapat diketuk untuk menutup.
- Bottom navigation, mobile sheet, tombol tutup kedua, dan menu Nara di sidebar dihapus.
- Tata Letak tetap membuka customizer Tema yang sebenarnya.

## Editor

- Toolbar dan tab dapat digeser horizontal tanpa memperkecil seluruh antarmuka.
- Kertas memakai lebar layar dan tinggi minimum berdasarkan tinggi fisik perangkat, bukan 980 piksel tetap.
- Metadata, SEO, publikasi, lokasi, taksonomi, dan pengaturan post berada setelah area tulisan.
- Tombol preview, terbitkan, serta Nara tetap dapat digunakan.

## Nara AI

Launcher v19 berada langsung di `document.body`, di atas scrim Studio. Saat ditekan, runtime menutup sidebar lalu mencoba jalur React berikut secara berurutan:

1. tombol Nara di header Studio;
2. tombol Nara di editor;
3. launcher Nara asli.

Percobaan diulang singkat apabila React sedang melakukan render ulang. Dialog Nara selalu memakai lebar dan tinggi fisik telepon, termasuk ketika browser berada di Situs desktop.

Kemampuan yang wajib dipertahankan: model Nara, tingkat kecerdasan, mikrofon, kamera, foto, file teks, analisis gambar, pembuatan gambar, Projects, Memory, Plugins, pembaca QR, dan konektor yang tersedia.

## Cache

Service worker v19 memakai marker `ngeblogging-app-v14-20260724-v19`. Cache lama dihapus pada activation agar CSS desktop mini dari v18 tidak terus digunakan.

## Pemeriksaan wajib

- Mobile biasa portrait dan landscape.
- Situs desktop pada Chrome Android, Firefox Android, UC Browser, dan Opera.
- Tablet, laptop, dan desktop asli.
- Sidebar buka/tutup minimal sepuluh kali tanpa tombol ganda.
- Launcher Nara ketika sidebar tertutup dan terbuka.
- Nara fullscreen, model, kecerdasan, lampiran, mikrofon, gambar, QR, Memory, Projects, dan Plugins.
- Editor tanpa ruang kosong panjang dan seluruh panel pengaturan tetap tersedia.
- Lihat situs tenant tidak menghasilkan 404.

Rilis tidak boleh disebut selesai sebelum build, deployment, dan pemeriksaan live berhasil.
