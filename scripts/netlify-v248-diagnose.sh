#!/usr/bin/env bash
set +e
mkdir -p dist
LOG="dist/v248-diagnostics.txt"

{
  echo "Ngeblogging v248 Theme diagnostic"
  echo "commit=${COMMIT_REF:-unknown}"
  echo
  echo "===== PRE-V179 PATCHES ====="
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
  echo
  echo "===== THEME CONTRACT ====="
  node --test --test-name-pattern='Theme Studio' tests/studio-native-stability-v248.test.mjs
  TEST_EXIT=$?
  echo "theme_contract_exit=$TEST_EXIT"
  echo
  echo "===== SOURCE MARKERS AFTER PATCH ====="
  node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(path, "utf8");
const widgets = read("src/widget-system.js");
const runtime = read("src/studio-native-stability-v248.js");
const css = read("src/studio-native-stability-v248.css");
const finalCss = read("src/studio-native-final-v248.css");
for (const area of ["header-left","header-right","below-header","sidebar-left","before-content","after-content","sidebar-right","footer-left","footer-right","footer-wide"]) console.log(`area:${area}=${widgets.includes(`id: "${area}"`)}`);
console.log(`runtime:LAYOUT_AREAS=${runtime.includes("LAYOUT_AREAS")}`);
console.log(`runtime:v248-layout-map=${runtime.includes("v248-layout-map")}`);
console.log(`runtime:gutter=${runtime.includes("tn-code-gutter-v248")}`);
console.log(`css:50-50=${/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/.test(css)}`);
console.log(`css:monospace=${css.includes("ui-monospace")}`);
console.log(`finalCss:theme-visible=${/\.tn-studio[\s\S]*display:block!important/.test(finalCss)}`);
console.log(`finalCss:modal-bounded=${/\.tn-modal[\s\S]*max-height:calc\(100dvh - 20px\)!important/.test(finalCss)}`);
NODE
} >"$LOG" 2>&1

cat > dist/index.html <<'HTML'
<!doctype html><html><head><meta charset="utf-8"><title>Ngeblogging v248 diagnostic</title></head><body><h1>v248 diagnostic preview</h1><p><a href="/v248-diagnostics.txt">Open diagnostic log</a></p></body></html>
HTML
exit 0
