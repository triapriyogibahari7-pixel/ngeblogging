# Advanced Studio rollout

Cabang ini menaikkan Studio menjadi ruang kerja multi-situs dengan subdomain gratis `*.ngeblogging.com`, profil dan biografi, katalog situs, pilihan tata letak, editor tipografi lengkap, media cloud, serta renderer situs publik berbasis hostname.

## DNS dan Netlify

1. Jadikan `ngeblogging.com` domain utama di Netlify.
2. Tambahkan wildcard DNS `*.ngeblogging.com` ke deployment yang sama.
3. Pastikan sertifikat TLS mencakup apex dan wildcard.
4. Biarkan SPA fallback pada `netlify.toml`; aplikasi membaca hostname dan merender tenant yang sesuai.

## Supabase

Jalankan migrasi `202607230001_advanced_studio_media.sql`. Migrasi menambah kolom presentasi situs, website profil, bucket media publik, batas unggahan 15 MB, dan kebijakan Storage berdasarkan anggota situs.

## Batas skala

Arsitektur tidak menyimpan gambar dalam database atau bundle. Objek disimpan di Supabase Storage dan metadata berada di Postgres. Untuk skala sangat besar, gunakan CDN, transformasi gambar asinkron, lifecycle storage, sharding proyek/region, observability, abuse prevention, dan batas penggunaan wajar. Tidak ada satu deployment gratis yang secara realistis dapat menjamin kapasitas tanpa batas bagi ratusan juta pengguna.
