# Ngeblogging: spesifikasi pembangunan dan migrasi Cloudflare

Dokumen kerja untuk proyek milik Tri Apriyogi Bahari, berdasarkan permintaan 17 Oktober 2026. Ini adalah spesifikasi implementasi, bukan pernyataan bahwa migrasi, pembayaran, atau seluruh fitur sudah selesai.

## Status dan batas perubahan

- **Batch tampilan:** perbaikan Studio dan logo A dikirim ke main; hasil deployment diperiksa terpisah.
- **Migrasi Cloudflare:** belum dijalankan. Jangan hapus Supabase, tabel, objek, atau akun sebelum migrasi tervalidasi.
- **Pembayaran:** Midtrans dipilih; merchant belum didaftarkan. Jangan menerima pembayaran nyata sebelum merchant, rekening, harga, dan webhook diverifikasi.
- **Skala:** bangun kapasitas bertahap berdasarkan pengujian, bukan klaim “900 juta miliar pengguna”, “100% aman”, atau “pasti untung”.
- **Biaya:** jangan mengaktifkan langganan berbayar, membeli domain, atau menaikkan paket tanpa persetujuan biaya.

## Tujuan produk

- **Identitas:** Ngeblogging.com, pendiri/pemilik/pengembang Tri Apriyogi Bahari, logo A Gradien Premium.
- **Akun pengguna:** target minimal 12 situs per akun dan 5.000 artikel gratis per akun, dihitung bersama di seluruh situs akun tersebut, bukan 5.000 per situs.
- **Penyimpanan:** kuota artikel terpisah dari kuota byte, revisi, gambar, video, permintaan API, serta komputasi AI. Jangan menjanjikan media atau AI tidak terbatas.
- **Paket:** Gratis, Pro, Max serta tambahan penyimpanan. Harga dan kuota berbayar harus mendapat persetujuan pemilik setelah model biaya disusun.
- **Kepemilikan:** kode aplikasi, skema, ekspor data, dan dokumentasi berada di repositori pemilik. Menggunakan Cloudflare mengurangi ketergantungan pada Supabase, bukan menghapus ketergantungan infrastruktur.
- **Administrasi:** `database.ngeblogging.com` hanya untuk satu identitas administrator yang ditetapkan pemilik. Pengguna biasa hanya boleh mengakses data mereka lewat API terotorisasi.

## Arsitektur target

- **Workers:** API, otorisasi, resolusi tenant, sesi, kuota, webhook, dan rendering publik. Pertahankan satu pintu masuk routing yang jelas.
- **Workers Static Assets / Pages:** aset frontend. Pertahankan deployment Workers yang ada; Pages hanya ditambahkan bila ada aplikasi terpisah yang memerlukannya, bukan memindah router secara serentak.
- **D1:** identitas aplikasi, profil, situs, anggota, metadata artikel, domain, paket, pembayaran, audit, dan status migrasi.
- **R2 private:** isi artikel besar, revisi, berkas asli, gambar, video, cadangan. Akses objek harus melalui pemeriksaan izin atau URL bertanda tangan berumur pendek.
- **Queues / Durable Objects:** pekerjaan latar, retry, pembatasan laju, koordinasi kuota dan idempotensi bila diperlukan.
- **Turnstile:** penghalang bot pada pendaftaran, pemulihan akun, dan aksi rawan penyalahgunaan, dengan validasi server.
- **Cloudflare Access:** lapisan tambahan untuk konsol pemilik; jangan menjadikan halaman admin dapat diakses hanya karena URL-nya tidak diumumkan.

D1 tidak merupakan satu database tanpa batas: batas saat ini 500 MB per database pada Free dan 10 GB pada Workers Paid; rancang pemisahan tenant/shard dan pantau batas akun, bukan menaikkan angka secara fiktif ([Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/)). R2 adalah object storage, bukan layanan login; penyimpanan dan operasi di atas jatah gratis tetap menimbulkan biaya ([Cloudflare R2](https://developers.cloudflare.com/r2/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/)).

## Model data yang harus dibangun

- **Identitas:** users, identities, sessions, verification_tokens, passkeys, mfa_factors, recovery_codes. Gunakan pustaka autentikasi yang ditinjau, bukan algoritme kriptografi buatan sendiri.
- **Profil:** display_name, bio, avatar_asset_id, locale, timezone, occupation, organization, public_location, website, social_links, visibility_settings. Nomor telepon/alamat lengkap tidak wajib dan tidak dipublikasikan otomatis.
- **Tenant:** sites, site_memberships, invitations, site_settings, site_domains, domain_verifications, domain_checks.
- **Konten:** contents, content_revisions, taxonomies, content_taxonomies, themes, theme_versions, widgets, media_assets.
- **Komunitas:** comments, moderation_events, member_preferences.
- **Bisnis:** plans, subscriptions, orders, payment_events, entitlements, usage_counters, quota_reservations, invoices.
- **Operasional:** audit_events, notification_outbox, notification_delivery_events, migration_jobs, migration_checkpoints.
- **Integrasi:** api_keys, oauth_connections, adsense_settings. Simpan hanya hash API key; tampilkan secret sekali pada pembuatan.

Semua baris tenant memiliki site_id/account_id dan indeks relevan. Setiap query wajib memakai identitas yang diverifikasi server, bukan mempercayai owner_id dari browser; D1 tidak boleh dianggap otomatis mewarisi kebijakan RLS Supabase.

## Login milik Ngeblogging

- **Halaman:** login/daftar/pemulihan berada di domain Ngeblogging dengan logo A. Jangan meminta sandi akun Cloudflare pengguna untuk masuk Ngeblogging.
- **Sesi:** cookie host-only, Secure, HttpOnly, SameSite, rotasi setelah login/perubahan hak akses. Jangan membagikan cookie autentikasi ke semua subdomain tenant.
- **Sandi:** pustaka KDF yang mapan dengan parameter yang diuji pada Workers; jangan plaintext, enkripsi reversibel, atau hash cepat tanpa salt.
- **Passkey/MFA:** pendaftaran, verifikasi, penghapusan dengan autentikasi ulang, recovery code sekali pakai yang di-hash, serta rate limit.
- **Pemulihan:** token acak berumur singkat, hash token di server, konsumsi atomik sekali pakai, respons yang tidak membocorkan keberadaan email.
- **Keamanan akun:** tombol di profil untuk ubah sandi, sesi/perangkat, keluar dari sesi lain, MFA/passkey, dan riwayat keamanan. Jangan menampilkan “aktif” jika backend belum mendukungnya.
- **Proteksi:** CSRF/Origin checks pada mutasi, CSP yang diuji, sanitasi konten, pembatasan upload, CORS allowlist, dan audit peristiwa sensitif tanpa secret.

Turnstile harus divalidasi melalui Siteverify di backend; widget saja tidak melindungi form, dan token bersifat sekali pakai serta kedaluwarsa ([Cloudflare server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)).

## Profil dan sosial media

- **UI:** bagian Identitas, Profil publik, Sosial media, Preferensi, Keamanan. Pertahankan editor Post/Page serta tata letak desktop di luar perubahan yang disetujui.
- **Tautan:** Instagram, Facebook, X, TikTok, YouTube, LinkedIn, GitHub, Threads, Mastodon, dan website; validasi URL https/http sesuai kebutuhan, tolak javascript/data URL.
- **OAuth:** bedakan “tautan profil” dari “akun terhubung”. Klaim akun terhubung hanya setelah OAuth berhasil, state/PKCE diverifikasi, dan scopes dicatat.
- **Privasi:** nama publik terpisah dari identitas penagihan; email login tidak menjadi email publik tanpa pilihan eksplisit.
- **Penyimpanan:** simpan ke backend setelah validasi; tampilkan kesalahan sebenarnya; uji muat ulang dan masuk kembali.

## Domain dan DNS

- **Default hemat:** pengguna mempertahankan DNS di registrar mana pun, lalu memasang CNAME ke target Ngeblogging yang benar-benar telah disiapkan.
- **Mesin status:** draft → ownership_pending → dns_pending → tls_pending → routing_pending → active; failed menyimpan alasan dan waktu pemeriksaan.
- **Verifikasi:** token TXT unik yang terikat situs dan akun; jangan hanya menganggap A/CNAME menuju IP Cloudflare sebagai bukti kepemilikan.
- **Pemeriksaan:** authoritative DNS dan resolver pembanding, CNAME chain/loop, DNSSEC, CAA bila relevan, sertifikat hostname, HTTPS, serta isi tenant yang tepat.
- **Probing aman:** cegah SSRF ke loopback/private/link-local/metadata, validasi setiap redirect, batasi waktu dan ukuran respons. Jangan mengirim credential akun ke hostname pengguna.
- **Apex/www:** jelaskan CNAME flattening/ALIAS sesuai DNS provider; jangan mengarang IP bersama. Pastikan redirect kanonis mempertahankan path/query dan tidak berulang.
- **Pemutusan:** lepaskan hostname dan invalidasi cache; jangan menghapus record DNS unrelated atau domain milik akun lain.
- **UI:** panduan record yang dapat disalin, status per langkah, waktu cek terakhir, kesalahan yang dapat ditindaklanjuti. Tampilkan “Live” hanya setelah routing dan konten terverifikasi.

`ns1.ngeblogging.com`/`ns2.ngeblogging.com` tidak cukup dibuat sebagai record biasa agar menjadi layanan DNS. Custom nameserver Cloudflare memerlukan paket yang mendukungnya; zone custom nameservers tersedia pada Business/Enterprise, jadi jangan membeli paket ini sebelum biaya disetujui ([Cloudflare custom nameservers](https://developers.cloudflare.com/dns/nameservers/custom-nameservers/)).

## Midtrans dan sistem berbayar

- **Sandbox dahulu:** lingkungan sandbox tidak menghasilkan uang; banner dan invoice harus menyebut mode uji.
- **Harga:** katalog SKU dan harga IDR ada di server; jangan percaya jumlah/harga/paket yang dikirim browser.
- **Checkout:** autentikasi pengguna, idempotency key, order unik, batas frekuensi, snapshot harga serta pajak bila berlaku, redirect hanya ke host pembayaran tepercaya.
- **Webhook:** verifikasi autentisitas dengan aturan resmi provider; cocokkan order, jumlah, mata uang, lingkungan, dan status. Jangan mengaktifkan Pro hanya dari callback sukses di browser.
- **Idempotensi:** retry dan webhook duplikat tidak menggandakan saldo/masa aktif; tangani event terlambat, refund, chargeback, gagal, batal, serta kedaluwarsa.
- **Entitlement:** aktivasi atomik setelah verifikasi server; audit perubahan; penurunan paket tidak langsung menghapus data.
- **Rekening:** ditambahkan oleh pemilik di portal merchant, bukan di frontend publik atau repositori.
- **Aktivasi:** syarat layanan, kebijakan privasi, refund, kontak dukungan, merchant terverifikasi, dan satu transaksi nyata terotorisasi sebagai uji akhir.

Dana tidak otomatis langsung masuk rekening hanya karena kode checkout dibuat; Midtrans menyediakan saldo settlement dan penarikan manual/terjadwal ke rekening yang diverifikasi ([Midtrans balance and withdrawals](https://docs.midtrans.com/docs/balance-page-manage-withdraw-your-funds)). Pencairan pertama juga memerlukan dokumen registrasi lengkap dan transaksi sukses sesuai ketentuan penyedia ([Midtrans pencairan](https://docs.midtrans.com/docs/kapan-saya-menerima-dana-transaksi-dari-midtrans)).

## Google AdSense

- **Pengaturan per situs:** publisher ID, status pengajuan, pilihan verifikasi, dan toggle Auto ads. Simpan ID tervalidasi; jangan menerima script arbitrer sebagai “kode AdSense”.
- **Validasi:** `ca-pub-` diikuti 16 digit untuk script/meta; `pub-` diikuti 16 digit pada ads.txt.
- **Output:** meta tag/script resmi di halaman publik yang sesuai, `/ads.txt` per hostname, dan tidak ada iklan di login/admin.
- **Tenant:** jangan mencampurkan publisher ID pemilik platform dengan publisher ID pengguna tanpa perjanjian yang eksplisit.
- **Persetujuan/privasi:** pengaturan consent dan kebijakan yang sesuai wilayah pengguna; jangan mengaktifkan iklan personalisasi tanpa landasan yang diperlukan.
- **Pengujian:** periksa halaman sumber, ads.txt, cache domain custom, dan status Google sebenarnya. Jangan tampilkan “disetujui” dari sekadar keberadaan ID.

Google harus menyetujui situs sebelum iklan dapat tampil; pemasangan kode atau ads.txt tidak menjamin persetujuan maupun penghasilan ([Google: connect your site](https://support.google.com/adsense/answer/7584263?hl=en)).

## Email bermerek Ngeblogging

- **Pengirim target:** alamat domain terverifikasi seperti `notifikasi@ngeblogging.com`, bukan alamat fiktif yang belum dikonfigurasi.
- **Autentikasi:** SPF, DKIM, DMARC, penanganan bounce/complaint, pembatasan laju, retry dan idempotensi.
- **Template:** logo A PNG untuk kompatibilitas email, judul, pesan, tombol yang menuju domain resmi, footer teks Ngeblogging.com, dan versi plain-text.
- **Jenis:** verifikasi, reset sandi, login baru, MFA, undangan, notifikasi komentar, pembayaran, perubahan domain, serta peringatan kuota.
- **Privasi:** tanpa sandi, API key, atau informasi sensitif di judul/log; email pemasaran dipisahkan dari email keamanan.
- **Uji akhir:** bukti email terkirim dan diterima, header autentikasi lulus, tautan bekerja dan hanya sekali pakai untuk reset/verify. Logo tidak dijamin tampil pada semua klien yang memblokir gambar; nama pengirim dan footer teks wajib tetap ada.

## Nara dan chat.ngeblogging.com

- **Milik aplikasi:** bangun antarmuka chat, orkestrasi, prompt, memori terisolasi, alat, ekspor, dan evaluasi dalam repositori.
- **Model:** jangan mengklaim model dilatih sendiri bila memakai model pihak ketiga/Workers AI. Pelatihan model dasar merupakan proyek terpisah dengan data berlisensi dan biaya komputasi.
- **Kuota:** batas token dan biaya per akun/hari/bulan, batas konkuren, reservasi penggunaan sebelum streaming, serta pengembalian reservasi bila gagal.
- **Aksi:** AI tidak boleh menerbitkan, menghapus, menagih, atau mengubah domain tanpa pemeriksaan otorisasi dan persetujuan yang relevan.
- **Keamanan:** dokumen/hasil web diperlakukan sebagai data tak tepercaya; cegah prompt injection ke alat, SSRF, dan kebocoran lintas tenant.
- **Gratis:** AI gratis memakai batas terukur, bukan akses tanpa batas. Pro/Max mendapat kapasitas tambahan yang tertutup oleh harga dan margin.

## Migrasi tanpa kehilangan akun

1. Inventarisasi semua tabel, RLS, triggers, function, storage bucket, akun, OAuth, email, webhook, domain, dan ketergantungan runtime Supabase.
2. Ekspor cadangan terenkripsi, catat jumlah/checksum, lalu uji restore di lingkungan terpisah.
3. Buat D1/R2 staging dan aplikasi autentikasi staging. Jangan memakai routing produksi pada tahap ini.
4. Implementasikan repository layer agar provider data dapat dipilih per tenant. Migrasi identitas memakai pemetaan ID; jangan meminta sandi lama lewat chat.
5. Migrasikan skema/data secara idempotent dan bercheckpoint. Catat kegagalan, jangan melewati diam-diam.
6. Tentukan kompatibilitas hash sandi dengan pustaka baru; bila tidak kompatibel, gunakan prosedur reset/reauth terverifikasi, bukan migrasi sandi plaintext.
7. Jalankan shadow-read dan rekonsiliasi. Jangan gunakan dual-write tanpa outbox dan mekanisme pemulihan yang jelas.
8. Pilot hanya situs pemilik; uji login, CRUD, upload, domain, editor, reset sandi, dan backup restore.
9. Alihkan tenant bertahap dengan batas rollback; bila terdapat tulisan baru di D1, rollback harus merekonsiliasi tulisan tersebut.
10. Hentikan dependensi Supabase hanya setelah tidak ada request aktif yang masih memerlukannya dan periode pemulihan disetujui pemilik.

## Gerbang penerimaan

- **Fungsi:** Ringkasan, Posts, Pages, Tema, Media, Analitik, Anggota, Komentar, Domain, API Keys, Profil, Keamanan, Pengaturan, dan Pembayaran diuji end-to-end.
- **Perangkat:** 360/390/412px, 768/820/1024px, 1440px; perubahan ukuran pada sesi yang sama; keyboard dan Android touch.
- **Konten:** HTML 12.000 baris, wrap on/off, find/jump, scroll sinkron, save/reopen, rollback versi. Jangan otomatis mengubah whitespace bermakna pada kode buatan pengguna.
- **Isolasi:** akun A tidak bisa membaca, mengubah, atau mengunduh objek akun B, termasuk melalui URL langsung.
- **Pembayaran:** forged/replayed/out-of-order webhook ditolak atau ditangani idempotent; tidak ada uang/entitlement fiktif.
- **Domain:** kepemilikan salah, DNS salah, sertifikat belum siap, dan situs salah tidak boleh diberi label Live.
- **Kegagalan:** provider tidak tersedia, kuota penuh, jaringan putus, sesi kedaluwarsa, upload gagal, dan email gagal memiliki status jujur.
- **Keamanan:** dependency scan, pemeriksaan secret, review otorisasi/CSRF/XSS/SSRF, restore drill, serta pengujian beban dengan batas biaya.
- **Klaim:** laporkan jumlah uji dan kegagalan aktual. Jangan menyebut seluruh sistem lulus bila hanya build frontend berhasil.

## Perintah induk untuk pelaksana berikutnya

> Kerjakan repositori Ngeblogging.com secara bertahap dengan dokumen ini sebagai kontrak. Mulai dengan membaca kode dan status Git terbaru, lalu buat branch untuk migrasi Cloudflare; jangan reset perubahan orang lain. Pertahankan UI editor Post/Page mobile dan layout desktop di luar perubahan yang diminta.
>
> Jangan mengganti produksi Supabase hanya dengan menghapus nama atau URL-nya. Inventarisasi dependensi dan siapkan backup yang terbukti dapat di-restore. Bangun D1/R2, autentikasi first-party, isolasi tenant, profil, keamanan akun, email bermerek, custom domain, paket/kuota, Midtrans, dan AdSense dengan gate pengujian per bagian.
>
> Kuota target: 12 situs serta 5.000 artikel per akun gratis, dengan batas byte/media/AI terpisah yang harus disetujui. Admin database hanya satu identitas pemilik melalui Access + verifikasi server. Token Cloudflare/Midtrans/email hanya dari secret manager, tidak dari frontend atau Git.
>
> Produksi pembayaran dimatikan sampai merchant/rekening/harga diverifikasi. Custom domain belum Live sampai DNS, TLS, routing dan konten sesuai. AdSense belum disetujui sampai Google menyatakan demikian. AI tidak dilabeli model buatan sendiri jika menggunakan model eksternal.
>
> Setiap tahap harus memiliki migration, tests, catatan perubahan, perintah rollback, dan bukti UI/API. Jalankan pengujian lokal dan staging dahulu; laporkan blocker dengan tepat. Minta persetujuan sebelum biaya baru, migrasi destruktif, atau cutover autentikasi. Akhiri dengan daftar yang benar-benar tayang, yang baru siap di repo, serta yang belum dibuat.
