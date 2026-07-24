# Studio Mobile dan Nara AI v16

Dokumen ini menjadi sumber pemeriksaan untuk navigasi Studio, Nara AI, dan tampilan lintas perangkat.

## Aturan antarmuka yang wajib

- Studio hanya mempunyai satu navigasi utama: sidebar kiri.
- Tidak ada bottom navigation, mobile sheet, atau tombol tutup sidebar kedua.
- Hanya satu tombol edge yang menempel pada garis sidebar untuk membuka dan menutup.
- Saat sidebar ditutup, rail kiri tetap terlihat dan seluruh ikon menu tetap dapat digunakan.
- Nara AI tidak ditampilkan sebagai menu sidebar. Nara dibuka melalui tombol header atau launcher mengambang kanan bawah.
- Menu **Tata Letak** membuka visual customizer tema yang aktif.
- Tombol pratinjau, Nara, dan avatar harus berada di tengah kotaknya, tidak miring, tidak terpotong, dan mempunyai target sentuh minimal 40–44 piksel.

## Kemampuan Nara yang tidak boleh dihapus

Nara Assistant mempertahankan model, tingkat kecerdasan, mikrofon, kamera, foto, file teks, pembacaan gambar, dan percakapan. Command Center mempertahankan Projects, Memory, pembuatan gambar, Plugins, dan pembaca kode QR. Workspace Nara tetap berada di source dan dibuka dari Command Center, tetapi route-nya tidak terlihat di sidebar.

## Perbaikan interaksi v16

`studio-sidebar-v15.js` sekarang memakai rilis runtime v16. Intersepsi `pointerdown` sintetis dihapus agar klik React pada launcher Nara berjalan secara native. Listener penutup sidebar duplikat juga dihapus; penutupan setelah memilih menu dimiliki oleh StudioSecure sehingga satu ketukan tidak menutup lalu membuka kembali.

Runtime melakukan deduplikasi tombol edge dan scrim, menghapus permukaan navigasi lama, serta memasukkan route Tata Letak setelah menu Tema.

## Perbaikan browser mobile mode desktop

Beberapa browser Android dapat melaporkan layout viewport desktop walaupun perangkat fisiknya telepon. `studio-mobile-v16.css` memulihkan `--sn-physical-layout-width` dan `--sn-browser-scale` yang dihitung PWA runtime. Pada mobile normal, zoom dipaksa kembali ke 1. Dengan aturan ini Studio tidak boleh menyisakan area kosong, terpotong, atau mengecil ke salah satu sisi.

## Cache dan pembaruan

Service worker menggunakan cache `ngeblogging-app-v14-20260724-v16`. Cache lama dihapus saat aktivasi, sedangkan navigasi dan source runtime tetap memakai strategi network-first. Setelah deployment, tab lama perlu memuat ulang sekali agar service worker baru mengambil kendali.

## Pemeriksaan produksi

1. Buka Studio pada mobile portrait, mobile landscape, tablet, laptop, dan desktop.
2. Tutup sidebar dan pastikan semua ikon tetap terlihat.
3. Buka-tutup sidebar berkali-kali; hanya satu tombol edge yang boleh terlihat.
4. Klik launcher Nara dan tombol Nara di header; dialog harus memenuhi viewport.
5. Uji model, tingkat kecerdasan, mikrofon, kamera, foto, file, Projects, Memory, Images, Plugins, dan QR.
6. Klik Tata Letak; visual customizer harus terbuka tanpa menimpa header atau keluar dari viewport.
7. Klik Lihat situs pada tenant aktif dan pastikan tidak muncul halaman 404.
8. Periksa `/api/health`, service worker, asset bundle, serta tenant wildcard setelah deployment.

Perubahan tidak boleh disebut selesai apabila pemeriksaan produksi atau tenant wildcard masih gagal.
