# Backup dan kontrak menu sidebar v123

Dokumen ini adalah jalur pemulihan apabila tampilan sidebar berubah akibat stylesheet lama, cache PWA, atau penambahan menu baru.

## Sumber kebenaran

- `src/sidebar-menu-contract-v123.js` — urutan dan geometri menu.
- `src/sidebar-lock-v123.css` — authority visual terakhir.
- `src/sidebar-lock-v123.js` — mengunci kembali inline style yang ditulis runtime lama.
- `src/sidebar-account-collapsed-icons-v119.css` — fallback ikon Pengaturan dan Keluar ketika sidebar ditutup.

## Struktur tombol yang wajib

```html
<button type="button">
  <svg><!-- ikon --></svg>
  <span>Nama menu</span>
</button>
```

Menu dinamis seperti Komentar boleh dipasang melalui portal, tetapi tombol akhirnya tetap harus mempunyai `svg` dan `span` langsung sebagai anak tombol.

## Cara menambah menu baru

1. Tambahkan definisinya ke `SIDEBAR_NAVIGATION_V123`.
2. Tambahkan tombol React di dalam `.sn-side > nav` menggunakan struktur standar di atas.
3. Jangan memberikan `position:absolute`, `margin-left`, `right`, `bottom`, atau ukuran khusus pada tombol tersebut.
4. Untuk desktop terbuka, authority memakai grid `24px + 112px`.
5. Untuk desktop tertutup, semua tombol memakai ukuran `48 × 44px` dan dipusatkan.
6. Jalankan pemeriksaan pada sidebar terbuka, sidebar tertutup, mode mobile, dan fitur “Situs desktop” pada browser Android.

## Urutan menu cadangan

1. Ringkasan
2. Posts
3. Pages
4. Tema
5. Media
6. Analitik
7. Anggota
8. Komentar
9. Domain

Footer akun:

1. Pengaturan
2. Keluar

## Pemulihan cache

Naikkan `VERSION`, `CACHE_RELEASE`, dan `RECOVERY_VALUE` pada `public/sw.js`. Pastikan semua file authority baru juga masuk ke `APP_SHELL` agar perangkat tidak kembali memakai CSS/JS lama.
