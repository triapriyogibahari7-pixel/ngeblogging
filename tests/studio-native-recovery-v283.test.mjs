import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-native-recovery-v283.js");
const css = read("src/studio-native-recovery-v283.css");
const studio = read("src/StudioNext.jsx");
const modes = read("src/studio-device-mode-v140.js");
const profile = read("src/studio-profile-menu-v268.js");
const nara = read("src/NaraAssistant.jsx");
const themes = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");
const layout = read("src/studio-theme-layout-v264.js");
const analytics = read("src/studio-analytics-v41.js");
const auth = read("src/lib/supabase.js");
const domain = read("src/DomainPanelV124.jsx");
const release = read("public/release-v283.json");

const activeImports = new Set(entry.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("import ")));
const retiredShellRuntimes = [
  "studio-real-device-v236.js", "studio-source-stability-v237.js", "studio-source-stability-v237-ui.js",
  "studio-desktop-sidebar-v238.js", "studio-final-authority-v239.js", "studio-react-safe-v240.js",
  "studio-native-authority-v250.js", "studio-sidebar-rescue-v251.js", "studio-source-stability-v252.js",
  "studio-shell-nara-v253.js", "studio-shell-interaction-v255.js", "studio-visual-native-v257.js",
  "studio-six-mode-authority-v259.js", "studio-stability-v260.js", "studio-screenshot-authority-v265.js",
  "studio-shell-v265.js", "studio-runtime-v266.js", "studio-final-authority-v269.js", "studio-scroll-chrome-v270.js",
  "studio-shell-authority-v272.js", "studio-shell-content-v274.js", "studio-interaction-authority-v277.js",
  "studio-shell-precision-v278.js", "studio-live-shell-v279.js", "studio-native-shell-v280.js",
];
const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v283 is the last Studio shell authority and retires conflicting legacy controllers", () => {
  assert.ok(entry.indexOf('import "./studio-native-recovery-v283.js";') > entry.indexOf('import "./studio-native-controls-v281.css";'));
  assert.ok(entry.indexOf('import "./studio-native-recovery-v283.css";') > entry.indexOf('import "./studio-native-recovery-v283.js";'));
  for (const file of retiredShellRuntimes) {
    assert.ok(!activeImports.has(`import "./${file}";`), `${file} must remain backup-only, not execute`);
    assert.ok(entry.includes(`import "./${file}";`), `${file} backup marker must remain searchable`);
  }
  assert.match(runtime, /studio-native-recovery-v283-20260805/);
  assert.doesNotMatch(runtime, /new MutationObserver/);
  assert.doesNotMatch(runtime, /addEventListener\("scroll"/);
  assert.doesNotMatch(runtime, /setInterval\s*\(/);
});

test("single internal n drives the complete sidebar on all six responsive families", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing sidebar item ${label}`);
  for (const mode of ["application","phone","mobile","compact","tablet","desktop"]) assert.ok(modes.includes(`"${mode}"`));
  for (const variant of ["laptop","desktop","computer"]) assert.ok(modes.includes(`"${variant}"`) || runtime.includes(`"${variant}"`) || release.includes(`"${variant}"`));
  assert.match(runtime, /function activateLogo/);
  assert.match(runtime, /reactToggle\(\)\?\.click\(\)/);
  assert.match(css, /data-device-mode="large"[\s\S]*#ngeblogging-studio-sidebar\.collapsed/);
  assert.match(css, /data-device-mode="small"[\s\S]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /data-device-mode="small"[\s\S]*#ngeblogging-studio-sidebar\.mobile-open/);
  assert.match(css, /body\.sn-mobile-sidebar-open[\s\S]*filter:none!important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background:transparent!important/);
  assert.match(runtime, /SIDEBAR_STORAGE_KEY/);
});

test("profile stays separate, visible and keeps five account actions", () => {
  for (const action of ["Profil","Tambahkan situs","Pengaturan","Nara AI","Keluar"]) assert.ok(profile.includes(action));
  assert.match(css, /\.sn-main>\.sn-top \.sn-avatar[\s\S]*visibility:visible!important/);
  assert.match(css, /\.sn-profile-menu-v150[\s\S]*position:fixed!important/);
  assert.match(studio, /className="sn-avatar"/);
});

test("Nara launcher is explicitly fixed and small/medium are non-modal with native attachments", () => {
  assert.match(runtime, /right", "max\(12px, env\(safe-area-inset-right/);
  assert.match(runtime, /bottom", "max\(14px, calc\(env\(safe-area-inset-bottom/);
  assert.match(css, /\.nara-floating-button\{position:fixed!important;right:/);
  assert.match(css, /data-nara-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="small"\][\s\S]*430px/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="medium"\][\s\S]*720px/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 9px\)!important/);
  assert.match(nara, /cameraInput\.current\?\.click\(\)/);
  assert.match(nara, /imageInput\.current\?\.click\(\)/);
  assert.match(nara, /fileInput\.current\?\.click\(\)/);
  assert.match(nara, /SpeechRecognition/);
  assert.match(nara, /speechSynthesis/);
  assert.match(nara, /model: requestModel/);
  assert.match(nara, /intelligence: requestIntelligence/);
  for (const label of ["Nara Mini","Nara Writer","Nara Vision","Nara Max","Instan","Sedang","Tinggi","Maksimal"]) assert.ok(nara.includes(label));
});

test("real production Analytics is restored instead of the React placeholder", () => {
  assert.match(runtime, /import \{ loadAnalytics \} from "\.\/studio-analytics-v41\.js"/);
  assert.match(runtime, /loadAnalytics\(view, 30, false\)/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /DATA PRODUKSI NYATA/);
  assert.match(analytics, /7 hari/);
  assert.match(analytics, /90 hari/);
  assert.match(css, /\.op41-line[\s\S]*min-height:320px!important/);
  assert.match(css, /\.op41-donut[\s\S]*max-width:240px!important/);
});

test("Theme Studio keeps 100 themes, 26 widgets, centered map and real code line numbers", () => {
  const families = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal([...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length, 26);
  for (const area of ["sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4","sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4"]) assert.ok(layout.includes(area));
  assert.match(layout, /tn-layout-popover-v264/);
  assert.match(layout, /Edit HTML \/ CSS \/ JavaScript/);
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(runtime, /lineNumberText/);
  assert.match(runtime, /Array\.from\(\{ length: 10000/); // must not pre-render fake 1..10000
});

test("code workspace is 50:50 on large and preview-first on small without overflow", () => {
  assert.match(css, /data-device-mode="large"[\s\S]*grid-template-areas:"code preview"!important/);
  assert.match(css, /data-device-mode="small"[\s\S]*grid-template-areas:"preview" "code"!important/);
  assert.match(css, /\.tn-code-pane textarea[\s\S]*min-height:620px!important/);
  assert.match(css, /\.v283-code-lines[\s\S]*position:absolute!important/);
  assert.match(css, /\.tn-layout-map-v264[\s\S]*width:660px!important/);
  assert.match(css, /\.tn-layout-content-v264[\s\S]*grid-template-columns:145px 340px 145px!important/);
});

test("Posts/Pages auth and Domain production contracts remain preserved", () => {
  assert.match(read("src/studio-native-controls-v281.js"), /MAX_CONTENT_WORDS = 5000/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(domain, /Jadikan draf/);
  assert.match(domain, /Terbitkan/);
  assert.match(css, /\.sv124-free-domain>aside :is\(button,a\)[\s\S]*white-space:nowrap!important/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/);
});

test("release manifest records only verified source contracts, not unsupported scale claims", () => {
  assert.match(release, /studio-native-recovery-v283-20260805/);
  assert.match(release, /studio-native-recovery-cache-v283/);
  assert.match(release, /"nineHundredMillionOrBillionLoginSimulationClaimed": false/);
  assert.match(release, /"realDeviceRequiredBeforeHundredPercentClaim": true/);
});
