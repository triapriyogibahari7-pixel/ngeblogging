import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-native-polish-v284.js");
const css = read("src/studio-native-polish-v284.css");
const studio = read("src/StudioNext.jsx");
const modes = read("src/studio-device-mode-v140.js");
const nara = read("src/NaraAssistant.jsx");
const themes = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");
const layout = read("src/studio-theme-layout-v264.js");
const analytics = read("src/studio-analytics-v41.js");
const auth = read("src/lib/supabase.js");
const release = read("public/release-v284.json");
const activeImports = new Set(entry.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("import ")));

const requiredMenu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v284 is the active final Studio shell and retires the blocking v283 runtime", () => {
  assert.ok(activeImports.has('import "./studio-native-polish-v284.js";'));
  assert.ok(activeImports.has('import "./studio-native-polish-v284.css";'));
  assert.ok(!activeImports.has('import "./studio-native-recovery-v283.js";'));
  assert.ok(entry.indexOf('import "./studio-native-polish-v284.css";') > entry.indexOf('import "./studio-native-polish-v284.js";'));
  assert.match(runtime, /studio-native-polish-v284-20260805/);
  assert.doesNotMatch(runtime, /window\.addEventListener\("click"/);
  assert.doesNotMatch(runtime, /stopImmediatePropagation/);
  assert.doesNotMatch(runtime, /new MutationObserver/);
  assert.doesNotMatch(runtime, /document\.addEventListener\("input"/);
  assert.doesNotMatch(runtime, /setInterval\s*\(/);
});

test("single internal n keeps the complete sidebar available in six responsive families", () => {
  for (const label of requiredMenu) assert.ok(studio.includes(label), `missing sidebar item ${label}`);
  for (const mode of ["application","phone","mobile","compact","tablet","desktop"]) assert.ok(modes.includes(`"${mode}"`));
  assert.match(runtime, /mark\.addEventListener\("click", onLogoClick\)/);
  assert.match(runtime, /reactToggle\(\)\?\.click\(\)/);
  assert.match(css, /data-device-mode="large"[\s\S]*#ngeblogging-studio-sidebar\.collapsed/);
  assert.match(css, /data-device-mode="small"[\s\S]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /data-device-mode="small"[\s\S]*#ngeblogging-studio-sidebar\.mobile-open/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background:transparent!important/);
  assert.match(css, /\.sn-mobile-nav,.sn-mobile-sheet-layer\{display:none!important/);
  assert.match(runtime, /SIDEBAR_STORAGE_KEY/);
});

test("mobile and desktop typography are readable and main surfaces cannot overflow", () => {
  assert.match(css, /\.sn-shell\{font-size:14px!important/);
  assert.match(css, /nav>button[\s\S]*font-size:13px!important/);
  assert.match(css, /\.sn-page-title p[\s\S]*font-size:13px!important/);
  assert.match(css, /html,body\{overflow-x:hidden!important/);
  assert.match(css, /min-width:0!important;max-width:100%!important/);
  assert.match(css, /data-studio-desktop-site-phone="true"[\s\S]*font-size:15px!important/);
});

test("profile and Nara remain visible without blocking the website in small and medium", () => {
  assert.match(studio, /className="sn-avatar"/);
  assert.match(css, /\.sn-main>\.sn-top \.sn-avatar[\s\S]*visibility:visible!important/);
  assert.match(css, /\.sn-profile-menu-v150[\s\S]*position:fixed!important/);
  assert.match(css, /\.nara-floating-button\{position:fixed!important;right:/);
  assert.match(css, /data-nara-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="small"\][\s\S]*430px/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="medium"\][\s\S]*720px/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 9px\)!important/);
  for (const marker of ["cameraInput.current?.click()","imageInput.current?.click()","fileInput.current?.click()","SpeechRecognition","speechSynthesis","model: requestModel","intelligence: requestIntelligence"]) assert.ok(nara.includes(marker));
  for (const label of ["Nara Mini","Nara Writer","Nara Vision","Nara Max","Instan","Sedang","Tinggi","Maksimal"]) assert.ok(nara.includes(label));
});

test("Theme Studio preserves 100 themes, 26 widgets, interactive map and responsive code editor", () => {
  const families = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal([...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length, 26);
  for (const area of ["sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4","sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4"]) assert.ok(layout.includes(area));
  assert.match(layout, /tn-layout-popover-v264/);
  assert.match(layout, /Edit HTML \/ CSS \/ JavaScript/);
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(runtime, /function lineNumberText/);
  assert.match(css, /data-device-mode="large"[\s\S]*grid-template-areas:"code preview"!important/);
  assert.match(css, /data-device-mode="small"[\s\S]*grid-template-areas:"preview" "code"!important/);
  assert.match(css, /\.v284-code-lines[\s\S]*position:absolute!important/);
  assert.match(css, /\.tn-layout-map-v264\{width:660px!important/);
});

test("production analytics, auth persistence, word limit and product data remain real", () => {
  assert.match(runtime, /loadAnalytics\(view, 30, false\)/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(css, /\.op41-line\{min-height:360px!important/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(read("src/studio-native-controls-v281.js"), /MAX_CONTENT_WORDS = 5000/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/);
});

test("v284 release states verifiable deployment requirements without unsupported scale claims", () => {
  assert.match(release, /studio-native-polish-v284-20260805/);
  assert.match(release, /studio-native-polish-cache-v284/);
  assert.match(release, /"builtInThemes": 100/);
  assert.match(release, /"widgets": 26/);
  assert.match(release, /"nineHundredMillionOrBillionLoginSimulationClaimed": false/);
  assert.match(release, /"realDeviceRequiredBeforeHundredPercentClaim": true/);
});
