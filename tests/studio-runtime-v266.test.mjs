import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const runtime = read("src/studio-runtime-v266.js");
const analytics = read("src/studio-analytics-v41.js");
const shell = read("src/studio-shell-v265.js");
const shellCss = read("src/studio-shell-v265.css");
const hotfix = read("src/studio-shell-v265-final-hotfix.css");
const editorNav = read("src/studio-editor-navigation-v266.js");
const nara = read("src/NaraAssistant.jsx");
const theme = read("src/ThemeStudio.jsx");

test("v266 production runtime loads after final shell and editor navigation", () => {
  const finalV265 = studio.indexOf('import "./studio-shell-v265-final-hotfix.css";');
  const editorV266 = studio.indexOf('import "./studio-editor-navigation-v266.css";');
  const runtimeV266 = studio.indexOf('import "./studio-runtime-v266.js";');
  assert.ok(finalV265 >= 0);
  assert.ok(editorV266 > finalV265);
  assert.ok(runtimeV266 > editorV266);
});

test("Studio and editor sidebar states persist without forcing small-family desktop state", () => {
  assert.match(runtime, /SIDEBAR_KEY/);
  assert.match(runtime, /localStorage\.getItem/);
  assert.match(runtime, /localStorage\.setItem/);
  assert.match(runtime, /studio-v265-small/);
  assert.match(editorNav, /STORAGE_KEY/);
  assert.match(shell, /studio-v265-large/);
  assert.match(shell, /studio-v265-small/);
});

test("Analytics is restored with real production RPC first", () => {
  assert.match(runtime, /loadAnalytics\(view, 30, false\)/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /DATA PRODUKSI NYATA/);
  assert.match(analytics, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.doesNotMatch(runtime, /simulationDashboard|Math\.random/);
});

test("Theme Studio keeps eight profiles, 26-slot map, 50:50 large code workspace and 10k gutter", () => {
  for (const label of ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Laptop", "Situs desktop", "Komputer"]) {
    assert.ok(theme.includes(label), `missing Theme profile ${label}`);
  }
  assert.match(shell, /lineCount/);
  assert.match(shell, /10_000/);
  assert.match(shellCss, /\.tn-code-gutter-v265/);
  assert.match(shellCss, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(hotfix, /\.tn-layout-map-v264/);
});

test("Nara keeps attachment camera photo microphone speaker model intelligence and nonmodal state", () => {
  for (const marker of ["Camera", "ImageIcon", "Mic", "SpeakerIcon", "intelligenceOptions", "modelOptions"]) {
    assert.ok(nara.includes(marker), `missing Nara marker ${marker}`);
  }
  assert.match(shell, /naraV265Interaction/);
  assert.match(hotfix, /nara-attachment-menu/);
  assert.match(hotfix, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(runtime, /preserveNonModalNara/);
});
