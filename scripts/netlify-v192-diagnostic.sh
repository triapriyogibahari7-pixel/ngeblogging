#!/usr/bin/env bash
set +e
LOG=/tmp/ngeblogging-v192-full-build.log
STATUS=/tmp/ngeblogging-v192-status.txt
npm run build >"$LOG" 2>&1
code=$?
printf 'exit_code=%s\ncommit=%s\n' "$code" "${COMMIT_REF:-unknown}" >"$STATUS"
mkdir -p dist
cp "$LOG" dist/v192-full-build.log
cp "$STATUS" dist/v192-build-status.txt
cat > dist/v192-diagnostic.html <<EOF
<!doctype html><meta charset="utf-8"><title>v192 diagnostic</title><pre>v192 diagnostic build captured. exit_code=${code}</pre>
EOF
exit 0
