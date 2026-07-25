import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-responsive-v21.css");
const sidebarRuntime = read("src/studio-sidebar-v21.js");
const assistant = read("src/NaraAssistant.jsx");
const commandCenter = read("src/nara-command-center-bridge.js");

test("v21 owns the final runtime order", () => {
  assert.ok(index.indexOf("studio-responsive-v21.css") > index.indexOf("nara-interaction-authority.css"));
  assert.match(index, /studio-sidebar-v21\.js/);
  assert.doesNotMatch(index, /studio-mobile-v(?:15|16|17|18|19|20)\.css/);
  assert.doesNotMatch(index, /nara-launcher-v(?:19|20)\.js/);
});

test("desktop-site phone uses the real browser viewport without counter scaling", () => {
  const pwa = read("src/pwa-runtime.js");
  assert.match(pwa, /const compactViewport = layoutWidth <= 760/);
  assert.match(pwa, /desktopLayoutRequested/);
  assert.match(pwa, /root\.dataset\.desktopSitePhone = "false"/);
  assert.match(pwa, /--sn-browser-scale", "1"/);
  assert.match(css, /html\[data-desktop-site-phone="true"\] #root[\s\S]*zoom: 1 !important/);
  assert.doesNotMatch(css, /min-width: 980px !important/);
  assert.doesNotMatch(css, /zoom: var\(--sn-browser-scale/);
});

test("one sidebar controller remains and no bottom navigation returns", () => {
  assert.match(sidebarRuntime, /querySelectorAll\(":scope > \.sn-sidebar-edge-v15/);
  assert.match(sidebarRuntime, /toggle\.dataset\.sidebarAuthority = "single-v21"/);
  assert.match(sidebarRuntime, /const mobile = isMobileViewport\(\)/);
  assert.match(sidebarRuntime, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*place-items: center !important/);
});

test("Nara uses its direct React launcher and no proxy fallback", () => {
  assert.match(assistant, /className="nara-floating-button" onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(assistant, /className="nara-assistant-layer"/);
  assert.match(assistant, /setOpen\(false\)/);
  assert.doesNotMatch(index, /nara-launcher-v20\.js/);
  assert.match(css, /\.nara-floating-proxy-v20,[\s\S]*pointer-events: none !important/);
  assert.match(css, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
});

test("Nara is hidden from the sidebar but complete workspace routes remain", () => {
  assert.match(sidebarRuntime, /textLabel\(button\) !== "Nara AI"/);
  assert.match(sidebarRuntime, /button\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(commandCenter, /route\.click\(\)/);
  for (const capability of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector"]) {
    assert.ok(commandCenter.includes(capability), capability);
  }
});

test("Tata Letak still opens the real customizer", () => {
  assert.match(sidebarRuntime, /data-layout-route-v21/);
  assert.match(sidebarRuntime, /Tata Letak/);
  assert.match(sidebarRuntime, /currentTheme\.click\(\)/);
  assert.match(sidebarRuntime, /sesuaikan/i);
});

test("site manager and editor overlays are constrained", () => {
  assert.match(css, /\.ce-workspace[\s\S]*display: block !important/);
  assert.match(css, /\.ce-paper[\s\S]*min-height: max\(480px/);
  assert.match(css, /\.ce-sidebar[\s\S]*position: static !important/);
  assert.match(css, /\.nara-assistant-layer[\s\S]*min-height: 100dvh !important/);
});
