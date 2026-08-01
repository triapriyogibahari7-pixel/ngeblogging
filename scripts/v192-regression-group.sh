#!/usr/bin/env bash
set -euo pipefail

node scripts/auth-capacity-model-v162.mjs --output public/auth-capacity-v162.json
node scripts/studio-layout-model-v176.mjs --output public/studio-layout-v176.json
node scripts/patch-auth-callback-v162.mjs
node scripts/patch-content-editor-v162.mjs
node scripts/patch-studio-content-v161.mjs
node scripts/patch-legacy-worker-entry-v157.mjs
node scripts/run-patch-theme-layout-v170.mjs
node scripts/run-patch-mobile-public-v171.mjs
node scripts/run-patch-mobile-interaction-v174.mjs
node scripts/run-patch-mobile-stability-v176.mjs
node scripts/patch-studio-mobile-v176.mjs
node scripts/patch-nara-native-v177.mjs
node scripts/run-patch-screenshot-stability-v177.mjs
node scripts/patch-service-worker-v179.mjs

group="${1:-recent}"
if [[ "$group" == "recent" ]]; then
  node --test \
    tests/studio-mobile-runtime-v179.test.mjs \
    tests/studio-mobile-hardening-v181.test.mjs \
    tests/studio-production-v183.test.mjs \
    tests/studio-source-v185.test.mjs \
    tests/production-data-v186.test.mjs \
    tests/studio-production-mobile-v189.test.mjs \
    tests/studio-real-device-v190.test.mjs \
    tests/studio-screenshot-recovery-v191.test.mjs \
    tests/studio-data-bootstrap-v192.test.mjs
elif [[ "$group" == "legacy-a" ]]; then
  node --test \
    tests/studio-interface-v147.test.mjs tests/studio-interface-v148.test.mjs tests/studio-interface-v149.test.mjs \
    tests/studio-recovery-v150.test.mjs tests/studio-completion-v151.test.mjs tests/studio-production-sync-v151.test.mjs \
    tests/studio-continuity-v152.test.mjs tests/auth-production-v153.test.mjs tests/production-entry-v154.test.mjs \
    tests/netlify-production-publisher-v156.test.mjs tests/legacy-worker-entry-v157.test.mjs tests/release-v157-probe.test.mjs \
    tests/auth-studio-route-v158.test.mjs tests/studio-ui-contract-v159.test.mjs tests/studio-pwa-v159.test.mjs \
    tests/production-authority-v160.test.mjs tests/studio-platform-v160.test.mjs tests/studio-content-v161.test.mjs \
    tests/studio-content-release-v161.test.mjs tests/auth-callback-v162.test.mjs tests/content-editor-v162.test.mjs \
    tests/auth-editor-release-v162.test.mjs tests/auth-capacity-v162.test.mjs
elif [[ "$group" == "legacy-b" ]]; then
  node --test \
    tests/production-route-v163.test.mjs tests/production-authority-v164.test.mjs tests/production-domain-attach-v165.test.mjs \
    tests/production-route-recovery-v168.test.mjs tests/first-site-onboarding-v169.test.mjs \
    tests/theme-layout-v170.test.mjs tests/theme-layout-v170-idempotency.test.mjs tests/mobile-public-layout-v171.test.mjs \
    tests/production-custom-domain-v172.test.mjs tests/mobile-interaction-v174.test.mjs tests/production-login-finalizer-v175.test.mjs \
    tests/mobile-stability-v176.test.mjs tests/studio-mobile-stability-v176.test.mjs tests/members-v176.test.mjs \
    tests/studio-layout-model-v176.test.mjs tests/studio-screenshot-stability-v177.test.mjs tests/auth-readiness-v177.test.mjs \
    tests/studio-finalization-v178.test.mjs
else
  echo "Unknown regression group: $group" >&2
  exit 2
fi
