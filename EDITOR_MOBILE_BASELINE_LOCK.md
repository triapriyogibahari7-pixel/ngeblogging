# Penanda khusus editor mobile Post dan Pages

- Penanda dokumentasi: `editor-mobile-stable-2026-10-23-5da6573`.
- Repositori: `triapriyogibahari7-pixel/ngeblogging`.
- Commit kode acuan: `5da6573ae7d0b11c769afca65c756dd3bdafa8cb`.
- Tanggal: 23 Oktober 2026, Asia/Jakarta.
- Status: disetujui pemilik, dibekukan melalui aturan proyek.

## Cakupan

Editor Post dan Pages pada mode mobile: handphone, smartphone, browser sebelum mengaktifkan situs desktop, serta aplikasi yang menggunakan tampilan web editor mobile ini. Aturan penghilangan baris tab berlaku pada viewport maksimal 760px; nama perangkat saja tidak menentukan viewport.

Baseline mobile menggunakan commit kode yang sama dengan baseline editor umum, tetapi diberi penanda tersendiri agar mudah ditemukan untuk pemulihan masalah mobile. Penanda ini bukan repositori terpisah, Git tag, atau branch snapshot. Seluruh kode baseline tersedia dalam commit acuan; dokumen ini tidak menyalin hanya sebagian CSS dan menyatakannya sebagai cadangan lengkap.

## Tampilan yang dipertahankan

- Seluruh baris kotak/tab Konten / Sisipkan / Tata letak / Metadata / SEO / HTML disembunyikan, bukan disembunyikan satu per satu.
- Baris tab tidak mengambil ruang sehingga toolbar di bawahnya dapat naik.
- Tombol toolbar di bawah baris tersebut dan lembar menulis dipertahankan.
- Aturan penghilangan tab ini tidak diterapkan pada viewport desktop.

## Titik masuk kode untuk pemeriksaan

- `src/ContentEditor.jsx`: komponen bersama editor Post/Pages dan pemuatan stylesheet editor mobile.
- `src/studio-mobile-editor-v376.css`: memuat aturan penghilangan seluruh baris tab mobile.
- Stylesheet mobile lain, stylesheet bersama, runtime bridge, mode perangkat, dan dependensi pada commit acuan juga dapat memengaruhi hasil. Dua file di atas adalah titik masuk pemeriksaan, bukan daftar lengkap semua dependensi editor.

## Aturan perubahan dan pemulihan

Ikuti `AGENTS.md` dan `EDITOR_BASELINE_LOCK.md`. Jangan mengubah editor mobile hanya karena ada upgrade fitur lain. Perubahan editor memerlukan persetujuan khusus pemilik. Jangan mengganti commit acuan ini secara otomatis.

Jika upgrade menyebabkan regresi mobile, bandingkan kode dengan commit acuan di branch kerja terpisah. Usulkan pemulihan hanya file penyebab masalah dan dependensinya setelah meninjau dampak desktop. Minta persetujuan atas daftar file sebelum menulis pemulihan. Jangan menimpa seluruh main atau membuang upgrade lain.

Pemulihan kode UI tidak boleh menghapus atau mengosongkan draf, mengganti isi postingan, memulihkan database, atau menjalankan pembersihan template tambahan. Setelah pemulihan, periksa Post dan Pages pada mobile dan desktop, termasuk mengetik, format, media, preview, autosave, dan publikasi.

## Batas penandaan

Penandaan ini hanya menambah dokumentasi dan manifest. Tidak ada kode editor, data draf, atau deployment yang diubah oleh pencatatan ini. Ini bukan penguncian teknis GitHub; tidak membuat Git tag, branch snapshot, ruleset, maupun branch protection. Snapshot kode bukan cadangan database atau media. Persetujuan tampilan berasal dari pemilik; build, tes otomatis, deployment, dan verifikasi live belum dibuktikan oleh pencatatan ini.
