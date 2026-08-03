#!/usr/bin/env bash
set +e

TEST_LOG="/tmp/ngeblogging-v248-test.log"
BUILD_LOG="/tmp/ngeblogging-v248-build.log"

npm run test:production >"$TEST_LOG" 2>&1
TEST_EXIT=$?

npx vite build >"$BUILD_LOG" 2>&1
BUILD_EXIT=$?

mkdir -p dist
{
  echo "Ngeblogging v248 diagnostic preview"
  echo "test_production_exit=$TEST_EXIT"
  echo "vite_build_exit=$BUILD_EXIT"
  echo
  echo "===== npm run test:production ====="
  cat "$TEST_LOG"
  echo
  echo "===== npx vite build ====="
  cat "$BUILD_LOG"
} > dist/v248-diagnostics.txt

if [[ ! -f dist/index.html ]]; then
  cat > dist/index.html <<'HTML'
<!doctype html><html><head><meta charset="utf-8"><title>v248 diagnostic</title></head><body><pre>Build diagnostic only. Open /v248-diagnostics.txt</pre></body></html>
HTML
fi

exit 0
