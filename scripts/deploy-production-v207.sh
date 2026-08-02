#!/usr/bin/env bash
set -euo pipefail

RELEASE="studio-production-v207-20260802"
LEGACY_MARKER="WHITE-R4-2026.07.12"
WORKER_URL="${WORKERS_DEV_SMOKE_TEST_URL:-https://ngeblogging.triapriyogibahari7.workers.dev}"
TENANT_URL="${TENANT_SMOKE_TEST_URL:-https://tri-apriyogi-bahari.ngeblogging.com}"

say() { printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
require() { [[ -n "${!1:-}" ]] || fail "$1 belum tersedia di environment."; }

require CLOUDFLARE_ACCOUNT_ID
require CLOUDFLARE_ZONE_ID
require CLOUDFLARE_API_TOKEN
require VITE_SUPABASE_PUBLISHABLE_KEY
export CLOUDFLARE_ZONE_NAME="${CLOUDFLARE_ZONE_NAME:-ngeblogging.com}"
export CLOUDFLARE_WORKER_SERVICE="${CLOUDFLARE_WORKER_SERVICE:-ngeblogging}"
export VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-https://polvmlrhqoiflumibfqs.supabase.co}"
export VITE_PUBLIC_SITE_URL="${VITE_PUBLIC_SITE_URL:-https://ngeblogging.com}"
export RESOLVED_CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID"
export RESOLVED_CLOUDFLARE_ZONE_ID="$CLOUDFLARE_ZONE_ID"

[[ "$CLOUDFLARE_ACCOUNT_ID" =~ ^[a-fA-F0-9]{32}$ ]] || fail "CLOUDFLARE_ACCOUNT_ID harus 32 karakter hex."
[[ "$CLOUDFLARE_ZONE_ID" =~ ^[a-fA-F0-9]{32}$ ]] || fail "CLOUDFLARE_ZONE_ID harus 32 karakter hex."

say "Install dependency terkunci"
npm ci --ignore-scripts

say "Terapkan patch produksi dan jalankan regression v206/v207"
node scripts/patch-service-worker-v179.mjs
node --test tests/studio-production-v206.test.mjs tests/studio-production-v207.test.mjs

say "Build produksi lengkap"
npm run build

say "Bangun konfigurasi Wrangler berdasarkan zone aktif"
node scripts/build-active-zone-wrangler.mjs wrangler.production.jsonc wrangler.production.active-zone.jsonc
npx wrangler deploy --config wrangler.production.active-zone.jsonc --dry-run --outdir .wrangler-production-v207-manual >/dev/null

say "Deploy Worker + assets v207"
npx wrangler deploy --config wrangler.production.active-zone.jsonc --keep-vars

verify_release() {
  local base="$1"
  local file="$2"
  local stamp
  stamp="$(date +%s)-$RANDOM"
  local code
  code="$(curl -sS -L --connect-timeout 10 --max-time 25 -o "$file" -w '%{http_code}' -H 'cache-control: no-cache' "${base%/}/release-v207.json?manual_v207=${stamp}" || true)"
  [[ "$code" == "200" ]] || return 1
  ! grep -q "$LEGACY_MARKER" "$file" || return 1
  node - "$file" "$RELEASE" <<'NODE'
const fs = require('fs');
const [file, expected] = process.argv.slice(2);
const x = JSON.parse(fs.readFileSync(file, 'utf8'));
if (x.release !== expected
  || x.repairs?.physicalMobileLayoutMapReadableHorizontal !== true
  || x.repairs?.themePreviewSingleMountAfterCloudState !== true
  || x.repairs?.naraComposerTwoRowsOnHandheld !== true
  || x.repairs?.naraCameraPhotoFileOnlyInsidePlusMenu !== true
  || x.repairs?.mobileNLogoForcedWhiteOnBlue !== true
  || x.repairs?.sessionPersistencePreserved !== true) process.exit(1);
NODE
}

say "Verifikasi Worker baru sebelum route cutover"
for attempt in $(seq 1 18); do
  if verify_release "$WORKER_URL" /tmp/ngeblogging-v207-worker.json; then
    echo "Worker v207 terverifikasi."
    break
  fi
  [[ "$attempt" -lt 18 ]] || fail "Worker baru belum menyajikan release v207."
  sleep 4
done

say "Pertahankan compatibility routing lalu cut over apex/www/tenant"
node scripts/finalize-cloudflare-routes-v175.mjs
node scripts/finalize-cloudflare-route-cutover-v182.mjs

verify_shell() {
  local path="$1"
  local file="$2"
  local stamp
  stamp="$(date +%s)-$RANDOM"
  local code
  code="$(curl -sS -L --connect-timeout 10 --max-time 25 -o "$file" -w '%{http_code}' -H 'cache-control: no-cache' "https://ngeblogging.com${path}?manual_v207=${stamp}" || true)"
  [[ "$code" == "200" ]] || return 1
  ! grep -q "$LEGACY_MARKER" "$file" || return 1
  grep -q 'id="root"' "$file"
}

say "Verifikasi production apex, auth routes, Studio, Worker, dan tenant"
for attempt in $(seq 1 36); do
  ok=true
  verify_release "https://ngeblogging.com" /tmp/ngeblogging-v207-apex.json || ok=false
  verify_release "$WORKER_URL" /tmp/ngeblogging-v207-worker-live.json || ok=false
  for path in / /login /signup /studio; do
    safe="$(printf '%s' "$path" | tr '/.' '__')"
    verify_shell "$path" "/tmp/ngeblogging-v207-${safe}.html" || ok=false
  done
  tenant_code="$(curl -sS -L --connect-timeout 10 --max-time 25 -o /tmp/ngeblogging-v207-tenant.html -w '%{http_code}' -H 'cache-control: no-cache' "${TENANT_URL%/}/?manual_v207=$(date +%s)-$RANDOM" || true)"
  [[ "$tenant_code" == "200" ]] || ok=false
  if grep -q "$LEGACY_MARKER" /tmp/ngeblogging-v207-tenant.html 2>/dev/null; then ok=false; fi
  if [[ "$ok" == "true" ]]; then
    say "PRODUCTION_STUDIO_V207_LIVE_VERIFIED"
    echo "Release: $RELEASE"
    echo "Apex: https://ngeblogging.com"
    echo "Studio: https://ngeblogging.com/studio"
    exit 0
  fi
  echo "Verifikasi live ${attempt}/36 belum konsisten; mencoba lagi..."
  sleep 8
done

fail "v207 sudah dideploy tetapi verifikasi live apex/route belum lulus. Jangan klaim selesai sebelum marker lama hilang."
