import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const mobileCss = `${read("src/studio-mobile-v15.css")}\n${read("src/studio-mobile-v16.css")}\n${read("src/studio-mobile-v17.css")}\n${read("src/studio-mobile-v18.css")}`;
const sidebarRuntime = read("src/studio-sidebar-v15.js");
const launcherRuntime = read("src/nara-launcher-v18.js");
const commandCenter = read("src/nara-command-center-bridge.js");

test("v18 is the final deterministic authority", () => {
  const v17 = index.indexOf("studio-mobile-v17.css");
  const v18 = index.indexOf("studio-mobile-v18.css");
  assert.ok(v17 > -1);
  assert.ok(v18 > v17);
  assert.match(index, /studio-sidebar-v15\.js/);
  assert.match(index, /nara-launcher-v18\.js/);
});

test("desktop site on a phone is not treated as mobile", () => {
  const pwa = read("src/pwa-runtime.js");
  assert.match(pwa, /desktopSitePhone/);
  assert.match(pwa, /if \(!desktopSitePhone && shortSide <= 760\) mode = "mobile"/);
  assert.match(sidebarRuntime, /const mobile = !desktopSitePhone/);
  assert.match(mobileCss, /data-desktop-site-phone="true"[\s\S]*min-width: 980px !important/);
  assert.match(mobileCss, /data-desktop-site-phone="true"[\s\S]*\.ce-workspace[\s\S]*grid-template-columns: minmax\(0,1fr\) 350px !important/);
});

test("phones use one original React sidebar toggle", () => {
  assert.match(sidebarRuntime, /v18InitialSidebarResolved/);
  assert.match(sidebarRuntime, /querySelectorAll\(":scope > \.sn-sidebar-edge-v15"\)\.forEach/);
  assert.match(sidebarRuntime, /original\.dataset\.sidebarAuthority = "single-v18"/);
  assert.match(sidebarRuntime, /sn-sidebar-edge-owner-v18/);
  assert.match(mobileCss, /html \.sn-sidebar-edge-v15[\s\S]*display: none !important/);
  assert.match(sidebarRuntime, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
});

test("Nara body proxy cannot be blocked by Studio scrims", () => {
  assert.match(launcherRuntime, /document\.body\.append\(proxy\)/);
  assert.match(launcherRuntime, /original\.click\(\)/);
  assert.match(launcherRuntime, /closeSidebarBeforeNara/);
  assert.match(mobileCss, /\.nara-floating-proxy-v18[\s\S]*z-index: 2147483646 !important/);
  assert.match(mobileCss, /\.nara-floating-proxy-v18[\s\S]*pointer-events: auto !important/);
  assert.match(mobileCss, /\.nara-assistant-layer[\s\S]*z-index: 2147483645 !important/);
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
  assert.match(sidebarRuntime, /data-layout-route-v18/);
  assert.match(sidebarRuntime, /Tata Letak/);
  assert.match(sidebarRuntime, /currentTheme\.click\(\)/);
  assert.match(sidebarRuntime, /sesuaikan/i);
});
