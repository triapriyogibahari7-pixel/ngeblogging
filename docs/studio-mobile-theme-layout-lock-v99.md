# Studio mobile/theme/layout contract v99

Backup sebelum perubahan: `backup/theme-mobile-layout-pre-v96-20260728`.

Kontrak yang tidak boleh dilanggar:

- Baris **Komentar** pada drawer mobile memakai geometri, ukuran ikon, dan tipografi menu workspace asli.
- Ikon Komentar berukuran 25px, teks 17px, tinggi baris minimal 58px.
- **Salin kode** dan **Lihat pratinjau** berada di baris status editor, bukan footer yang dapat keluar dari viewport.
- Preview tidak menyimpan atau menerbitkan draf; pengguna dapat kembali ke kode.
- Editor Tema dan Tata Letak menghormati lebar sidebar desktop yang sebenarnya.
- Pada ponsel, kedua panel memiliki margin aman, sudut membulat, tinggi sekitar 82dvh, serta isi yang dapat digulir.
- Kanvas Tata Letak mobile tidak boleh kembali memakai lebar minimum 640px atau menutupi seluruh viewport.
- PWA harus memuat authority v99 setelah authority v97/v98 lama.
