import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-surface-v339.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-surface-v339.css", import.meta.url);
const themeFile = new URL("../src/ThemeStudio.jsx", import.meta.url);
const releaseFile = new URL("../public/release-v339.json", import.meta.url);

const [entry, runtime, css, theme, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(themeFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

test("v339 keeps Theme Studio clean on compact device families", () => {
  assert.match(entry, /studio-theme-surface-v339\.js/);
  assert.match(runtime, /new Set\(\["application", "phone", "mobile", "compact", "tablet"\]\)/);
  assert.match(runtime, /new Set\(\["laptop", "desktop", "computer"\]\)/);
  assert.match(runtime, /v339ThemeFamily/);
  assert.match(runtime, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.match(css, /data-v339-theme-family="compact"/);
  assert.match(css, /\.tn-active-stage[\s\S]*?box-shadow:none!important/);
  assert.match(css, /\.tn-category-tabs[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css, /\.tn-device-switch::-webkit-scrollbar\{display:none!important/);
  assert.match(css, /\.tn-device-switch span[\s\S]*?display:inline!important/);
  assert.match(css, /\.tn-command nav button[\s\S]*?font-size:8px!important/);
  assert.match(css, /data-v337-secondary-below="ready"[\s\S]*?grid-template-columns:minmax\(0,1fr\)!important/);
});

test("v339 preserves the real Theme product and does not take ownership of unrelated Studio systems", () => {
  for (const marker of [
    "const DEVICES = [",
    "Aplikasi",
    "Handphone",
    "Mobile",
    "Perangkat kecil",
    "Tablet",
    "Laptop",
    "Situs desktop",
    "Komputer",
    "THEME_COUNT",
    "tn-active-stage",
    "tn-category-tabs",
  ]) assert.ok(theme.includes(marker), `ThemeStudio missing ${marker}`);

  for (const marker of [
    '"themes": 100',
    '"layoutAreas": 26',
    '"widgets": 26',
    '"previewModes": 8',
    '"secondaryEditorialMagazineBelow": true',
    '"compactStageNoElongatedBackdrop": true',
    '"compactCategoriesNoVisibleHorizontalTrack": true',
    '"sidebarUntouched": true',
    '"naraUntouched": true',
    '"authSessionUntouched": true',
    '"realDeviceCertificationClaimed": false',
  ]) assert.ok(release.includes(marker), `release missing ${marker}`);

  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.nara-assistant|\.sv124-domain-page|\.ce-app|\.sn-side/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(|setInterval\s*\(/);
  assert.doesNotMatch(runtime, /stopImmediatePropagation/);
});
