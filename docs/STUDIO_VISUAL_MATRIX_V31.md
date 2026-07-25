# Uji tampilan Studio & Nara v31

Patch v31 tidak mengubah sidebar yang telah disetujui atau tampilan desktop/laptop. Fokusnya adalah isi halaman Studio pada perangkat ringkas dan kepadatan isi widget Nara.

## Matriks perangkat

| Profil | Lebar uji | Sidebar | Isi halaman | Nara awal |
|---|---:|---|---|---|
| Android kecil | 320 px | Drawer v30 | Satu kolom, tanpa overflow | Mini rapat |
| Android umum | 360/390/412 px | Drawer v30 | Satu kolom, kartu | Mini rapat |
| iPhone | 375/390/430 px | Drawer v30 | Safe-area bawah | Mini rapat |
| PWA/aplikasi | 360–430 px | Drawer v30 | Safe-area + 100svh | Mini rapat |
| Tablet portrait | 768–834 px | Drawer tablet v30 | Grid adaptif | Mini/kotak |
| Tablet landscape | 1024 px | Layout besar terkunci | Tidak diubah | Kotak |
| Laptop | 1366 px | 220/70 px terkunci | Tidak diubah | Kotak |
| Desktop | 1920 px | 220/70 px terkunci | Tidak diubah | Kotak |
| Situs Desktop di HP | Profil desktop-phone v30 | Terkunci | Tidak diubah | Kotak |

## Halaman yang diperiksa

1. Ringkasan: judul, tiga tombol, 2×2 metrik, konten terbaru.
2. Posts dan Pages: judul/action bertumpuk, kolom pencarian penuh, baris menjadi kartu dua baris.
3. Tema dan Tata Letak: kontainer tidak lebih lebar dari viewport.
4. Media: pustaka berada dalam lebar konten.
5. Nara AI Workspace: header satu kolom, tab horizontal, projects/plugins satu kolom.
6. Analitik: kartu satu kolom.
7. Anggota: identitas, peran, dan tombol tidak bertabrakan.
8. Domain: hostname dapat membungkus tanpa keluar layar.
9. Pengaturan: seluruh form satu kolom.
10. Editor: authority editor sebelumnya tetap berlaku.

## Kontrak widget Nara mini

- Lebar maksimum 300 px pada perangkat ringkas.
- Tinggi menggunakan `100svh` dan safe area agar tombol Android/iPhone tidak mendorong header.
- Header satu baris: logo, nama, reset, mini/kotak, fullscreen, X.
- Teks jawaban 13 px dan membungkus.
- Prompt cepat bergulir horizontal.
- Composer tidak memaksa toolbar membungkus; toolbar bergulir horizontal.
- Kamera, foto, file, plugin, mikrofon, speaker, kecerdasan, model, mode, dan kirim tetap ada.
- Mode layar penuh tidak diubah.

## Cadangan terkunci

- `backups/studio-sidebar-v30-locked-20260725.css`
- `backups/studio-sidebar-v30-locked-20260725.md`
- `backups/studio-desktop-large-v30-locked-20260725.md`

Berkas cadangan tidak dimuat pada produksi.
