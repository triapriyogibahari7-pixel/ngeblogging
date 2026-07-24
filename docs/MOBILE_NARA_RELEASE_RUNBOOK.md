# Ngeblogging Mobile & Nara Release Runbook

Dokumen ini adalah panduan audit untuk manusia maupun AI yang memeriksa Studio Ngeblogging, Nara AI, PWA, dan situs tenant publik.

## Invarian antarmuka Studio

- Studio hanya memiliki satu sidebar kiri.
- Hanya ada satu tombol buka/tutup sidebar yang menempel pada garis tepi sidebar.
- Saat sidebar ditutup, ikon setiap menu tetap terlihat dan label teks disembunyikan.
- Navigasi bawah, sheet menu kedua, tombol tutup sidebar kedua, dan route Nara di dalam menu tidak boleh tampil.
- Nara tetap tersedia melalui tombol tindakan di header dan tombol mengambang kanan bawah.
- Tombol pratinjau, Nara, dan avatar pada header ponsel harus memiliki ukuran, pusat ikon, dan garis dasar yang sama.
- Konten utama memakai lebar otomatis setelah icon rail; jangan mengurangi lebar viewport dua kali.

## Deteksi perangkat

`src/pwa-runtime.js` menentukan mode berdasarkan ukuran fisik layar, bukan hanya `window.innerWidth`.

Hal ini penting ketika browser Android menggunakan “Situs desktop”: layout viewport dapat menjadi jauh lebih lebar daripada layar fisik. Runtime menulis atribut berikut pada elemen `<html>`:

- `data-device-mode`
- `data-physical-mobile`
- `data-desktop-site-phone`
- `data-orientation`
- `--sn-browser-scale`
- `--sn-physical-layout-width`
- `--sn-physical-layout-height`

`src/studio-v14-authority.css` memakai atribut tersebut untuk menjaga layout ponsel, termasuk pada viewport desktop buatan browser.

## Nara AI yang wajib dipertahankan

- Nara Mini, Nara Writer, Nara Vision, dan Nara Max.
- Tingkat kecerdasan Ringan, Sedang, Tinggi, dan Ekstra tinggi.
- Input teks, mikrofon, kamera, foto, file TXT/Markdown/CSV/JSON, dan pembacaan gambar.
- Projects, memori jangka panjang, generator gambar, Plugins, dan pembaca QR.
- Katalog integrasi GitHub, Supabase, Neon, Cloudflare, PayPal, Google Drive, dan webhook.
- Tombol file native harus tetap tersembunyi; pemilihan file hanya dibuka melalui kontrol Nara.
- Panel Nara pada ponsel wajib memakai seluruh viewport dengan `inset: 0`, bukan lebar yang masih dikurangi sidebar.

## Dukungan browser

### Dukungan penuh

Chrome/Chromium Android terbaru, Edge Android, Firefox Android terbaru, serta mode PWA mendapat layout responsif, unggah file, kamera, mikrofon bila Web Speech tersedia, service worker, dan Nara viewport penuh.

### Progressive enhancement

UC Browser dan Opera Mini dapat membatasi Web Speech, `BarcodeDetector`, service worker, kamera langsung, atau JavaScript modern. Pada browser tersebut:

- pertanyaan tetap dapat diketik;
- gambar QR dapat dikirim sebagai lampiran untuk dibaca Nara Vision;
- pemilihan file memakai input perangkat bila API kamera langsung tidak tersedia;
- fitur yang tidak didukung browser tidak boleh diklaim aktif atau membuat seluruh Studio macet.

Tidak ada aplikasi web yang dapat memaksa API yang sengaja tidak disediakan oleh browser. Kewajiban Ngeblogging adalah menyediakan fallback yang jujur dan menjaga fungsi inti tetap dapat digunakan.

## Gerbang mutu

Workflow `Main quality gate` harus lulus sebelum perubahan dianggap lolos pemeriksaan sumber. Gerbang tersebut menjalankan:

1. seluruh pengujian produksi;
2. validasi berkas produksi;
3. build Vite;
4. dry-run bundle Cloudflare.

Deployment Cloudflare adalah gerbang terpisah. Kegagalan karena `CLOUDFLARE_ACCOUNT_ID` atau `CLOUDFLARE_API_TOKEN` kosong berarti build belum dapat diterbitkan ke domain produksi, bukan berarti fitur boleh disebut selesai.

## Pemeriksaan visual wajib

Uji setidaknya pada lebar fisik 320, 360, 390, 412, 600, 768, 1024, 1366, dan 1920 piksel, portrait dan landscape.

Pada setiap ukuran periksa:

- tidak ada ruang kosong horizontal akibat pengurangan lebar ganda;
- tidak ada teks atau tombol saling menimpa;
- ikon mata dan ikon Nara tepat di tengah tombol;
- tombol mengambang Nara dapat diklik dan tidak tertutup overlay;
- panel Nara mengisi seluruh viewport ponsel;
- composer, pilihan model, pilihan kecerdasan, mikrofon, lampiran, dan tombol kirim tetap terlihat;
- sidebar tertutup tetap menampilkan semua ikon;
- tidak ada menu bawah;
- halaman Domain menampilkan subdomain gratis dan status publikasi;
- tombol Lihat situs membuka tenant, bukan halaman 404.

## Kriteria produksi

Jangan menyatakan rilis selesai sebelum semuanya benar:

- Main quality gate sukses.
- Deployment Cloudflare sukses.
- `/api/health` mengembalikan release yang benar serta status Nara, vision, generator gambar, wildcard subdomain, auth, billing, dan domain sesuai kenyataan.
- Smoke test apex, service worker, aset bundle, Nara API, dan tenant publik lulus.
- Situs tenant tidak menampilkan 404 atau “Situs belum tersedia” setelah dipublikasikan.
- PayPal hanya ditampilkan aktif setelah credential live, webhook, nominal, mata uang, dan idempotensi benar-benar terverifikasi.
- Email `@ngeblogging.com` hanya diklaim aktif setelah pengiriman dan penerimaan verifikasi diuji.
