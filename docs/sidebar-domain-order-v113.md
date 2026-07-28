# Sidebar Domain order v113

Release: `sidebar-domain-order-v113-20260729`

- Domain selalu menjadi item navigasi workspace.
- Domain diposisikan tepat setelah Komentar, dengan fallback setelah Anggota.
- Domain tidak pernah menjadi anak `.sn-account-footer`.
- Aturan legacy `last-child` yang memberi posisi absolut, jarak bawah, dan warna tombol akun dinetralisir sebelum render pertama.
- Kontrak berlaku pada mobile, PWA, Desktop-site Android, tablet, laptop, dan desktop.
- Cache PWA aktif: `ngeblogging-app-v113-20260729` / `pwa-v113`.
