# Penanda khusus editor desktop Post dan Pages

## Identitas tetap

- Penanda dokumentasi: `editor-desktop-stable-2026-10-23-5da6573`.
- Repositori: `triapriyogibahari7-pixel/ngeblogging`.
- Commit kode acuan pemulihan: `5da6573ae7d0b11c769afca65c756dd3bdafa8cb`.
- Tanggal persetujuan pencatatan: 23 Oktober 2026, Asia/Jakarta.
- Status: disetujui pemilik, dibekukan melalui aturan proyek.

Penanda ini khusus desktop dan terpisah dari `editor-mobile-stable-2026-10-23-5da6573`. Keduanya menunjuk snapshot kode yang sama karena editor memakai komponen dan dependensi bersama. Commit dokumentasi berikutnya tidak mengganti commit kode acuan. Jangan mengubah SHA baseline menjadi HEAD secara otomatis.

## Cakupan desktop

Editor Post dan Pages pada mode situs desktop di browser, laptop, komputer, tablet besar, dan perangkat besar lainnya ketika menggunakan layout desktop editor. Aturan desktop yang memakai batas media query mulai 761px bergantung pada viewport CSS, bukan sekadar nama perangkat. Mode situs desktop pada handphone termasuk cakupan ini ketika browser memakai viewport/layout desktop. Penanda tidak menjamin semua perangkat telah diuji.

Pertahankan susunan desktop yang ada pada commit acuan: judul editor, baris tab, toolbar fungsi, lembar menulis, panel pengaturan, serta dialog media, HTML, dan preview. Jangan menerapkan penghilangan seluruh baris tab khusus mobile ke layout desktop. Semua perilaku yang sudah ada, termasuk aturan isi template bawaan, tetap mengikuti kode pada commit acuan; pencatatan ini tidak menjalankan atau menambah perubahan perilaku apa pun.

## Peta pemeriksaan

- `src/ContentEditor.jsx`: komponen bersama editor Post/Pages, toolbar, panel, dan dialog.
- `src/EditorDialogBoundary.jsx`: batas dialog editor.
- `src/content-editor.css` dan stylesheet desktop/responsif yang dimuat aplikasi: bagian dari tampilan desktop.
- `src/editor-empty-draft.mjs`: perilaku template bawaan desktop yang sudah ada pada baseline.
- Stylesheet global/mobile, runtime bridge, mode perangkat, dependensi, serta konfigurasi build pada commit acuan juga dapat memengaruhi editor. Daftar ini adalah peta awal, bukan daftar lengkap dependensi atau cadangan parsial yang berdiri sendiri. Snapshot lengkap kode tetap commit acuan.

## Aturan jangan ubah

Ikuti `AGENTS.md` dan `EDITOR_BASELINE_LOCK.md`. Jangan mengubah, mendesain ulang, merapikan ulang, atau mengganti editor desktop tanpa persetujuan khusus pemilik. Upgrade fitur lain bukan izin mengubah editor. Tinjau dampak tidak langsung pada desktop maupun mobile jika menyentuh kode bersama. Versi stabil baru memerlukan persetujuan pemilik dan penanda baru; pertahankan penanda lama.

## Pemulihan jika upgrade bermasalah

Gunakan panduan `EDITOR_BASELINE_LOCK.md`. Periksa snapshot dan diff di branch/worktree terpisah. Identifikasi file penyebab regresi desktop dan dependensinya, lalu minta persetujuan daftar file sebelum menulis pemulihan. Jangan menyalin seluruh snapshot ke main, melakukan reset paksa, atau membuang upgrade lain tanpa tinjauan.

Pemulihan UI bukan pemulihan database. Jangan menghapus atau mengosongkan draf, mengganti isi postingan, memulihkan database/media, atau menjalankan pembersihan template tambahan. Setelah pemulihan, periksa editor Post dan Pages pada desktop serta mobile agar keduanya tidak mengalami regresi. Periksa mengetik, format, media, HTML, preview, pengaturan, autosave, dan publikasi, lalu laporkan pemeriksaan yang benar-benar dijalankan.

## Batas pencatatan

Pencatatan ini hanya menambah dokumentasi dan manifest di repositori yang sama. Tidak mengubah kode editor, penanda mobile, isi draf, atau konfigurasi deployment. Penanda dokumentasi ini bukan Git tag, branch snapshot, branch protection, ruleset, atau penguncian teknis GitHub. Snapshot kode tidak mencadangkan database, media, rahasia, layanan eksternal, atau deployment. Build, tes otomatis, hasil pada semua perangkat, deployment, dan tampilan live belum diverifikasi oleh pencatatan ini.
