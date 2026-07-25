# Ngeblogging Studio shell v29

Authority v29 mengganti tumpukan perbaikan mobile v24–v28 dengan satu kontrak Studio yang terpisah dari landing page dan renderer situs publik.

## Sidebar per perangkat

| Mode | Sidebar tertutup | Sidebar terbuka | Tombol |
|---|---|---|---|
| Phone / browser HP | Hanya tombol logo `n.` di kiri-tengah | Drawer maksimal 84vw / 360px | Tombol X di dalam header drawer |
| Aplikasi / PWA | Sama seperti phone, memperhitungkan safe-area | Drawer penuh tinggi aplikasi | Tombol X di dalam header drawer |
| Tablet / foldable | Tombol logo `n.` | Drawer maksimal 48vw / 390px | Tombol X di dalam drawer |
| Desktop-site pada HP | Sidebar desktop terkunci | 220px / 70px | Tombol desktop asli |
| Laptop / Windows / macOS / Linux | Sidebar desktop terkunci | 220px / 70px | Tombol desktop asli |

Header drawer mobile berisi:

1. Logo `n.` di kiri.
2. Nama `ngeblogging` di kanan logo.
3. Tombol X di kanan dalam drawer.
4. Kolom pencarian menu yang benar-benar memfilter daftar.
5. Tombol utama **Buat Post**.
6. Ringkasan, Posts, Pages, Tema, Tata Letak, Media, Nara AI, Analitik, Anggota, Domain, Pengaturan, dan Keluar.

Scrim hanya menggelapkan konten. Scrim tidak memakai blur dan berada di bawah drawer, sehingga menu selalu dapat disentuh.

## Nara AI tiga ukuran

- **Mini** — ukuran awal pada phone, mobile browser, dan aplikasi/PWA.
- **Kotak lengkap** — ukuran awal pada desktop/laptop/Desktop-site, juga dapat dibuka dari mini.
- **Layar penuh** — hanya setelah tombol perbesar ditekan.

Urutan kontrol header Nara:

1. Logo Nara.
2. Judul.
3. Percakapan baru.
4. Mini ↔ kotak lengkap.
5. Kotak ↔ layar penuh.
6. X tutup.

Toolbar composer mempertahankan:

- tombol tambah;
- kamera;
- foto;
- file teks;
- plugins & connectors;
- mode Otomatis/Menulis/Riset/SEO/Kode;
- tingkat kecerdasan;
- model Nara;
- mikrofon perintah suara;
- loudspeaker hasil jawaban;
- tombol kirim.

Panel plugins memakai katalog permission-first dan menampilkan status **Hubungkan**, **Pending**, atau **Connected** untuk GitHub, Supabase, Neon, Cloudflare, PayPal, QRIS, Google Drive, Google Analytics, dan webhook.

## Isolasi desain

Authority v29 tidak memiliki selector landing page, renderer tenant, hero publik, atau tema publik. Landing page dan hasil situs tidak dirombak oleh perubahan ini.

## Pengujian desain

`tests/studio-shell-v29.test.mjs` mengunci:

- hanya v29 yang aktif untuk mobile Studio;
- authority lama tetap tersedia sebagai arsip tetapi `media="not all"` atau script nonaktif;
- drawer memiliki brand, pencarian, X internal, launcher `n.`, dan scrim tanpa blur;
- desktop tetap 220px/70px dan memiliki backup recovery;
- Nara memiliki mini, compact, fullscreen, plugin, mode, mikrofon, dan speaker;
- menu Tata Letak tetap membuka customizer;
- PWA berganti ke cache v29;
- landing page dan tema publik tidak menjadi target CSS v29.

## Checklist manual visual

Uji pada lebar dan mode berikut sebelum menganggap rilis selesai:

- 360 × 800 Android browser;
- 390 × 844 iPhone Safari;
- 412 × 915 Android Chrome;
- PWA standalone Android/iOS;
- 768 × 1024 tablet portrait;
- 1024 × 768 tablet landscape;
- Desktop-site pada ponsel;
- 1366 × 768 laptop;
- 1920 × 1080 desktop.

Pada setiap ukuran, periksa buka/tutup drawer, semua menu, pencarian menu, scroll daftar, Tata Letak, launcher Nara, tiga ukuran Nara, kamera/foto/file, plugin, mikrofon, speaker, model, dan tingkat kecerdasan.
