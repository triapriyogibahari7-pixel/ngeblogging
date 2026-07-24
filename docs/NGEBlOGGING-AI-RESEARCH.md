# Ngeblogging — Panduan Riset Menyeluruh untuk AI dan Auditor

Dokumen ini adalah peta teknis untuk AI, pengembang, auditor keamanan, dan penguji produk yang perlu memahami Ngeblogging tanpa menebak-nebak kemampuan yang belum aktif.

## Aturan kebenaran

1. Jangan menyatakan fitur aktif hanya karena tombol, komponen, atau schema tersedia.
2. Status produksi harus dibuktikan melalui `GET /api/health`, respons tenant publik, dan rilis PWA yang sedang disajikan.
3. Jangan mengklaim kapasitas pengguna, storage, trafik, atau uptime sebelum ada pengujian beban dan infrastruktur nyata.
4. Pembayaran, email bermerek, custom domain, OAuth plugin, serta penyedia AI premium harus dianggap tidak aktif bila health check atau secret server belum membuktikannya.
5. Tindakan sensitif—publikasi, penghapusan, pembayaran, domain, dan integrasi—harus memerlukan konfirmasi pengguna.

## Sumber kebenaran utama

- Aplikasi React: `src/main.jsx`
- Studio: `src/StudioSecure.jsx` dan `src/StudioNext.jsx`
- Nara Assistant: `src/NaraAssistant.jsx`
- Nara Control Center: `src/NaraWorkspace.jsx`
- Editor: `src/ContentEditor.jsx`
- Tema: `src/ThemeStudio.jsx` dan katalog tema terkait
- Situs tenant publik: `src/PublicSite.jsx`
- Worker produksi: `cloudflare/worker.mjs`
- Runtime Nara: `server/nara-runtime.mjs` dan `server/workers-ai-nara.mjs`
- Generator gambar: `server/nara-image-handler.mjs`
- Domain: `server/domain-handler.mjs`
- SEO tenant: `server/seo-handler.mjs`
- Deployment Cloudflare: `wrangler.jsonc` dan `.github/workflows/cloudflare.yml`
- Database/migrasi: direktori `supabase/`
- Regression test: direktori `tests/`

## Arsitektur permintaan

1. Browser memuat aplikasi dari `ngeblogging.com` atau tenant `*.ngeblogging.com`.
2. Cloudflare Worker berjalan sebelum asset statis karena `run_worker_first` aktif.
3. Endpoint `/api/*` diproses oleh Worker.
4. Permintaan halaman tenant diteruskan ke asset React dan diperkuat oleh metadata SEO tenant.
5. Autentikasi browser memakai Supabase. Token akses dikirim melalui header `Authorization: Bearer ...` untuk endpoint terlindungi.
6. Nara memilih penyedia teks yang benar-benar tersedia: Qwen bila secret lengkap, atau Cloudflare Workers AI sebagai fallback.
7. Gambar Nara hanya dianggap aktif bila penyedia gambar utama dan workspace yang diperlukan tersedia.

## Endpoint produksi yang wajib diaudit

### `GET /api/health`

Field penting:

- `status`: harus `ok`
- `service`: harus `ngeblogging-cloudflare`
- `release`: harus sama dengan `APP_RELEASE`
- `nara`: kesiapan jawaban teks nyata
- `naraProviders`: penyedia yang aktif
- `imageGeneration`: kesiapan generator gambar nyata
- `billing`: pembayaran nyata, bukan tampilan palsu
- `customDomains`: provisioning domain nyata
- `emailRegistration`: pengiriman email bermerek yang sudah diuji
- `managedSubdomains`: routing subdomain bawaan
- `siteLimits.free`: jumlah situs gratis
- `siteLimits.maximum`: batas teknis akun saat ini

### `POST /api/nara`

Menerima pesan, model, tingkat kecerdasan, konteks, riwayat, serta lampiran gambar atau file teks. Audit harus memeriksa:

- origin validation;
- ukuran payload;
- autentikasi Supabase ketika diperlukan;
- fallback provider;
- batas waktu dan pesan error;
- tidak ada secret di browser;
- lampiran gambar tidak hilang;
- input file native tetap tersembunyi dan hanya dibuka melalui UI yang dirancang.

### `POST /api/nara/image`

Harus ditolak dengan status yang jujur bila provider gambar belum siap. Hasil yang berhasil harus disalin ke Media/Storage situs karena URL provider dapat bersifat sementara.

### `/api/domains/*`

Custom domain hanya boleh ditampilkan aktif bila token Cloudflare, zone, hostname target, dan Supabase service role tersedia di server.

### `/api/billing/*`

PayPal hanya dianggap live bila client ID, client secret, webhook ID, dan `PAYPAL_ENV=live` benar-benar tersedia. Email merchant saja tidak cukup untuk mengaktifkan pembayaran.

## Nara AI — kapabilitas yang harus dipertahankan

Nara tidak ditempatkan sebagai menu sidebar utama. Pintu masuk utama adalah tombol mengambang yang selalu terlihat dan dapat diklik. Control Center dapat dibuka dari alur Nara tanpa menambah menu bawah.

Kapabilitas produk:

- pemilihan model;
- tingkat kecerdasan;
- percakapan dan riwayat;
- lampiran kamera, gambar, dan file teks;
- pembacaan gambar;
- perintah suara melalui izin mikrofon browser;
- Projects;
- memori jangka panjang dengan RLS;
- generator gambar dan penyimpanan hasil ke Media;
- plugin/connectors dengan permission-first;
- GitHub, Supabase, Cloudflare, dan penyedia lain melalui backend/OAuth yang aman;
- pemindaian QR melalui lampiran kamera/gambar dan model vision saat provider yang mendukungnya aktif.

Ketersediaan UI tidak boleh dihapus hanya karena provider sedang degraded. UI harus tetap terlihat, sedangkan server mengembalikan status dan tindakan pemulihan yang jujur.

## Navigasi Studio

Invarian wajib:

- hanya ada sidebar kiri;
- tidak ada menu bawah atau mobile sheet kedua;
- hanya satu tombol buka/tutup yang menempel di tepi sidebar;
- ketika sidebar diperkecil, ikon menu tetap terlihat;
- Nara tidak muncul sebagai item sidebar;
- pada layar kecil, panel tidak boleh menutupi seluruh aplikasi secara permanen;
- tidak boleh ada teks, kartu, dialog, atau input yang saling menimpa;
- semua target sentuh minimum harus layak digunakan pada ponsel.

## Situs, subdomain, dan tenant

- Subdomain bawaan mengikuti pola `<slug>.ngeblogging.com`.
- Routing wildcard harus mencakup apex, `www`, dan `*.ngeblogging.com`.
- Tombol “Lihat situs” harus membuka tenant yang benar dan tidak boleh berakhir pada halaman 404 generik.
- Satu akun saat ini ditargetkan mendapat 5 situs gratis dengan batas maksimum 12, dan nilai ini harus sama antara UI, schema, health check, serta test.
- Situs tenant harus membaca konten, tema, metadata SEO, favicon, dan status publikasi milik tenant yang sesuai.

## Tema dan hasil situs

Audit katalog tema harus membuktikan:

- jumlah ID unik sesuai katalog;
- HTML/struktur unik, bukan hanya penggantian warna;
- variasi layout dan komposisi;
- responsif pada telepon, tablet, desktop, dan layar lebar;
- menu publik yang dapat digunakan;
- gambar, widget, Posts, Pages, footer, dan metadata tenant dirender;
- preview editor sama dengan keluaran tenant dalam batas yang terdokumentasi;
- tidak ada tema yang menghasilkan halaman kosong atau 404.

## SEO

Setiap tenant publik harus diaudit untuk:

- title dan description;
- canonical;
- robots;
- sitemap;
- feed bila relevan;
- Open Graph dan kartu sosial;
- schema terstruktur;
- heading yang teratur;
- alt text media;
- performa dan aksesibilitas;
- hostname tenant yang benar, tanpa metadata tenant lain.

## Email registrasi

Email verifikasi tidak boleh diklaim berasal dari `@ngeblogging.com` sebelum:

- sender domain telah diverifikasi;
- SMTP/provider tersedia;
- `AUTH_EMAIL_FROM` memakai domain tersebut;
- delivery probe nyata berstatus `passed`;
- email diterima pada pengujian eksternal.

Bila belum siap, UI harus memakai alur Supabase standar atau menyembunyikan klaim email bermerek.

## Pembayaran

Saat dokumen ini dibuat, konfigurasi repo memakai sandbox sebagai default. Produksi tidak boleh menampilkan pembayaran aktif sampai health check `billing=true`. Jangan pernah menganggap alamat PayPal merchant sebagai pengganti credential API dan webhook.

## Plugin dan connector

Record “pending” hanya mencatat permintaan. Status “connected” memerlukan OAuth atau secret vault di server. Secret dilarang masuk ke localStorage, bundle Vite, log browser, atau database yang dapat dibaca publik.

## PWA dan cache

- Service worker harus memakai nomor rilis baru pada perubahan UI kritis.
- Navigasi memakai network-first agar shell lama tidak terkunci.
- Asset immutable memakai cache-first.
- Cache lama harus dihapus saat activate.
- Aplikasi tidak boleh reload paksa ketika pengguna sedang mengetik, mengunggah, atau berinteraksi dengan Nara.

## Prosedur audit produksi

1. Ambil `GET /api/health` tanpa cache.
2. Pastikan `release` cocok dengan commit/deployment yang sedang diuji.
3. Buka apex dan pastikan marker shell lama tidak ada.
4. Buka satu tenant nyata dan pastikan bukan 404.
5. Uji daftar/masuk, session restore, dan logout.
6. Uji satu tombol sidebar pada lebar 320, 360, 390, 768, 1024, dan desktop.
7. Klik tombol Nara pada setiap ukuran dan pastikan dialog penuh dapat digunakan.
8. Uji teks, model, kecerdasan, mikrofon, gambar, file, retry, dan error degraded.
9. Uji Projects, memory, image generation, dan plugin status.
10. Buat Post dan Page, simpan, terbitkan, lalu buka tenant.
11. Ganti tema dan perangkat preview; bandingkan hasil publik.
12. Uji robots, sitemap, canonical, Open Graph, dan schema.
13. Pastikan pembayaran, email bermerek, dan custom domain hanya terlihat aktif bila health check membuktikannya.
14. Jalankan seluruh test, build Vite, Cloudflare dry-run, deploy, lalu smoke test produksi.

## Kondisi gagal yang harus menghentikan rilis

- shell `WHITE-R4-2026.07.12` masih tersaji;
- `release` health tidak cocok;
- Nara launcher hilang atau tidak dapat diklik;
- input file native terlihat;
- menu bawah muncul;
- ada lebih dari satu tombol sidebar;
- tenant 404;
- health menyatakan Nara aktif tetapi endpoint gagal karena konfigurasi;
- pembayaran/email/domain ditampilkan aktif tanpa credential nyata;
- service worker lama masih tersaji;
- test atau build gagal.

## Prinsip pengembangan

Ngeblogging harus berkembang melalui bukti: source code, migrasi, test, build, deployment, health check, dan pengujian browser nyata. Kata “selesai” hanya layak digunakan setelah perilaku produksi yang diminta sudah terverifikasi, bukan setelah UI atau kode semata dibuat.
