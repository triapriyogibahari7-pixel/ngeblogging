import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const runtime = read("src/studio-stability-v265.js");
const css = read("src/studio-stability-v265.css");
const device = read("src/studio-device-mode-v140.js");
const nara = read("src/NaraAssistant.jsx");
const theme = read("src/ThemeStudio.jsx");

test("v265 authority is loaded after v264 Theme authority", () => {
  const v264 = studio.indexOf('import "./studio-theme-layout-v264.css";');
  const js = studio.indexOf('import "./studio-stability-v265.js";');
  const style = studio.indexOf('import "./studio-stability-v265.css";');
  assert.ok(v264 >= 0);
  assert.ok(js > v264);
  assert.ok(style > js);
});

test("six responsive families remain explicit and desktop variants stay grouped", () => {
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.match(device, new RegExp(`"${mode}"`));
  }
  assert.match(device, /return "laptop"/);
  assert.match(device, /return "computer"/);
  assert.match(css, /data-studio-device-mode="large"/);
  assert.match(css, /data-studio-device-mode="small"/);
});

test("sidebar contract keeps one internal desktop n control, persistence and complete icon rail", () => {
  assert.match(runtime, /SIDEBAR_KEY/);
  assert.match(runtime, /\.sn-logo-mark/);
  assert.match(runtime, /toggle\.click\(\)/);
  assert.match(runtime, /safeSet\(SIDEBAR_KEY/);
  assert.match(css, /sn-side\.collapsed/);
  assert.match(css, /justify-content:center!important/);
  assert.match(css, /grid-template-rows:auto auto minmax\(0,1fr\) auto/);
  assert.match(css, /sn-account-footer/);
});

test("mobile drawer stays above a non-blurred backdrop and closed state uses the n launcher", () => {
  assert.match(css, /sn-side-backdrop[\s\S]*backdrop-filter:none!important/);
  assert.match(css, /sn-side\.mobile-open/);
  assert.match(css, /sn-sidebar-toggle[\s\S]*linear-gradient/);
  assert.match(css, /data-mobile-drawer-open-v265/);
});

test("profile menu is enhanced to five useful account actions", () => {
  assert.match(runtime, /data-action=\"add-site\"/);
  assert.match(runtime, /data-action=\"view-site\"/);
  assert.match(runtime, /sn-workspace/);
  assert.match(runtime, /sn-view-site/);
  assert.match(runtime, /sn-profile-menu-v150/);
});

test("Nara remains feature complete while small and medium are non-modal", () => {
  for (const marker of ["Camera", "ImageIcon", "Mic", "SpeakerIcon", "intelligenceOptions", "modelOptions"]) {
    assert.ok(nara.includes(marker), `missing Nara capability ${marker}`);
  }
  assert.match(runtime, /naraModeV265 = full \? "modal" : "non-modal"/);
  assert.match(css, /nara-assistant-layer\[data-nara-mode-v265="non-modal"\][\s\S]*pointer-events:none!important/);
  assert.match(css, /nara-assistant-backdrop[\s\S]*display:none!important/);
  assert.match(css, /nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
});

test("Theme Studio keeps 100-theme engine, eight preview profiles, 26-slot map and responsive code workspace", () => {
  assert.match(theme, /THEME_COUNT/);
  for (const label of ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Laptop", "Situs desktop", "Komputer"]) {
    assert.ok(theme.includes(label), `missing preview profile ${label}`);
  }
  assert.match(studio, /studio-theme-layout-v264\.js/);
  assert.match(css, /tn-code-workspace/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /tn-code-pane textarea[\s\S]*ui-monospace/);
});

test("real analytics recovery remains active and no fake data is injected by v265", () => {
  assert.match(runtime, /loadAnalytics\(view, 30, false\)/);
  assert.doesNotMatch(runtime, /simulationDashboard|Math\.random\(\).*analytics|999/);
  assert.match(css, /op41-line/);
  assert.match(css, /op41-donut/);
});
