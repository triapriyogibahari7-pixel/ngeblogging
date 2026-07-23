#!/usr/bin/env bash
set -Eeuo pipefail

: "${DEPLOY_ROLE:?DEPLOY_ROLE wajib diisi}"
: "${VPS_HOST:?VPS_HOST wajib diisi}"
: "${VPS_PORT:?VPS_PORT wajib diisi}"
: "${VPS_USER:?VPS_USER wajib diisi}"
: "${SSH_PRIVATE_KEY:?SSH_PRIVATE_KEY wajib diisi}"
: "${SSH_KNOWN_HOSTS:?SSH_KNOWN_HOSTS wajib diisi}"
: "${SITE_HOSTS:?SITE_HOSTS wajib diisi}"
: "${PRIMARY_SITE_DOMAIN:?PRIMARY_SITE_DOMAIN wajib diisi}"
: "${ACME_EMAIL:?ACME_EMAIL wajib diisi}"
: "${GHCR_TOKEN:?GHCR_TOKEN wajib diisi}"
: "${GITHUB_ACTOR:?GITHUB_ACTOR wajib diisi}"
: "${GITHUB_REPOSITORY_OWNER:?GITHUB_REPOSITORY_OWNER wajib diisi}"
: "${GITHUB_SHA:?GITHUB_SHA wajib diisi}"

[[ ${DEPLOY_ROLE} =~ ^(primary|standby)$ ]] || { echo "DEPLOY_ROLE tidak valid" >&2; exit 1; }
[[ ${VPS_PORT} =~ ^[0-9]{1,5}$ ]] || { echo "VPS_PORT tidak valid" >&2; exit 1; }
(( VPS_PORT >= 1 && VPS_PORT <= 65535 )) || { echo "VPS_PORT di luar rentang" >&2; exit 1; }
[[ ${VPS_USER} =~ ^[a-z_][a-z0-9_-]*$ ]] || { echo "VPS_USER tidak valid" >&2; exit 1; }
[[ ${GITHUB_ACTOR} =~ ^[A-Za-z0-9-]+$ ]] || { echo "GITHUB_ACTOR tidak valid" >&2; exit 1; }
[[ ${GITHUB_REPOSITORY_OWNER} =~ ^[A-Za-z0-9-]+$ ]] || { echo "GITHUB_REPOSITORY_OWNER tidak valid" >&2; exit 1; }
[[ ${SITE_HOSTS} =~ ^[a-z0-9.-]+(,[[:space:]]*[a-z0-9.-]+)*$ ]] || { echo "SITE_HOSTS tidak valid" >&2; exit 1; }
[[ ${PRIMARY_SITE_DOMAIN} =~ ^[a-z0-9.-]+$ ]] || { echo "PRIMARY_SITE_DOMAIN tidak valid" >&2; exit 1; }
[[ ${ACME_EMAIL} =~ ^[^[:space:]@]+@[^[:space:]@]+$ ]] || { echo "ACME_EMAIL tidak valid" >&2; exit 1; }

install -m 700 -d "${HOME}/.ssh"
KEY_FILE="${HOME}/.ssh/ngeblogging-${DEPLOY_ROLE}"
KNOWN_HOSTS_FILE="${HOME}/.ssh/ngeblogging-known-hosts-${DEPLOY_ROLE}"
DEPLOY_ENV=$(mktemp)
printf '%s\n' "${SSH_PRIVATE_KEY}" > "${KEY_FILE}"
printf '%s\n' "${SSH_KNOWN_HOSTS}" > "${KNOWN_HOSTS_FILE}"
chmod 600 "${KEY_FILE}" "${KNOWN_HOSTS_FILE}" "${DEPLOY_ENV}"

SSH=(ssh -i "${KEY_FILE}" -p "${VPS_PORT}" -o BatchMode=yes -o "UserKnownHostsFile=${KNOWN_HOSTS_FILE}" "${VPS_USER}@${VPS_HOST}")
SCP=(scp -i "${KEY_FILE}" -P "${VPS_PORT}" -o BatchMode=yes -o "UserKnownHostsFile=${KNOWN_HOSTS_FILE}")
registry_login=0

cleanup() {
  if [[ ${registry_login} -eq 1 ]]; then
    "${SSH[@]}" 'docker logout ghcr.io >/dev/null 2>&1 || true' || true
  fi
  rm -f "${KEY_FILE}" "${KNOWN_HOSTS_FILE}" "${DEPLOY_ENV}"
}
trap cleanup EXIT

{
  printf 'GHCR_REPOSITORY_OWNER=%s\n' "${GITHUB_REPOSITORY_OWNER,,}"
  printf 'IMAGE_TAG=sha-%s\n' "${GITHUB_SHA}"
  printf 'SITE_HOSTS="%s"\n' "${SITE_HOSTS}"
  printf 'PRIMARY_SITE_DOMAIN=%s\n' "${PRIMARY_SITE_DOMAIN}"
  printf 'ACME_EMAIL=%s\n' "${ACME_EMAIL}"
  printf 'NGEBLOGGING_ENV_FILE=/opt/ngeblogging/shared/.env\n'
} > "${DEPLOY_ENV}"

"${SSH[@]}" 'install -d -m 0750 /opt/ngeblogging/app/scripts'
"${SCP[@]}" compose.production.yml Caddyfile "${VPS_USER}@${VPS_HOST}:/opt/ngeblogging/app/"
"${SCP[@]}" "${DEPLOY_ENV}" "${VPS_USER}@${VPS_HOST}:/opt/ngeblogging/app/.deploy.env"
"${SCP[@]}" scripts/deploy.sh scripts/server-doctor.sh scripts/verify-production.sh "${VPS_USER}@${VPS_HOST}:/opt/ngeblogging/app/scripts/"

printf '%s' "${GHCR_TOKEN}" | "${SSH[@]}" "docker login ghcr.io -u '${GITHUB_ACTOR}' --password-stdin"
registry_login=1
"${SSH[@]}" 'chmod 750 /opt/ngeblogging/app/scripts/*.sh && /opt/ngeblogging/app/scripts/deploy.sh'

echo "Deployment ${DEPLOY_ROLE} selesai dan health check lulus."
