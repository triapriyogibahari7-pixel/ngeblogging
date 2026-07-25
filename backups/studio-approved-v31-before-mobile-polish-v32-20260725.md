# Cadangan terkunci sebelum Studio mobile polish v32

Cadangan ini dibuat sebelum perbaikan isi halaman mobile, Theme Studio mobile, dan toolbar Nara v32.

## Sumber yang disetujui

- Commit produksi sebelum v32: `0070102b81bc1d12bef4c339b877cfa99755e4ed`
- Sidebar authority: `src/studio-shell-v30.css`
  - blob: `8066773230249c2f97a6dfcbf1f792113d830616`
- Sidebar runtime: `src/studio-shell-v30.js`
  - blob: `54aa0c66c297b477cb716ba254fc616b1e438d01`
- Studio desktop/base CSS: `src/studio-next.css`
  - blob: `15988dfbc961d99a33239cccfe7a997fc0ca8220`
- Isi mobile v31: `src/studio-mobile-content-v31.css`
  - blob: `faffc45db1bcdbdb600d4fb212a0b5a68b40c21c`
- Cadangan CSS sidebar nyata: `backups/studio-sidebar-v30-locked-20260725.css`

## Kontrak yang tidak boleh diubah oleh v32

- Drawer mobile tetap menempel ke kiri tanpa ruang kosong.
- Tombol `n.` tertutup tetap berada di kiri atas.
- Header drawer tetap berisi logo, tulisan Ngeblogging, dan tombol X.
- Sidebar desktop/laptop tetap 220 px saat terbuka dan 70 px saat tertutup.
- Tata letak desktop, laptop, komputer, Windows/macOS/Linux, dan mode Situs Desktop tetap seperti produksi v31.
- Landing page dan renderer situs publik tenant tidak ditargetkan.

## Ruang lingkup v32

1. Mengembalikan posisi scroll ke atas saat menu Studio mobile diganti agar judul tidak tertutup header.
2. Menata Theme Studio dan modal customizer menjadi satu kolom pada perangkat ringkas.
3. Membuat delapan kontrol toolbar Nara selalu terlihat, termasuk tombol kirim.
4. Memastikan menu lampiran/plugin hanya tampil setelah tombolnya ditekan.

Berkas ini dan seluruh berkas di direktori `backups/` tidak dimuat oleh `index.html`.
