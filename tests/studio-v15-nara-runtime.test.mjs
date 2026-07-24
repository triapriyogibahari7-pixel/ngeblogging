import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const mobileCss = `${read("src/studio-mobile-v15.css")}\n${read("src/studio-mobile-v16.css")}\n${read("src/studio-mobile-v17.css")}\n${read("src/studio-mobile-v18.css")}\n${read("src/studio-mobile-v19.css")}`;
const sidebarRuntime = read("src/studio-sidebar-v15.js");
const launcherRuntime = read("src/nara-launcher-v19.js");
const commandCenter = read("src/nara-command-center-bridge.js");

test("v19 is the final deterministic authority", () => {
  const v18 = index.indexOf("studio-mobile-v18.css");
  const v19 = index.indexOf("studio-mobile-v19.css");
  assert.ok(v18 > -1);
  assert.ok(v19 > v18);
  assert.match(index, /studio-sidebar-v15\.js/);
  assert.match(index, /nara-launcher-v19\.js/);
  assert.doesNotMatch(index, /nara-launcher-v18\.js/);
});

test("desktop site on a physical phone uses adaptive desktop, not a tiny 980px screenshot", () => {
  const pwa = read("src/pwa-runtime.js");
  const v19 = read("src/studio-mobile-v19.css");
  assert.match(pwa, /desktopSitePhone/);
  assert.match(pwa, /adaptiveDesktopPhone: desktopSitePhone/);
  assert.match(sidebarRuntime, /const compactDesktop = physicalMobile && desktopSitePhone/);
  assert.match(v19, /body[\s\S]*width: var\(--sn-physical-layout-width/);
  assert.match(v19, /body[\s\S]*zoom: var\(--sn-browser-scale, 1\) !important/);
  assert.doesNotMatch(v19, /min-width: 980px !important/);
  assert.match(v19, /\.ce-workspace[\s\S]*display: block !important/);
});

test("phones use one original React sidebar toggle with compact desktop overlay", () => {
  assert.match(sidebarRuntime, /v19InitialSidebarResolved/);
  assert.match(sidebarRuntime, /querySelectorAll\(":scope > \.sn-sidebar-edge-v15"\)\.forEach/);
  assert.match(sidebarRuntime, /original\.dataset\.sidebarAuthority = "single-v19"/);
  assert.match(sidebarRuntime, /sn-sidebar-edge-owner-v19/);
  assert.match(sidebarRuntime, /profile\.mobile \|\| profile\.compactDesktop/);
  assert.match(mobileCss, /html \.sn-sidebar-edge-v15[\s\S]*display: none !important/);
  assert.match(sidebarRuntime, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
});

test("Nara body proxy cannot be blocked and retries all native React launch paths", () => {
  assert.match(launcherRuntime, /document\.body\.append\(proxy\)/);
  assert.match(launcherRuntime, /headerLauncher/);
  assert.match(launcherRuntime, /editorLauncher/);
  assert.match(launcherRuntime, /originalLauncher/);
  assert.match(launcherRuntime, /clickBestLauncher/);
  assert.match(launcherRuntime, /closeSidebarBeforeNara/);
  assert.match(mobileCss, /\.nara-floating-proxy-v19[\s\S]*z-index: 2147483646 !important/);
  assert.match(mobileCss, /\.nara-floating-proxy-v19[\s\S]*pointer-events: auto !important/);
  assert.match(mobileCss, /data-desktop-site-phone="true"[\s\S]*\.nara-assistant-layer[\s\S]*--sn-physical-layout-height/);
});

test("Nara is absent from sidebar but all workspace capabilities remain callable", () => {
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
