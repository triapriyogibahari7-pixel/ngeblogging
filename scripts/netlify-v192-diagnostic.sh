#!/usr/bin/env bash
set +e
LOG=/tmp/ngeblogging-v192-full-build.log
STATUS=/tmp/ngeblogging-v192-status.txt
V189_DIAGNOSTIC_SKIP=1 node scripts/patch-service-worker-v179.mjs >"$LOG" 2>&1
code=$?
printf 'exit_code=%s\ncommit=%s\ncommand=v179-v188-patch-chain\n' "$code" "${COMMIT_REF:-unknown}" >"$STATUS"
mkdir -p dist
cp "$LOG" dist/v192-full-build.log
cp "$STATUS" dist/v192-build-status.txt
cat > dist/index.html <<EOF
<!doctype html><meta charset="utf-8"><title>v192 diagnostic</title><pre>v192 diagnostic captured. exit_code=${code}</pre>
EOF
exit 0
