# Ngeblogging Studio — Production Authority v187

Tanggal: 1 Agustus 2026

## Tujuan

Rilis ini mengunci sumber masalah yang terlihat pada screenshot produksi tanpa menghapus fitur lama. Perubahan dibuat sebagai lapisan otoritas terakhir setelah v185 dan perbaikan data v186.

## Perbaikan sumber

- Enam keluarga layout: Aplikasi, Handphone, Mobile, Perangkat kecil, Tablet, dan Desktop. Desktop memiliki varian Laptop dan Komputer.
- Sidebar desktop menyimpan keadaan buka/tutup. Konten memakai sisa lebar nyata dan tidak berada di bawah sidebar.
- Drawer mobile berada di atas backdrop, seluruh item menu dapat ditekan, logo `n` tetap terlihat dan berada di tengah.
- Situs aktif disimpan kembali ketika pengguna mengganti Workspace dan diberitahukan melalui event `ngeblogging:active-site-change`.
- Editor Posts dan Pages memakai satu kolom penuh pada mobile. Judul tidak pecah per huruf, toolbar dapat digulir, panel metadata dan SEO tetap tersedia.
- Batas utama 5.000 kata menahan publikasi, tetapi tidak memotong atau menghapus draf.
- Theme Studio menampilkan tindakan Edit Tata Letak, Edit HTML, Edit CSS, Edit JavaScript, Widget, dan Lihat situs.
- Filter Media tetap berupa toolbar dan tidak berubah menjadi panel putih yang menutupi halaman.
- Nara AI selalu dibuka pada ukuran kecil. Ukuran kecil dan medium non-modal; hanya full screen yang memakai backdrop dan lock viewport.
- Service worker memakai cache baru, tidak memaksa navigasi, tidak menghapus sesi, dan tidak menjalankan logout.

## Yang tidak diklaim

Rilis ini tidak mengklaim kapasitas 900 juta pengguna. Kapasitas harus dibuktikan melalui pengujian beban nyata, database partitioning, queue, CDN, observability, failover, dan pengujian biaya.

## Validasi wajib sebelum merge

1. Jalankan seluruh test produksi.
2. Jalankan build Vite dan dry-run Cloudflare.
3. Verifikasi login email, Google, GitHub, dan LinkedIn pada konfigurasi provider produksi.
4. Uji ukuran 320×568 sampai 1920×1080, portrait dan landscape.
5. Verifikasi Domain, Analitik, Anggota, Komentar, Media, API Keys, Posts, Pages, Tema, dan Nara pada situs aktif nyata.
6. Setelah deployment, periksa `release-v187.json` dan cache service worker baru.
