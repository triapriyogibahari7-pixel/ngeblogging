# Studio dan Nara v21

## Tujuan

Rilis v21 menghapus ketergantungan pada tombol proxy Nara dan menyatukan perilaku sidebar pada telepon, browser mobile dengan opsi **Situs desktop**, tablet, aplikasi, laptop, dan desktop.

## Sidebar Studio

- Satu sidebar kiri menjadi sumber navigasi.
- Satu tombol edge React menempel pada batas sidebar.
- Pada telepon, sidebar pertama kali terbuka sebagai rail ikon.
- Saat ditutup, ikon Ringkasan, Posts, Pages, Tema, Tata Letak, Media, Analitik, Anggota, Domain, Pengaturan, dan Keluar tetap terlihat.
- Saat dibuka, label dan ikon tampil di panel yang sama.
- Scrim berada di belakang sidebar, sehingga tidak menutupi isi menu.
- Menu bawah, mobile sheet, tombol close tambahan, serta tombol edge sintetis dihapus.
- Nara tidak menjadi item menu sidebar; route internal tetap disimpan untuk Projects, Memory, Images, Plugins, dan QR.
- Tata Letak membuka customizer Tema yang sebenarnya.

## Nara global

`NaraGlobalV21.jsx` membuat satu React root di `document.body`. Ini bukan tombol tiruan dan bukan clone DOM. Root tersebut merender komponen `NaraAssistant` asli, sehingga state, autentikasi Supabase, lampiran, model, kecerdasan, mikrofon, kamera, foto, file teks, analisis gambar, riwayat percakapan, dan error handling tetap memakai kode Nara yang sama.

Semua pintu masuk berikut membuka instance global yang sama:

- tombol Nara kanan atas Studio;
- tombol Nara editor;
- tombol **Buka Nara** pada Ringkasan;
- tombol **Buka Nara** pada Workspace;
- tombol mengambang kanan bawah;
- API browser `window.NgebloggingNara.open(context)`.

Root global berada di luar `#root`, sehingga tidak terpotong oleh zoom atau stacking context ketika Chrome, Opera, UC Browser, atau browser Android lain memakai mode Situs desktop.

## Kemampuan yang dipertahankan

- Nara Mini, Writer, Vision, dan Max;
- kecerdasan Ringan, Sedang, Tinggi, dan Ekstra tinggi;
- mikrofon dan perintah suara;
- kamera, foto, file TXT, Markdown, CSV, dan JSON;
- membaca gambar dan membuat gambar;
- Projects, Memory, Images, Plugins;
- pembaca QR melalui BarcodeDetector dan fallback yang tersedia;
- katalog konektor GitHub, Supabase, Neon, Cloudflare, PayPal, Google Drive, dan webhook.

## PWA

Service worker memakai cache `ngeblogging-app-v14-20260724-v21`, menghapus cache v20 ketika aktif, dan mengambil JavaScript/CSS aplikasi melalui strategi network-first.

## Pemeriksaan wajib

1. Sidebar dibuka dan ditutup berulang kali tanpa tombol ganda.
2. Saat sidebar ditutup, semua ikon tetap terlihat dan terpusat.
3. Scrim tidak menutup panel sidebar.
4. Ikon mata, Nara, dan avatar mempunyai ukuran serta pusat yang sama.
5. Tombol Nara header, Ringkasan, editor, Workspace, dan floating membuka dialog yang sama.
6. Dialog Nara memenuhi viewport dan seluruh kontrol dapat disentuh.
7. Model, kecerdasan, lampiran, mikrofon, gambar, Memory, Projects, Plugins, dan QR tetap tersedia.
8. Tata Letak membuka customizer Tema.
9. Subdomain publik tidak menampilkan halaman 404 generik.
10. Quality gate, build, deploy Cloudflare, dan pemeriksaan live harus lulus sebelum rilis dinyatakan selesai.
