# Adaptive Desktop dan Nara v20

V20 menanggapi empat kegagalan yang tampak pada pemeriksaan produksi lewat telepon Android dengan opsi **Situs desktop**:

1. rail sidebar menampilkan ikon yang terpotong;
2. tombol buka/tutup menimpa header workspace;
3. editor masih terlihat seperti kanvas 980px mini dengan ruang kosong panjang;
4. Site Manager atau modal lain menjadi raksasa dan tombol tutup terpotong;
5. launcher Nara terlihat tetapi jalur klik React tidak selalu berhasil.

## Arsitektur skala

Browser desktop pada telepon mengekspos viewport sekitar 980 CSS px lalu mengecilkannya ke lebar fisik layar. V20 tidak lagi melakukan zoom pada `body`. Hanya `#root` yang memakai `--sn-browser-scale`, dengan lebar `--sn-physical-layout-width`. Launcher yang berada langsung pada `body` mempunyai skala sendiri. Dengan pemisahan ini, fixed overlay tidak menerima skala ganda.

## Sidebar

- satu rail kiri;
- satu tombol edge milik React;
- tombol edge berada di bawah header agar tidak menutup nama workspace;
- nav rail meniadakan scrollbar visual;
- ikon dipaksa `position: static`, tanpa clip, transform, atau pseudo-element;
- bottom navigation, sheet mobile, tombol tutup kedua, dan menu Nara di sidebar tetap dihapus;
- Tata Letak tetap membuka customizer Tema.

## Editor

Editor pada desktop-site phone memakai layout compact desktop:

- toolbar dan tabs dapat digeser horizontal;
- paper memenuhi lebar area kerja;
- tidak ada `min-height: 980px`;
- metadata, publikasi, jadwal, lokasi, taksonomi, template, SEO, dan schema tetap tersedia di bawah tulisan;
- preview, media, dan source overlay dibatasi ke viewport fisik.

## Modal

`sn-modal-layer`, `nw-modal-layer`, modal tema, dan modal editor memakai tinggi `--sn-physical-layout-height`. Site Manager menjadi kartu scrollable satu layar. Tombol tutup selalu 40×40 px dan tidak boleh membesar karena viewport desktop browser.

## Nara

Launcher v20 mencoba jalur berikut secara berurutan:

1. tombol Nara pada header Studio;
2. tombol Nara pada editor;
3. launcher React asli;
4. route Nara Workspace tersembunyi, lalu tombol **Buka Nara**.

Klik menggunakan native `HTMLElement.prototype.click`, diulang singkat selama React merender. Model, tingkat kecerdasan, kamera, foto, file teks, vision, mikrofon, Projects, Memory, Images, Plugins, generator gambar, QR, dan connector tetap berada di source.

## Checklist produksi

- mode mobile normal tidak terpengaruh;
- mode Situs desktop tidak menjadi screenshot mini;
- seluruh ikon rail terlihat utuh;
- tombol edge tidak menutupi workspace;
- tombol mata dan Nara tepat di tengah;
- launcher bawah membuka dialog Nara;
- Site Manager tidak terpotong;
- editor tidak mempunyai ruang kosong 980px;
- Tata Letak membuka customizer;
- tenant publik tidak 404;
- service worker memakai cache `ngeblogging-app-v14-20260724-v20`.
