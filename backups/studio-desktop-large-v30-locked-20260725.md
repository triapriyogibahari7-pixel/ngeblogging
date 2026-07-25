# Studio perangkat besar v30 — cadangan terkunci

Disetujui pada 25 Juli 2026 untuk desktop, laptop, komputer, Windows/macOS/Linux, tablet landscape besar, dan mode Situs Desktop.

- Sidebar terbuka 220 px, tertutup 70 px.
- Konten utama mengimbangi lebar sidebar.
- Header workspace, kartu dashboard, Posts/Pages, editor, tema, dan Nara desktop tidak boleh diubah oleh patch mobile v31.
- Sumber produksi: `src/studio-shell-v30.css`, `src/studio-shell-v30.js`, `src/studio-next.css`.
- Cadangan sidebar rinci: `backups/studio-sidebar-v30-locked-20260725.css`.

Berkas cadangan tidak dimuat oleh `index.html`. Pemulihan dilakukan dengan membandingkan authority aktif terhadap kontrak ini, bukan memuat dua CSS sekaligus.
