import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v297 makes data-small authoritative even when CSS viewport is widened", async () => {
  const css = await read("src/studio-mode-authority-v297.css");
  assert.match(css, /html\[data-studio-device-mode="small"\] \.sn-shell>\.sn-main/);
  assert.match(css, /margin-left:0!important/);
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /width:54px!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open/);
  assert.match(css, /width:min\(78vw,336px\)!important/);
  assert.match(css, /html\[data-studio-device-mode="large"\] \.sn-shell>\.sn-main/);
  assert.match(css, /--v297-side-open:220px/);
  assert.match(css, /--v297-side-rail:70px/);
});

test("v297 visual source is preserved while v298 becomes the only live shell owner", async () => {
  const [runtime, css, native, v298] = await Promise.all([
    read("src/studio-mode-authority-v297.js"),
    read("src/studio-mode-authority-v297.css"),
    read("src/studio-native-controls-v290.js"),
    read("src/studio-shell-authority-v298.js"),
  ]);
  assert.match(runtime, /studio-mode-startup-authority-v297-20260805/);
  assert.match(runtime, /nara-react-single-owner-v297-20260805/);
  assert.match(runtime, /history\.replaceState/);
  assert.doesNotMatch(runtime, /MutationObserver|setInterval\s*\(|location\.(?:reload|replace)\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
  assert.match(css, /\.nara-floating-button\{position:fixed!important/);
  assert.match(css, /\.nara-assistant-layer\[data-nara-interaction="nonmodal"\]/);
  assert.match(css, /\.nara-attachment-menu\{/);
  assert.match(css, /bottom:calc\(100% \+ 8px\)!important/);
  assert.match(css, /html\[data-studio-device-mode="small"\] \.tn-code-workspace\{[^}]*grid-template-areas:"code" "preview"/);
  assert.match(css, /\.tn-code-workspace\{[^}]*grid-template-areas:"code preview"/);
  assert.doesNotMatch(native, /import\("\.\/studio-mode-authority-v297\.js"\)/);
  assert.match(native, /import\("\.\/studio-shell-authority-v298\.js"\)/);
  assert.match(v298, /studio-shell-authority-v298-20260805/);
});

test("v297 retires legacy Nara observers and legacy auth redirect gate", async () => {
  const [sizeLegacy, nonmodalLegacy, authLegacy] = await Promise.all([
    read("src/nara-size-authority-v144.js"),
    read("src/nara-nonmodal-v151.js"),
    read("src/auth-studio-bootstrap-v106.js"),
  ]);
  assert.match(sizeLegacy, /retired-v297/);
  assert.match(nonmodalLegacy, /retired-v297/);
  assert.match(authLegacy, /auth-studio-bootstrap-retired-v297/);
  assert.doesNotMatch(sizeLegacy, /new MutationObserver|setInterval\s*\(/);
  assert.doesNotMatch(nonmodalLegacy, /new MutationObserver|setInterval\s*\(/);
  assert.doesNotMatch(authLegacy, /location\.(?:replace|reload)\s*\(|requestAnimationFrame\(check\)|ngeblogging-auth-gate-v106.*createElement/);
  assert.match(authLegacy, /supabase\.auth\.getSession\(\)/);
  assert.match(authLegacy, /persisted session is not cleared/);
});

test("v297 preserves v292 auth persistence and v296 exact theme catalog", async () => {
  const [auth, catalogTest, release] = await Promise.all([
    read("src/lib/supabase.js"),
    read("tests/studio-theme-catalog-v296.test.mjs"),
    read("public/release-v297.json"),
  ]);
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
  assert.match(auth, /appUrl\("\/\?auth=callback"\)/);
  assert.match(catalogTest, /exactly 100 themes/);
  assert.match(release, /"themeCatalogCount": 100/);
  assert.match(release, /"productionDeploymentClaimed": false/);
  assert.match(release, /"capacityClaimed": false/);
});
