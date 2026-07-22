# Runbook produksi Ngeblogging

Dokumen ini dipakai setelah VPS aktif. Semua perintah dijalankan sebagai user `deploy`.

## Pemeriksaan cepat

```bash
/opt/ngeblogging/app/scripts/server-doctor.sh
cd /opt/ngeblogging/app
docker compose --env-file .deploy.env -f compose.production.yml ps
```

Status sehat berarti container `api` berstatus `healthy`, container `web` aktif, dan `https://DOMAIN/api/health` mengembalikan HTTP 200.

## Log

```bash
cd /opt/ngeblogging/app
docker compose --env-file .deploy.env -f compose.production.yml logs --since 30m api
docker compose --env-file .deploy.env -f compose.production.yml logs --since 30m web
```

Log memakai rotasi maksimum lima file 10 MB per container. API hanya mencatat metode, path, status, durasi, dan request ID; secret dan isi pesan tidak dicatat.

## Deployment normal

Push ke `main` menjalankan tes, membuat dua image GHCR, lalu men-deploy jika variable `PRODUCTION_DEPLOY_ENABLED=true`. VPS hanya menarik image; proses build tidak memakai RAM VPS.

Urutan health check:

1. Container API harus sehat.
2. API internal harus menjawab.
3. Domain HTTPS publik harus menjawab melalui Caddy.
4. Tag baru disimpan sebagai versi aktif.

Jika salah satu gagal, `scripts/deploy.sh` menghidupkan kembali tag sebelumnya.

## Rollback manual

Lihat tag yang pernah tersedia:

```bash
docker images 'ghcr.io/triapriyogibahari7-pixel/ngeblogging-*' --format '{{.Repository}}:{{.Tag}} {{.CreatedSince}}'
```

Edit hanya `IMAGE_TAG` pada `/opt/ngeblogging/app/.deploy.env`, lalu:

```bash
cd /opt/ngeblogging/app
docker compose --env-file .deploy.env -f compose.production.yml up -d --remove-orphans
```

Gunakan tag immutable `sha-<40 karakter commit>`, bukan `latest`, untuk rollback yang pasti.

## Insiden umum

### Domain atau HTTPS gagal

- Pastikan record `A` mengarah ke IPv4 VPS.
- Hapus `AAAA` jika VPS tidak punya IPv6.
- Pastikan firewall penyedia membuka TCP 80/443.
- Lihat log Caddy: `docker compose ... logs web`.
- Jangan memasang sertifikat manual; Caddy memperbaruinya otomatis.

### Situs hidup tetapi Nara gagal

```bash
curl https://ngeblogging.com/api/nara
docker compose --env-file .deploy.env -f compose.production.yml logs --since 15m api
```

- `ready: false`: periksa nama environment yang dilaporkan, tanpa menyalin nilai secret ke chat.
- `QWEN_AUTH_FAILED`: rotasi API key pada workspace dan region yang sama.
- `QWEN_RATE_LIMIT`: periksa kuota Alibaba Cloud.
- Error Supabase: periksa URL dan publishable key; jangan menggantinya dengan `service_role`.

### Login provider kembali ke URL salah

- Supabase Site URL harus `https://ngeblogging.com`.
- Redirect URL domain aktif harus berada di allowlist Supabase.
- Callback provider Google/GitHub/LinkedIn tetap URL Supabase `/auth/v1/callback`, bukan callback VPS.
- Frontend memilih origin aktif saat OAuth dimulai, sehingga staging harus diizinkan saat pengujian.

### Server kehabisan ruang

```bash
df -h
docker system df
docker image prune -f --filter 'until=168h'
```

Jangan menjalankan `docker system prune --volumes`; volume Caddy menyimpan state sertifikat.

## Backup dan pemulihan

- Data artikel, profil, kuota, dan autentikasi berada di Supabase; gunakan backup proyek Supabase sesuai paket.
- Simpan salinan terenkripsi `/opt/ngeblogging/shared/.env` di password manager/secret vault. Jangan masukkan ke GitHub.
- Volume Caddy tidak wajib dibackup karena sertifikat dapat diterbitkan ulang, tetapi dapat disalin saat maintenance jika diinginkan.
- Repository dan image GHCR menjadi sumber pemulihan aplikasi.

Pemulihan server baru: jalankan bootstrap, pulihkan `.env`, arahkan staging DNS, aktifkan workflow, uji, lalu pindahkan DNS utama.

## Rotasi secret

1. Buat key baru di penyedia.
2. Ubah `/opt/ngeblogging/shared/.env`.
3. Restart hanya API:

   ```bash
   cd /opt/ngeblogging/app
   docker compose --env-file .deploy.env -f compose.production.yml up -d --force-recreate api
   ```

4. Uji Nara/login.
5. Cabut key lama.

Mengubah publishable key frontend juga memerlukan pembaruan GitHub secret dan workflow build baru. Mengubah Qwen key hanya memerlukan recreate container API.

## Monitoring minimum

- Pantau `https://ngeblogging.com/api/health` setiap 5 menit dari layanan uptime eksternal.
- Buat peringatan VPS untuk RAM, disk, CPU, dan bandwidth.
- Periksa GitHub Actions setiap deployment.
- Periksa kuota Supabase dan Alibaba Cloud setidaknya mingguan.
- Jalankan `server-doctor.sh` setelah pembaruan Docker atau perubahan DNS.
