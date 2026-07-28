# Sidebar layout lock v87

Release marker: `sidebar-two-layouts-v87-20260728`

## Backup produksi

Kondisi produksi sebelum perbaikan v87 disimpan pada branch:

- `backup/sidebar-all-modes-v86-20260728`
- commit sumber: `0ec8e0cf75de5b53e2adcff8118271d2e9a18d84`

Branch tersebut menjadi titik rollback untuk seluruh file sidebar sebelum v87.

## Kontrak terkunci A — desktop dan perangkat besar

1. `Pengaturan` dan `Keluar` adalah tombol React asli di `StudioNext.jsx`.
2. Keduanya tidak boleh memakai `position:absolute` atau `position:fixed`.
3. `Pengaturan` wajib berada setelah seluruh menu workspace dan tepat sebelum `Keluar`.
4. `Pengaturan` menjalankan `chooseView("settings")` dan membuka halaman `Profil & pengaturan`.
5. `Keluar` menjalankan callback autentikasi `onExit`.
6. Sidebar collapsed tetap menampilkan kedua ikon.

## Kontrak terkunci B — mobile, PWA, dan perangkat kecil

1. Semua menu utama tetap berada dalam aliran dokumen normal.
2. `Pengaturan` dan `Keluar` ditempatkan setelah `Anggota` dan `Domain`.
3. Tidak ada tombol footer yang boleh menutupi, menggeser, atau menghapus menu lain.
4. Tinggi minimum kedua tombol adalah 58 px dengan safe-area bawah.
5. Drawer tetap dapat digulir pada layar pendek.

## File otoritatif

- `src/StudioNext.jsx` — sumber tombol dan fungsi React.
- `src/StudioSecure.jsx` — pemberian identitas semantik tanpa menghapus node React.
- `src/sidebar-account-footer-v85.css` — stylesheet aktif yang telah diganti dengan kontrak layout v87.
- `public/sw.js` — rotasi cache PWA v87.
- `tests/domain-manager-v78.test.mjs`
- `tests/domain-manager-v80.test.mjs`

## Larangan regresi

Pengujian harus gagal bila footer aktif kembali memakai salah satu pola berikut:

- `position: absolute !important`
- nilai `bottom` untuk menumpuk tombol di atas menu
- `nth-last-child` untuk menebak identitas tombol
- penghapusan node navigasi React menggunakan `button.remove()`

Perubahan sidebar berikutnya wajib mempertahankan dua kontrak layout di atas atau memperbarui dokumen dan pengujian ini secara eksplisit.
