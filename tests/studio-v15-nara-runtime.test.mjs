import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const mobileCss = `${read("src/studio-mobile-v15.css")}\n${read("src/studio-mobile-v16.css")}\n${read("src/studio-mobile-v17.css")}`;
const sidebarRuntime = read("src/studio-sidebar-v15.js");
const commandCenter = read("src/nara-command-center-bridge.js");

test("final mobile and Nara authorities load in deterministic order", () => {
  const v14 = index.indexOf("studio-v14-authority.css");
  const v15 = index.indexOf("studio-mobile-v15.css");
  const nara = index.indexOf("nara-interaction-authority.css");
  const v16 = index.indexOf("studio-mobile-v16.css");
  const v17 = index.indexOf("studio-mobile-v17.css");
  assert.ok(v14 > -1, "Studio v14 authority must load");
  assert.ok(v15 > v14, "Studio v15 mobile authority must load after v14");
  assert.ok(nara > v15, "Nara interaction authority must load after v15");
  assert.ok(v16 > nara, "Studio v16 repair must load after Nara authority");
  assert.ok(v17 > v16, "Studio v17 repair must own the final layout authority");
  assert.match(index, /studio-sidebar-v15\.js/);
});

test("phones use the original React toggle as the single edge control", () => {
  assert.match(sidebarRuntime, /v17InitialSidebarResolved/);
  assert.match(sidebarRuntime, /if \(!side\.classList\.contains\("collapsed"\)\)[\s\S]*original\.click\(\)/);
  assert.match(sidebarRuntime, /querySelectorAll\(":scope > \.sn-sidebar-edge-v15"\)\.forEach/);
  assert.match(sidebarRuntime, /original\.dataset\.sidebarAuthority = "single-v17"/);
  assert.match(sidebarRuntime, /original\.classList\.add\("sn-sidebar-edge-owner-v17"\)/);
  assert.match(mobileCss, /html \.sn-sidebar-edge-v15[\s\S]*display: none !important/);
  assert.match(mobileCss, /\.sn-icon\.sn-sidebar-edge-owner-v17[\s\S]*position: fixed !important/);
  assert.match(mobileCss, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-phone-rail\) !important/);
  assert.match(sidebarRuntime, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
});

test("sidebar synchronization is idempotent and does not rewrite its own child tree", () => {
  assert.doesNotMatch(sidebarRuntime, /edge\.innerHTML/);
  assert.doesNotMatch(sidebarRuntime, /panelIcon\(/);
  assert.match(sidebarRuntime, /MutationObserver\(\(mutations\)/);
  assert.match(sidebarRuntime, /mutation\.addedNodes\.length \|\| mutation\.removedNodes\.length/);
  assert.match(sidebarRuntime, /cancelAnimationFrame\(frame\)/);
});

test("Nara is absent from the visible menu but its complete workspace remains callable", () => {
  assert.match(sidebarRuntime, /textLabel\(button\) !== "Nara AI"/);
  assert.match(sidebarRuntime, /button\.hidden = true;[\s\S]*button\.disabled = false;/);
  assert.match(sidebarRuntime, /button\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(commandCenter, /route\.click\(\)/);
  for (const capability of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector"]) {
    assert.ok(commandCenter.includes(capability), capability);
  }
});

test("Nara launchers use native React clicks and remain touchable non-submit controls", () => {
  assert.match(sidebarRuntime, /\.nara-floating-button/);
  assert.match(sidebarRuntime, /button\.type = "button"/);
  assert.match(sidebarRuntime, /button\.hidden = false/);
  assert.match(sidebarRuntime, /button\.disabled = false/);
  assert.doesNotMatch(sidebarRuntime, /addEventListener\("pointerdown"/);
  assert.doesNotMatch(sidebarRuntime, /document\.addEventListener\("click"/);
  assert.match(mobileCss, /\.nara-floating-button \*[\s\S]*pointer-events: auto !important/);
  assert.match(mobileCss, /\.nara-assistant-layer[\s\S]*inset: 0 !important/);
});

test("Tata Letak opens the real theme customizer instead of a duplicate surface", () => {
  assert.match(sidebarRuntime, /data-layout-route-v17/);
  assert.match(sidebarRuntime, /Tata Letak/);
  assert.match(sidebarRuntime, /currentTheme\.click\(\)/);
  assert.match(sidebarRuntime, /\.tn-hero-actions button, \.tn-command button/);
  assert.match(sidebarRuntime, /sesuaikan/i);
});

test("the editor receives physical-phone scaling and stacked mobile panels", () => {
  assert.match(mobileCss, /data-desktop-site-phone="true"[\s\S]*\.ce-app[\s\S]*--sn-physical-layout-width/);
  assert.match(mobileCss, /\.ce-workspace[\s\S]*display: block !important/);
  assert.match(mobileCss, /\.ce-sidebar[\s\S]*position: static !important/);
});
