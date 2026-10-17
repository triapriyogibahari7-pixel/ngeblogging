# Ngeblogging: hasil fondasi Cloudflare

Tanggal pemeriksaan: 17 Oktober 2026. Ini laporan tahap fondasi, bukan pernyataan bahwa Ngeblogging sudah sepenuhnya lepas dari Supabase.

## Sudah dikerjakan dan diverifikasi

- Token Cloudflare pengganti diterima API sebagai valid dan active. Akses baca Workers, zone Ngeblogging, dan D1 berhasil.
- Database D1 baru `ngeblogging-platform-staging` dibuat, terpisah dari produksi.
- Migrasi `0001_platform` berhasil diterapkan. Read-back API menunjukkan 18 tabel aplikasi, 5 trigger, nol pengguna produksi, serta tidak ada pelanggaran foreign key.
- Struktur mencakup akun, profil, tautan sosial, situs, keanggotaan, konten, metadata media, domain, AdSense, API key, pembayaran, langganan, peristiwa keamanan, antrean notifikasi, dan checkpoint migrasi.
- Batas staging: 12 situs dan 5.000 artikel per akun, bukan per situs. Semua status artikel dihitung; perubahan page menjadi article juga diperiksa.
- Modul internal menyimpan profil, membaca konten dengan pemeriksaan akses situs, serta memvalidasi publisher ID AdSense tanpa mengklaim persetujuan Google.

## Hasil pengujian

Sepuluh pengujian baru dijalankan dengan SQLite lokal dan semuanya lulus. Ini mencakup pengulangan migrasi, situs ke-13, artikel ke-5.001, perpindahan tenant, akses akun lain, keanggotaan pembaca, putaran simpan/baca profil, URL berbahaya, AdSense, idempotency key pembayaran, dan rollback batch.

Suite lama tetap menghasilkan 81 lulus dan 10 gagal, dengan daftar kegagalan tidak berubah dari baseline. Suite lama menggunakan daftar berkas eksplisit; pengujian fondasi baru dijalankan terpisah melalui:

```sh
node --test tests/cloudflare-platform-foundation.test.mjs
```

Penerapan skema dan read-back juga diuji pada D1 Cloudflare yang sebenarnya. Pengujian ini tidak membuktikan autentikasi, pembayaran, email, atau antarmuka baru sudah berfungsi, karena integrasi tersebut belum dibuat/dinyalakan.

## Blokir R2

Cloudflare mengembalikan kode `10042`: `Please enable R2 through the Cloudflare Dashboard.` Ini berarti langganan R2 belum diaktifkan, bukan alasan untuk membuat ulang API token.

Cloudflare meminta aktivasi melalui **Storage & databases → R2 → Overview**, kemudian alur checkout; R2 memiliki jatah gratis dan penggunaan ditagih bulanan sesuai ketentuan ([Cloudflare R2 get started](https://developers.cloudflare.com/r2/get-started/)). Pemilik perlu memeriksa syarat pembayaran sebelum menyetujui aktivasi; saya belum mengaktifkan pembelian/langganan tersebut.

## Belum dikerjakan / belum diaktifkan

- Perpindahan akun dan data Supabase, login Cloudflare-native, reset sandi, MFA/passkey.
- Dashboard privat `database.ngeblogging.com` dan pembatasan identitas administrator pada aplikasi tersebut.
- R2 bucket/upload, batas media yang disetujui, serta cadangan objek.
- Profil lengkap yang terhubung ke antarmuka produksi; tautan sosial saat ini hanya modul data, bukan OAuth.
- Midtrans checkout/webhook produksi dan pencairan dana; merchant masih perlu didaftarkan dan diverifikasi.
- Pengiriman email domain Ngeblogging; belum ada SPF/DKIM/DMARC atau layanan pengirim baru yang diaktifkan.
- AdSense pada halaman publik dan verifikasi Google.
- Alur onboarding custom domain baru, nameserver bermerek, chat baru, model AI baru, atau tambahan 500 tema.

## Keselamatan perubahan

Tidak ada akun, artikel, domain, sandi, atau objek Supabase yang dihapus/dipindahkan. Tidak ada endpoint database publik yang dibuka dan konfigurasi Worker produksi tidak diganti oleh fondasi staging ini.

Database belum berisi data pengguna. Untuk tahap berikutnya, aktifkan R2 setelah memeriksa biaya, siapkan autentikasi staging dan konsol privat, kemudian jalankan backup/restore serta pilot akun pemilik sebelum cutover produksi.
