# Login Production v157 Checklist

- `/release-v157.json` menunjukkan `2026.07.30-system-shell-v157`.
- Root, `/login`, dan `/signup` tidak mengandung `WHITE-R4-2026.07.12`.
- Meta `ngeblogging-system-shell` dan `ngeblogging-auth-shell` tersedia.
- Google membuka OAuth Google.
- LinkedIn membuka LinkedIn OIDC.
- Email/password mencapai auth gateway dan membentuk sesi valid.
- Callback PKCE menukar `code` sebelum query dibersihkan.
- Refresh mempertahankan sesi.
- Logout hanya terjadi setelah tombol Keluar ditekan.
- Sidebar, enam keluarga mode, Posts, Pages, Tema, Media, Analitik, Komentar, Domain, API Keys, dan Nara tetap tersedia.
