#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RELEASE="${1:-v111-$(date -u +%Y%m%d-%H%M%S)}"
SAFE_RELEASE="$(printf '%s' "$RELEASE" | tr -cd 'A-Za-z0-9._-')"
OUT_DIR="$ROOT_DIR/recovery"
STAGE_DIR="$(mktemp -d)"
PROJECT_DIR="$STAGE_DIR/ngeblogging-$SAFE_RELEASE"
ARCHIVE="$OUT_DIR/Ngeblogging-Recovery-$SAFE_RELEASE.zip"

cleanup() {
  rm -rf "$STAGE_DIR"
}
trap cleanup EXIT

mkdir -p "$OUT_DIR" "$PROJECT_DIR"
rm -f "$ARCHIVE" "$ARCHIVE.sha256"

# Export every tracked source file at the exact commit. This excludes .git,
# node_modules, dist, Wrangler state, local caches, and untracked credentials.
git archive --format=tar HEAD | tar -xf - -C "$PROJECT_DIR"

# Defense in depth: never package local/production secret files. Public examples remain.
find "$PROJECT_DIR" -type f \( \
  -name '.env' -o \
  -name '.env.local' -o \
  -name '.env.production' -o \
  -name '.dev.vars' -o \
  -name '*.pem' -o \
  -name '*.key' -o \
  -name 'service-account*.json' \
\) -delete
rm -rf "$PROJECT_DIR/.wrangler" "$PROJECT_DIR/node_modules" "$PROJECT_DIR/dist" "$PROJECT_DIR/coverage"

COMMIT_SHA="$(git rev-parse HEAD)"
COMMIT_TIME="$(git show -s --format=%cI HEAD)"

cat > "$PROJECT_DIR/RECOVERY-README.md" <<EOF
# Ngeblogging Recovery Bundle $SAFE_RELEASE

Paket ini dibuat otomatis dari commit GitHub **$COMMIT_SHA** pada **$COMMIT_TIME**.

## Isi paket

- seluruh source code frontend, Cloudflare Worker, API, Nara, autentikasi, domain, komentar, tema, tata letak, dan PWA;
- konfigurasi build/deploy yang tersimpan di repositori;
- migration dan SQL Supabase yang tersimpan di repositori;
- pengujian regresi, dokumentasi, aset publik, serta authority responsif mobile dan desktop;
- perbaikan flow integrity v111 untuk Komentar dan Domain;
- manifest SHA-256 untuk memeriksa integritas setiap file.

## Mode yang dicakup

- aplikasi/PWA Android dan iOS;
- mobile/handphone/perangkat kecil;
- tablet dan mode situs desktop pada handphone;
- desktop, laptop, komputer, dan layar besar.

## Pemulihan source code

1. Ekstrak ZIP ke folder kosong.
2. Pasang Node.js sesuai versi pada package.json.
3. Jalankan `npm ci`.
4. Salin file contoh environment yang tersedia, lalu isi sendiri URL/key publik dan secret melalui dashboard penyedia. Secret produksi tidak dimasukkan ke ZIP.
5. Jalankan `npm test` lalu `npm run build`.
6. Deploy Cloudflare dengan workflow GitHub Actions atau `npm run deploy:cloudflare` setelah binding dan secret tersedia.
7. Terapkan migration Supabase yang belum aktif dengan CLI Supabase atau SQL Editor, setelah database dicadangkan.

## Data pengguna dan media

ZIP ini adalah backup source/deployment lengkap, tetapi **tidak berisi isi database pengguna, password, token OAuth, secret Cloudflare, atau file Storage Supabase**. Untuk disaster recovery penuh, simpan juga secara terpisah:

- dump database Supabase/PostgreSQL;
- export bucket Storage;
- daftar environment variables dan secrets di tempat rahasia;
- konfigurasi OAuth redirect/provider;
- konfigurasi DNS/zone Cloudflare.

Jangan pernah mengunggah service-role key, refresh token, password, atau API token ke repositori maupun ZIP publik.

## Verifikasi paket

Dari folder hasil ekstrak, jalankan:

`sha256sum -c MANIFEST.sha256`

Semua baris harus menghasilkan `OK`.
EOF

cat > "$PROJECT_DIR/RECOVERY-VERSION.txt" <<EOF
release=$SAFE_RELEASE
commit=$COMMIT_SHA
commit_time=$COMMIT_TIME
created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
responsive_authority=studio-flow-integrity-v111-20260728
pwa_cache=ngeblogging-app-v111-20260728
EOF

(
  cd "$PROJECT_DIR"
  find . -type f ! -name MANIFEST.sha256 -print0 \
    | sort -z \
    | xargs -0 sha256sum > MANIFEST.sha256
)

(
  cd "$STAGE_DIR"
  zip -q -r -9 "$ARCHIVE" "$(basename "$PROJECT_DIR")"
)

(
  cd "$OUT_DIR"
  sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256"
)
printf 'Recovery bundle created: %s\n' "$ARCHIVE"
