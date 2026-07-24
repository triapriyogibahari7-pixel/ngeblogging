import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-mobile-v20.css");
const sidebarRuntime = read("src/studio-sidebar-v15.js");
const launcherRuntime = read("src/nara-launcher-v20.js");
const commandCenter = read("src/nara-command-center-bridge.js");

test("v20 owns the final runtime order", () => {
  assert.ok(index.indexOf("studio-mobile-v20.css") > index.indexOf("studio-mobile-v19.css"));
  assert.match(index, /studio-sidebar-v15\.js/);
  assert.match(index, /nara-launcher-v20\.js/);
  assert.doesNotMatch(index, /nara-launcher-v19\.js/);
});

test("desktop-site phone uses a root-only counter scale", () => {
  const pwa = read("src/pwa-runtime.js");
  assert.match(pwa, /desktopSitePhone/);
  assert.match(pwa, /physicalLayoutWidth: layoutWidth \/ browserScale/);
  assert.match(css, /body[\s\S]*zoom: 1 !important/);
  assert.match(css, /#root[\s\S]*zoom: var\(--sn-browser-scale,1\) !important/);
  assert.doesNotMatch(css, /min-width: 980px !important/);
});

test("one sidebar controller remains and no bottom navigation returns", () => {
  assert.match(sidebarRuntime, /querySelectorAll\(":scope > \.sn-sidebar-edge-v15"\)\.forEach/);
  assert.match(sidebarRuntime, /original\.dataset\.sidebarAuthority = "single-v19"/);
  assert.match(sidebarRuntime, /profile\.mobile \|\| profile\.compactDesktop/);
  assert.match(sidebarRuntime, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*place-items: center !important/);
});

test("Nara v20 uses native click plus workspace fallback", () => {
  assert.match(launcherRuntime, /HTMLElement\.prototype\.click\.call\(element\)/);
  assert.match(launcherRuntime, /\.sn-top-actions \.sn-nara-button/);
  assert.match(launcherRuntime, /\.ce-nara/);
  assert.match(launcherRuntime, /data-nara-workspace-route/);
  assert.match(launcherRuntime, /\.nw-page button/);
  assert.match(launcherRuntime, /document\.body\.append\(proxy\)/);
  assert.match(css, /\.nara-floating-proxy-v20[\s\S]*pointer-events: auto !important/);
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
  assert.match(sidebarRuntime, /data-layout-route-v19/);
  assert.match(sidebarRuntime, /Tata Letak/);
  assert.match(sidebarRuntime, /currentTheme\.click\(\)/);
  assert.match(sidebarRuntime, /sesuaikan/i);
});

test("site manager and editor overlays are constrained", () => {
  assert.match(css, /\.sn-modal-layer,[\s\S]*\.ce-source-layer/);
  assert.match(css, /\.sn-site-manager[\s\S]*max-height:calc\(var\(--sn-physical-layout-height/);
  assert.match(css, /\.ce-paper[\s\S]*min-height:max\(480px/);
  assert.match(css, /\.ce-sidebar[\s\S]*position:static !important/);
});
