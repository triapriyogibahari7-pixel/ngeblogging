#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN=${1:-ngeblogging.com}
if [[ ! ${DOMAIN} =~ ^[a-z0-9.-]+$ ]]; then
  echo "Domain tidak valid." >&2
  exit 1
fi

echo "DNS untuk ${DOMAIN}:"
getent ahosts "${DOMAIN}" | awk '{print $1}' | sort -u

echo
echo "Health API:"
curl --fail --silent --show-error --max-time 15 "https://${DOMAIN}/api/health"

echo
echo "Header keamanan:"
curl --head --fail --silent --show-error --max-time 15 "https://${DOMAIN}/" \
  | tr -d '\r' \
  | grep -Ei '^(HTTP/|strict-transport-security:|x-frame-options:|x-content-type-options:|referrer-policy:|permissions-policy:)'

echo
echo "Verifikasi produksi berhasil."
