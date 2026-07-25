import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-responsive-v23.css");
const runtime = read("src/studio-runtime-v23.js");
const assistant = read("src/NaraAssistant.jsx");
const commandCenter = read("src/nara-command-center-bridge.js");

test("v23 owns the final runtime order", () => {
  assert.ok(index.indexOf("studio-responsive-v23.css") > index.indexOf("nara-interaction-authority.css"));
  assert.match(index, /studio-runtime-v23\.js/);
  assert.doesNotMatch(index, /<script[^>]+studio-sidebar-v21\.js/);
  assert.doesNotMatch(index, /<script[^>]+studio-runtime-v22\.js/);
  assert.doesNotMatch(index, /<link[^>]+studio-mobile-v(?:15|16|17|18|19|20)\.css/);
  assert.doesNotMatch(index, /<script[^>]+nara-launcher-v(?:19|20)\.js/);
});

test("desktop-site phone uses the real browser viewport without counter scaling", () => {
  const pwa = read("src/pwa-runtime.js");
  assert.match(pwa, /const compactViewport = layoutWidth <= 760 && !desktopLayoutRequested/);
  assert.match(pwa, /viewportToScreenRatio >= 1\.18/);
  assert.match(pwa, /root\.dataset\.desktopSitePhone = String\(profile\.desktopLayoutRequested\)/);
  assert.match(pwa, /--sn-browser-scale", "1"/);
  assert.match(css, /html\[data-desktop-layout-requested="true"\] \.sn-main/);
  assert.doesNotMatch(css, /zoom: var\(--sn-browser-scale/);
});

test("one sidebar controller remains and no bottom navigation returns", () => {
  assert.match(runtime, /querySelectorAll\(':scope > \[class\*="sn-sidebar-edge-v"\]'/);
  assert.match(runtime, /toggle\.dataset\.sidebarAuthority = "single-v23"/);
  assert.match(runtime, /const profile = syncDeviceFlags\(\)/);
  assert.match(runtime, /\.sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*place-items: center !important/);
});

test("Nara uses its direct React launcher and no proxy fallback", () => {
  assert.match(assistant, /className="nara-floating-button" onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(assistant, /className="nara-assistant-layer"/);
  assert.match(assistant, /setOpen\(false\)/);
  assert.doesNotMatch(index, /<script[^>]+nara-launcher-v20\.js/);
  assert.match(css, /\.nara-floating-proxy-v20,[\s\S]*pointer-events: none !important/);
  assert.match(css, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
});

test("Nara is hidden from the sidebar but complete workspace routes remain", () => {
  assert.match(runtime, /textLabel\(button\) !== "Nara AI"/);
  assert.match(runtime, /button\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(commandCenter, /route\.click\(\)/);
  for (const capability of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector"]) {
    assert.ok(commandCenter.includes(capability), capability);
  }
});

test("Tata Letak still opens the real customizer", () => {
  assert.match(runtime, /data-layout-route-v23/);
  assert.match(runtime, /Tata Letak/);
  assert.match(runtime, /currentTheme\.click\(\)/);
  assert.match(runtime, /sesuaikan/i);
});

test("site manager editor and Nara overlays are constrained", () => {
  assert.match(css, /html:not\(\[data-desktop-layout-requested="true"\]\) \.ce-workspace[\s\S]*display: block !important/);
  assert.match(css, /html:not\(\[data-desktop-layout-requested="true"\]\) \.ce-paper[\s\S]*720px/);
  assert.match(css, /html:not\(\[data-desktop-layout-requested="true"\]\) \.ce-sidebar[\s\S]*position: static !important/);
  assert.match(css, /data-physical-phone="true"\] \.nara-assistant-layer[\s\S]*min-height: 100dvh !important/);
});
