#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Jalankan sebagai root: sudo bash scripts/bootstrap-ubuntu.sh <user-deploy>" >&2
  exit 1
fi

DEPLOY_USER=${1:-${SUDO_USER:-}}
if [[ -z ${DEPLOY_USER} || ${DEPLOY_USER} == root ]] || ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  echo "Berikan nama user non-root yang sudah ada di VPS." >&2
  exit 1
fi

source /etc/os-release
if [[ ${ID:-} != ubuntu && ${ID:-} != debian ]]; then
  echo "Script ini hanya mendukung Ubuntu atau Debian." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

ARCH=$(dpkg --print-architecture)
CODENAME=${VERSION_CODENAME:?VERSION_CODENAME tidak tersedia}
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

usermod -aG docker "${DEPLOY_USER}"
install -d -m 0750 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /opt/ngeblogging
install -d -m 0750 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /opt/ngeblogging/app
install -d -m 0700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /opt/ngeblogging/shared

if [[ ! -e /opt/ngeblogging/shared/.env ]]; then
  install -m 0600 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /dev/null /opt/ngeblogging/shared/.env
fi

docker version >/dev/null
docker compose version >/dev/null

echo "Bootstrap selesai. Logout lalu login kembali agar group docker aktif."
echo "Isi /opt/ngeblogging/shared/.env dengan secret produksi sebelum deployment pertama."
