# Ngeblogging — Panduan Riset untuk AI dan Auditor

Dokumen ini menjadi peta teknis untuk AI, pengembang, auditor keamanan, dan penguji produk. Jangan menyatakan sebuah fitur aktif hanya karena tombol atau kode antarmukanya ada.

## Sumber kebenaran

- Aplikasi: `src/main.jsx`
- Studio: `src/StudioSecure.jsx`, `src/StudioNext.jsx`
- Nara Assistant: `src/NaraAssistant.jsx`
- Nara Control Center: `src/NaraWorkspace.jsx`
- Situs publik tenant: `src/PublicSite.jsx`
- Worker: `cloudflare/worker.mjs`
- Runtime Nara: `server/nara-runtime.mjs`, `server/workers-ai-nara.mjs`
- Gambar Nara: `server/nara-image-handler.mjs`
- Domain: `server/domain-handler.mjs`
- SEO: `server/seo-handler.mjs`
- Deploy: `wrangler.jsonc`, `.github/workflows/cloudflare.yml`
- Database: direktori `supabase/`
- Test: direktori `tests/`

## Aturan audit

1. Periksa `GET /api/health` tanpa cache.
2. Pastikan apex, `www`, dan `*.ngeblogging.com` menuju Worker yang sama.
3. Buka tenant nyata dan pastikan bukan 404.
4. Uji tombol Nara mengambang pada ponsel, tablet, dan desktop.
5. Pastikan dialog Nara bukan panel putih kosong dan semua kontrol dapat disentuh.
6. Uji model, tingkat kecerdasan, file, gambar, baca gambar, mikrofon, QR, retry, dan error degraded.
7. Uji Projects, memori jangka panjang, generator gambar, dan Plugins dari Control Center—bukan dari menu sidebar.
8. Pastikan menu bawah tidak ada dan hanya satu tombol buka/tutup sidebar kiri.
9. Uji Post, Page, tema, publikasi, subdomain, SEO, dan tombol “Lihat situs”.
10. Jangan mengklaim pembayaran, email bermerek, custom domain, atau plugin terhubung bila credential server dan probe nyata belum tersedia.

## Nara AI

Kapabilitas yang harus tetap terlihat dan tidak boleh dihapus ketika provider sedang bermasalah:

- model dan tingkat kecerdasan;
- kamera, gambar, file teks, dan pembacaan gambar;
- mikrofon/perintah suara;
- pembacaan kode QR melalui kamera/gambar dan vision fallback;
- Projects dan memori jangka panjang dengan RLS;
- generator gambar dan penyimpanan hasil ke Media;
- plugin permission-first untuk GitHub, Supabase, Neon, Cloudflare, dan penyedia lain.

Nara tidak menjadi item menu sidebar. Pintu masuk utamanya adalah tombol mengambang. Control Center dibuka dari dalam Nara.

## Navigasi Studio

- Hanya sidebar kiri.
- Tidak ada menu bawah atau mobile sheet kedua.
- Hanya satu tombol buka/tutup di tepi sidebar.
- Saat ditutup, ikon menu tetap terlihat.
- Pada ponsel, konten tidak boleh ketimpa, terpotong, atau terkunci oleh overlay.

## Subdomain dan situs publik

- Pola bawaan: `<slug>.ngeblogging.com`.
- Target akun saat ini: 5 situs gratis, maksimum 12.
- Tombol “Lihat situs” harus membuka tenant yang benar.
- Tenant harus merender konten, tema, favicon, metadata SEO, sitemap, feed, dan schema miliknya sendiri.

## Tema

Audit harus membuktikan tema memiliki ID dan struktur HTML yang benar-benar berbeda, bukan hanya warna berbeda. Uji preview telepon, tablet, desktop, dan layar lebar serta bandingkan dengan hasil tenant publik.

## Pembayaran dan email

Alamat PayPal merchant saja tidak mengaktifkan pembayaran. PayPal baru dianggap live bila client ID, client secret, webhook ID, dan lingkungan `live` tersedia. Email `@ngeblogging.com` baru boleh diklaim aktif bila sender domain terverifikasi dan delivery probe benar-benar berhasil.

## Kondisi yang menggagalkan rilis

- tombol Nara hilang atau tidak dapat diklik;
- dialog Nara kosong;
- input file native terlihat;
- menu bawah muncul;
- ada dua tombol sidebar;
- tenant 404;
- cache PWA lama masih tersaji;
- pembayaran/email/domain diklaim aktif tanpa bukti;
- test atau build gagal.
