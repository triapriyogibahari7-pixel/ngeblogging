#!/usr/bin/env bash
set -uo pipefail

APP_DIR=${APP_DIR:-/opt/ngeblogging/app}
DEPLOY_ENV=${DEPLOY_ENV:-${APP_DIR}/.deploy.env}
ENV_FILE=${NGEBLOGGING_ENV_FILE:-/opt/ngeblogging/shared/.env}
failures=0

check() {
  local label=$1
  shift
  if "$@" >/dev/null 2>&1; then
    printf 'OK   %s\n' "${label}"
  else
    printf 'FAIL %s\n' "${label}"
    failures=$((failures + 1))
  fi
}

check "Docker daemon" docker info
check "Docker Compose" docker compose version
check "Ruang disk minimal 3 GB" bash -c "[[ \$(df -Pk / | awk 'NR==2 {print \$4}') -gt 3145728 ]]"
check "RAM minimal 1 GB" bash -c "[[ \$(awk '/MemTotal/ {print \$2}' /proc/meminfo) -gt 950000 ]]"
check "Konfigurasi deployment" test -s "${DEPLOY_ENV}"
check "Environment secret server" test -s "${ENV_FILE}"
check "Port 80 mendengarkan" bash -c "ss -ltn | grep -qE ':(80)[[:space:]]'"
check "Port 443 mendengarkan" bash -c "ss -ltn | grep -qE ':(443)[[:space:]]'"

if [[ -s ${DEPLOY_ENV} && -f ${APP_DIR}/compose.production.yml ]]; then
  check "Compose valid" docker compose --env-file "${DEPLOY_ENV}" -f "${APP_DIR}/compose.production.yml" config --quiet
  check "API health" docker compose --env-file "${DEPLOY_ENV}" -f "${APP_DIR}/compose.production.yml" exec -T api node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
fi

exit "${failures}"
