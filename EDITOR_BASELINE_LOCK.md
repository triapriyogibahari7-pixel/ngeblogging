# Editor Post/Pages — baseline disetujui dan dibekukan

## Identitas pemulihan

- Penanda: `editor-stable-2026-10-23-5da6573`. Ini nama baseline dokumentasi, bukan Git tag atau branch baru.
- Repositori: `triapriyogibahari7-pixel/ngeblogging`.
- Commit kode yang disetujui: `5da6573ae7d0b11c769afca65c756dd3bdafa8cb`.
- Tanggal persetujuan pemilik: 23 Oktober 2026, Asia/Jakarta.
- Status: FROZEN_BY_OWNER_POLICY.
- Build, automated tests, deployment, dan tampilan live belum diverifikasi dalam pencatatan baseline ini.

Commit tersebut menunjuk snapshot seluruh kode repositori, termasuk versi editor dan dependensinya pada saat disetujui. Commit dokumentasi ini bukan baseline kode pengganti. Jangan mengganti SHA baseline dengan HEAD secara otomatis.

## Yang harus dipertahankan

Editor Post dan Pages dinyatakan sudah pas oleh pemilik. Pada mobile dengan viewport maksimal 760px, seluruh baris tab Konten / Sisipkan / Tata letak / Metadata / SEO / HTML disembunyikan dan kotak barisnya tidak mengambil ruang. Toolbar yang berada di bawahnya dipertahankan. Aturan mobile ini tidak diterapkan pada desktop.

Pemulihan UI tidak boleh mengosongkan lembar menulis, menghapus atau memigrasikan isi draf, mengubah database, atau mengubah konten publik. Baseline juga memuat perubahan terdahulu; jangan menjalankan pembersihan template tambahan ketika melakukan pemulihan.

## Aturan kunci

1. Jangan mengubah editor tanpa persetujuan eksplisit pemilik atas perubahan editor tersebut.
2. Upgrade fitur lain tidak memberikan izin mengubah editor. Periksa juga dampak tidak langsung melalui CSS global, runtime bridge, mode perangkat, dependensi, dan build.
3. Uji perubahan di branch kerja terpisah. Jangan gunakan penanda baseline untuk pekerjaan pengembangan.
4. Pertahankan SHA baseline lama. Versi stabil berikutnya memerlukan persetujuan pemilik dan penanda baru.
5. File AGENTS.md menyampaikan aturan ini kepada agen yang mengerjakan repositori.

## Pemulihan aman jika upgrade bermasalah

Pemulihan memerlukan persetujuan pemilik terlebih dahulu. Langkah berikut adalah panduan, bukan tindakan yang sudah dijalankan.

Untuk memeriksa snapshot tanpa mengubah branch aktif atau file kerja saat ini:

```sh
git fetch origin
git worktree add --detach ../ngeblogging-editor-baseline 5da6573ae7d0b11c769afca65c756dd3bdafa8cb
```

Untuk menyiapkan pemulihan editor saja, mulai dari main terbaru dalam working tree bersih, buat branch pemulihan, dan tinjau perbedaan terhadap baseline:

```sh
git switch -c restore/editor-approved-baseline
git diff --name-status 5da6573ae7d0b11c769afca65c756dd3bdafa8cb HEAD -- src tests package.json package-lock.json vite.config.js index.html
```

Identifikasi file penyebab regresi dan dependensi yang terkait. Setelah pemilik menyetujui daftar file, gunakan `git restore --source=5da6573ae7d0b11c769afca65c756dd3bdafa8cb -- <daftar-file-yang-disetujui>`. Sintaks dalam kurung sudut adalah placeholder, bukan perintah siap dijalankan. Jangan menyalin seluruh snapshot di atas upgrade lain tanpa meninjau dampaknya.

Tinjau diff, jalankan pemeriksaan yang tersedia, uji editor Post dan Pages pada mobile serta desktop, lalu ajukan hasilnya untuk persetujuan sebelum merge/deployment. Pastikan mengetik, format, media, preview, autosave, dan publikasi tidak mengalami regresi.

Jangan menggunakan `git reset --hard`, force-push main, atau pemulihan database untuk memperbaiki tampilan editor. Snapshot kode ini bukan cadangan database, media, rahasia, konfigurasi layanan, maupun deployment.

## Batas penguncian

Penanda dan aturan ini belum merupakan penguncian teknis. Tidak ada Git tag, branch snapshot, branch protection, ruleset, required status check, atau larangan force-push yang dibuat oleh commit ini. Pengaturan tersebut harus diterapkan tersendiri melalui akses administrasi GitHub yang sesuai. Jangan menyatakan repositori sudah terkunci secara teknis hanya karena dokumen ini ada.
