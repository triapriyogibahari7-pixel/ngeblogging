#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
APP_DIR=$(cd -- "${SCRIPT_DIR}/.." && pwd)
DEPLOY_ENV=${DEPLOY_ENV:-${APP_DIR}/.deploy.env}
COMPOSE_FILE=${APP_DIR}/compose.production.yml
CURRENT_TAG_FILE=${APP_DIR}/.current-image-tag

if [[ ! -f ${DEPLOY_ENV} ]]; then
  echo "Konfigurasi deployment tidak ditemukan: ${DEPLOY_ENV}" >&2
  exit 1
fi

set -a
# File ini dibuat oleh workflow GitHub dan hanya berisi konfigurasi non-secret.
source "${DEPLOY_ENV}"
set +a

: "${IMAGE_TAG:?IMAGE_TAG wajib diisi}"
: "${GHCR_REPOSITORY_OWNER:?GHCR_REPOSITORY_OWNER wajib diisi}"
: "${SITE_HOSTS:?SITE_HOSTS wajib diisi}"
: "${PRIMARY_SITE_DOMAIN:?PRIMARY_SITE_DOMAIN wajib diisi}"
: "${ACME_EMAIL:?ACME_EMAIL wajib diisi}"

if [[ ! ${IMAGE_TAG} =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "IMAGE_TAG tidak valid." >&2
  exit 1
fi
if [[ ! ${GHCR_REPOSITORY_OWNER} =~ ^[a-z0-9-]+$ ]]; then
  echo "GHCR_REPOSITORY_OWNER tidak valid." >&2
  exit 1
fi
if [[ ! ${PRIMARY_SITE_DOMAIN} =~ ^[a-z0-9.-]+$ ]]; then
  echo "PRIMARY_SITE_DOMAIN tidak valid." >&2
  exit 1
fi
if [[ ! -s /opt/ngeblogging/shared/.env ]]; then
  echo "Secret server belum diisi di /opt/ngeblogging/shared/.env" >&2
  exit 1
fi

previous_tag=""
if [[ -f ${CURRENT_TAG_FILE} ]]; then
  previous_tag=$(<"${CURRENT_TAG_FILE}")
fi

compose() {
  docker compose --env-file "${DEPLOY_ENV}" -f "${COMPOSE_FILE}" "$@"
}

rollback() {
  if [[ -z ${previous_tag} || ${previous_tag} == "${IMAGE_TAG}" ]]; then
    echo "Deployment pertama gagal; container dibiarkan aktif untuk diagnosis." >&2
    return
  fi
  echo "Health check gagal. Mengembalikan image ${previous_tag}." >&2
  IMAGE_TAG=${previous_tag} compose up -d --remove-orphans
  printf '%s\n' "${previous_tag}" > "${CURRENT_TAG_FILE}"
}

trap 'rollback' ERR

compose config --quiet
compose pull
compose up -d --remove-orphans

api_ready=0
for _ in {1..30}; do
  if compose exec -T api node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    api_ready=1
    break
  fi
  sleep 4
done
[[ ${api_ready} -eq 1 ]]

if [[ ${SKIP_PUBLIC_HEALTHCHECK:-0} != 1 ]]; then
  public_ready=0
  for _ in {1..36}; do
    if curl --silent --show-error --fail --max-time 10 \
      --resolve "${PRIMARY_SITE_DOMAIN}:443:127.0.0.1" \
      "https://${PRIMARY_SITE_DOMAIN}/api/health" >/dev/null; then
      public_ready=1
      break
    fi
    sleep 5
  done
  [[ ${public_ready} -eq 1 ]]
fi

printf '%s\n' "${IMAGE_TAG}" > "${CURRENT_TAG_FILE}"
trap - ERR

compose ps
docker image prune -f --filter "until=168h" >/dev/null
echo "Deployment ${IMAGE_TAG} sehat dan aktif."
