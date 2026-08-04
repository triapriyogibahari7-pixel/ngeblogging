import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const runtime = read("src/studio-completion-v266.js");
const css = read("src/studio-completion-v266.css");
const theme = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const analytics = read("src/studio-analytics-v41.js");
const sw = read("public/sw.js");

test("v266 loads strictly after screenshot authority v265", () => {
  const v265 = studio.indexOf('import "./studio-screenshot-authority-v265.css";');
  const runtime266 = studio.indexOf('import "./studio-completion-v266.js";');
  const css266 = studio.indexOf('import "./studio-completion-v266.css";');
  assert.ok(v265 >= 0);
  assert.ok(runtime266 > v265);
  assert.ok(css266 > runtime266);
});

test("desktop sidebar collapsed state persists without affecting small-family drawer", () => {
  assert.match(runtime, /SIDEBAR_KEY/);
  assert.match(runtime, /localStorage\.getItem/);
  assert.match(runtime, /localStorage\.setItem/);
  assert.match(runtime, /smallFamily\(\)/);
  assert.match(runtime, /side\.classList\.contains\("collapsed"\)/);
});

test("Analytics uses the real production loader first and keeps explicit simulation labeling", () => {
  assert.match(runtime, /loadAnalytics\(view, 30, false\)/);
  assert.match(analytics, /DATA PRODUKSI NYATA/);
  assert.match(analytics, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.doesNotMatch(runtime, /simulationDashboard|Math\.random/);
  assert.match(css, /\.op41-line/);
  assert.match(css, /\.op41-donut/);
});

test("Theme editor keeps eight preview profiles and responsive 50:50 code plus centered preview", () => {
  for (const label of ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Laptop", "Situs desktop", "Komputer"]) {
    assert.ok(theme.includes(label), `missing Theme preview profile ${label}`);
  }
  assert.match(css, /html\[data-studio-device-mode="large"\] \.tn-code-workspace/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /html\[data-studio-device-mode="small"\] \.tn-code-workspace/);
  assert.match(css, /ui-monospace/);
  assert.match(css, /\.tn-layout-map-v264/);
});

test("Nara attachment, microphone, model and intelligence capabilities remain present while controls are contained", () => {
  for (const marker of ["Camera", "ImageIcon", "Mic", "SpeakerIcon", "intelligenceOptions", "modelOptions"]) {
    assert.ok(nara.includes(marker), `missing Nara marker ${marker}`);
  }
  assert.match(css, /\.nara-composer-tools/);
  assert.match(css, /grid-template-columns:40px 40px/);
});

test("Domain mobile actions remain full width and readable", () => {
  assert.match(css, /\.sv124-free-domain>aside/);
  assert.match(css, /width:100%!important/);
  assert.match(css, /writing-mode:horizontal-tb!important/);
});

test("service worker rotates v266 cache and never navigates auth surfaces during activation", () => {
  assert.match(sw, /ngeblogging-app-v266-studio-completion-20260804/);
  assert.match(sw, /studio-completion-cache-v266/);
  assert.match(sw, /studioCompletionReleaseV266/);
  assert.match(sw, /if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return/);
  assert.match(sw, /reloadRequired: false/);
  assert.doesNotMatch(sw.match(/async function notifyOpenWindows\([\s\S]*?\n\}/)?.[0] || "", /client\.navigate/);
});
