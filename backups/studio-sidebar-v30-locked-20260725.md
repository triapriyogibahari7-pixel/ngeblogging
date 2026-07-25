# Sidebar Studio v30 — cadangan terkunci

Cadangan ini dibuat setelah pemilik menyetujui tampilan sidebar mobile dan desktop pada 25 Juli 2026.

## Status

- Berkas CSS cadangan: `backups/studio-sidebar-v30-locked-20260725.css`
- Tidak dimuat oleh `index.html`.
- Tidak boleh diedit oleh pekerjaan yang hanya menyentuh Nara AI.
- Sumber produksi yang disetujui: `src/studio-shell-v30.css` dan `src/studio-shell-v30.js`.

## Kontrak desktop

- Terbuka: 220 px.
- Tertutup: 70 px.
- Konten utama selalu mengimbangi lebar sidebar.
- Tombol asli desktop tetap tersedia.

## Kontrak mobile/tablet/app

- Drawer menempel ke `left: 0` tanpa gutter.
- Saat tertutup, tombol `n.` berada di kiri atas.
- Header drawer berisi logo `n.`, tulisan Ngeblogging, dan tombol X.
- Scrim berada di bawah drawer dan tidak memakai blur.
- Semua menu tetap dapat disentuh.

## Pemulihan

Jika sidebar aktif rusak, bandingkan aturan di `src/studio-shell-v30.css` dengan cadangan ini. Jangan memuat berkas cadangan langsung bersama authority aktif karena dapat membuat dua sumber CSS saling bertabrakan.
