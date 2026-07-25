# Locked backup: Sidebar v30 + Nara widget v33

Tanggal kunci: 2026-07-25

Baseline yang disetujui dan harus dipertahankan:

- commit utama: `83ec7420acee0441b48197cf88b49d453d5377b3`
- sidebar mobile/tablet/desktop v30 tetap flush-left, tombol `n.`, logo, pencarian, dan tombol X tidak diubah;
- widget Nara mini/compact/fullscreen v33 tetap seperti baseline yang disetujui;
- tombol kirim, tambah lampiran, mikrofon, speaker, kecerdasan, model, dan mode tetap tersedia;
- plugin/connectors tetap dihapus sesuai v33.

## Blob pemulihan immutable

| Berkas | Blob SHA |
|---|---|
| `src/studio-shell-v30.css` | `8066773230249c2f97a6dfcbf1f792113d830616` |
| `src/studio-shell-v30.js` | `54aa0c66c297b477cb716ba254fc616b1e438d01` |
| `src/NaraAssistant.jsx` | `b04476c19c1ae1d6403e2e97ab604e74c57c8063` |
| `src/nara-tools-v29.css` | `69c1b44243c47fd7b1a5e8b05fa27b52828edb98` |
| `src/nara-connectors-v29.js` | `96d41b9b5b413377df8634872fa2d3d7dc4e2f07` |
| `src/studio-mobile-content-v31.css` | `faffc45db1bcdbdb600d4fb212a0b5a68b40c21c` |
| `src/studio-mobile-polish-v32.css` | `8e34e15327382f3fc25f75d8e9ea8bb32ec7d6fe` |
| `src/studio-mobile-overlap-v33.css` | `c58291c29ab618dc3552800e6bdaa49899e9bcdd` |
| `index.html` sebelum v34 | `13217474372c6f86766550b126cdba179d6e0442` |
| `public/sw.js` sebelum v34 | `67b88c456d083dc8042d67f43d4b19752997f03d` |

## Pemulihan

Baseline penuh dapat dipulihkan dari Git dengan:

```bash
git checkout 83ec7420acee0441b48197cf88b49d453d5377b3 -- \
  src/studio-shell-v30.css \
  src/studio-shell-v30.js \
  src/NaraAssistant.jsx \
  src/nara-tools-v29.css \
  src/nara-connectors-v29.js \
  src/studio-mobile-content-v31.css \
  src/studio-mobile-polish-v32.css \
  src/studio-mobile-overlap-v33.css
```

Authority v34 hanya boleh menata alur konten halaman Studio. Authority v34 dilarang menargetkan selector `.sn-side`, `.sn-mobile-v30-*`, `.nara-*`, atau mengubah file baseline di atas.
