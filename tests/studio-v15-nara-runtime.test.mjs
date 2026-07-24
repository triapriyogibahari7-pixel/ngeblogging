import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const mobileCss = `${read("src/studio-mobile-v15.css")}\n${read("src/studio-mobile-v16.css")}`;
const sidebarRuntime = read("src/studio-sidebar-v15.js");
const commandCenter = read("src/nara-command-center-bridge.js");

test("final mobile and Nara authorities load in deterministic order", () => {
  const v14 = index.indexOf("studio-v14-authority.css");
  const v15 = index.indexOf("studio-mobile-v15.css");
  const nara = index.indexOf("nara-interaction-authority.css");
  const v16 = index.indexOf("studio-mobile-v16.css");
  assert.ok(v14 > -1, "Studio v14 authority must load");
  assert.ok(v15 > v14, "Studio v15 mobile authority must load after v14");
  assert.ok(nara > v15, "Nara interaction authority must load after v15");
  assert.ok(v16 > nara, "Studio v16 repair must own the final layout authority");
  assert.match(index, /studio-sidebar-v15\.js/);
});

test("phones use one real edge control and start on the icon rail", () => {
  assert.match(sidebarRuntime, /v15InitialSidebarResolved/);
  assert.match(sidebarRuntime, /if \(!side\.classList\.contains\("collapsed"\)\)[\s\S]*original\.click\(\)/);
  assert.match(sidebarRuntime, /edge\.className = "sn-sidebar-edge-v15"/);
  assert.match(sidebarRuntime, /dataset\.sidebarAuthority = "single-v15"/);
  assert.match(sidebarRuntime, /duplicateEdges\.slice\(1\)/);
  assert.match(mobileCss, /\[data-v15-original-toggle="true"\][\s\S]*display: none !important/);
  assert.match(mobileCss, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-phone-rail\) !important/);
  assert.match(sidebarRuntime, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
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
  assert.match(mobileCss, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(mobileCss, /\.nara-assistant-layer[\s\S]*inset: 0 !important/);
});

test("Tata Letak opens the real theme customizer instead of a duplicate surface", () => {
  assert.match(sidebarRuntime, /data-layout-route-v16/);
  assert.match(sidebarRuntime, /Tata Letak/);
  assert.match(sidebarRuntime, /currentTheme\.click\(\)/);
  assert.match(sidebarRuntime, /\.tn-hero-actions button, \.tn-command button/);
  assert.match(sidebarRuntime, /sesuaikan/i);
});
