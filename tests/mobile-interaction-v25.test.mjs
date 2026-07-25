import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-interaction-v25.css");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const studioRuntime = read("src/studio-runtime-v23.js");
const naraRuntime = read("src/nara-mobile-window-v24.js");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");
const serviceWorker = read("public/sw.js");

test("v25 loads last and does not target landing or public tenant selectors", () => {
  const v23 = index.indexOf("studio-responsive-v23.css");
  const v24 = index.indexOf("studio-mobile-nara-v24.css");
  const v25 = index.indexOf("studio-interaction-v25.css");
  assert.ok(v23 > -1);
  assert.ok(v24 > v23);
  assert.ok(v25 > v24);
  assert.doesNotMatch(cssRules, /landing|public-site|tenant-page|theme-renderer|hero-public/i);
});

test("narrow viewport always resolves to mobile before desktop-site heuristics", () => {
  assert.match(studioRuntime, /const compact = layoutWidth <= MOBILE_BREAKPOINT/);
  assert.match(studioRuntime, /physicalPhone\s*&&\s*!compact/);
  assert.match(studioRuntime, /studio-mobile-interaction-v25-20260725/);
});

test("mobile sidebar keeps one clean clickable icon rail", () => {
  assert.match(css, /--sn-v25-rail: 60px/);
  assert.match(css, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-v25-rail\) !important/);
  assert.match(css, /nav::-webkit-scrollbar[\s\S]*width: 0 !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*place-items: center !important/);
  assert.match(css, /pointer-events: auto !important/);
  assert.match(css, /\.sn-sidebar-scrim-v23[\s\S]*z-index: 29900 !important/);
  assert.match(css, /data-sidebar-authority="single-v23"[\s\S]*z-index: 30100 !important/);
  assert.match(studioRuntime, /SIDEBAR_CLOSE_ICON/);
  assert.match(studioRuntime, /SIDEBAR_OPEN_ICON/);
  assert.match(studioRuntime, /toggle\.innerHTML = open \? SIDEBAR_CLOSE_ICON : SIDEBAR_OPEN_ICON/);
});

test("Nara opens compact on mobile and keeps fullscreen control on every device", () => {
  assert.match(naraRuntime, /function mobileViewport\(\)/);
  assert.match(naraRuntime, /return mobileViewport\(\) \? "compact" : "desktop"/);
  assert.match(naraRuntime, /toggle\.hidden = false/);
  assert.match(naraRuntime, /layer\.dataset\.naraWindowMode === "expanded" \? defaultWindowMode\(\) : "expanded"/);
  assert.match(css, /data-nara-window-mode="compact"/);
  assert.match(css, /height: min\(80dvh, 720px\) !important/);
  assert.match(css, /data-nara-window-mode="expanded"/);
  assert.match(css, /grid-template-columns: 42px minmax\(0, 1fr\) 36px 36px 36px !important/);
});

test("Nara capabilities and inline plugins remain available", () => {
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar"]) {
    assert.ok(assistant.includes(marker), marker);
  }
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector"]) {
    assert.ok(commandCenter.includes(marker), marker);
  }
  for (const marker of ["INTEGRATION_CATALOG", "nara-plugin-trigger-v24", "nara-plugin-panel-v24", "github", "supabase", "neon", "cloudflare"]) {
    assert.ok(naraRuntime.includes(marker), marker);
  }
});

test("PWA rotates to v25 while retaining production compatibility markers", () => {
  assert.match(serviceWorker, /ngeblogging-app-v25-20260725/);
  assert.match(serviceWorker, /ngeblogging-app-v24-20260725/);
  assert.match(serviceWorker, /ngeblogging-app-v14-20260724-v21/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
});
