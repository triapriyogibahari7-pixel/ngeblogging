# Scaling Ngeblogging

Ngeblogging dirancang agar biaya awal rendah dan dapat ditingkatkan bertahap, bukan dengan janji penyimpanan atau trafik tanpa batas.

## Jalur pertumbuhan

- Fase awal: satu aplikasi React/Vite, Supabase Auth/Postgres/Storage, Netlify CDN, dan wildcard subdomain.
- Fase pertumbuhan: queue untuk pemrosesan gambar, CDN transformasi, cache halaman publik, observability, rate limiting, backup, dan pemisahan worker.
- Fase global: multi-region read path, pemisahan tenant besar, object storage berlapis, event streaming, search cluster, data warehouse, dan disaster recovery lintas region.

## Media

File asli disimpan di object storage. Database hanya menyimpan metadata dan referensi. Versi AVIF/WebP serta ukuran responsif dibuat asinkron, dilayani melalui CDN, dan dibersihkan memakai lifecycle policy.

## Keamanan dan keandalan

Semua tabel tenant memakai RLS, unggahan dibatasi tipe dan ukuran, nama objek memakai namespace site/user, tindakan publikasi berisiko memerlukan konfirmasi, dan sistem perlu abuse prevention serta kuota penggunaan wajar.
