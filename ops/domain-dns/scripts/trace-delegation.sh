#!/usr/bin/env bash
set -euo pipefail
command -v dig >/dev/null || { echo "Install dig / dnsutils first." >&2; exit 1; }
domain="triapriyoginotes.my.id"
printf '\nDelegation trace (NS)\n'; dig +time=3 +tries=1 +trace "$domain" NS
printf '\nDelegation trace (DS)\n'; dig +time=3 +tries=1 +trace "$domain" DS
printf '\nNameserver brand records (not proof of authority)\n'
dig +time=3 +tries=1 ns1.ngeblogging.com A
dig +time=3 +tries=1 ns1.ngeblogging.com AAAA
dig +time=3 +tries=1 ns2.ngeblogging.com A
dig +time=3 +tries=1 ns2.ngeblogging.com AAAA
