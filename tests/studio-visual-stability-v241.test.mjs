import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-visual-stability-v241.js");
const css = read("src/studio-visual-stability-v241.css");
const finalCss = read("src/studio-visual-stability-v241-final.css");
const studio = read("src/StudioNext.jsx");
const themes = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");
const nara = read("src/NaraAssistant.jsx");
const analytics = read("src/studio-analytics-v41.js");
const auth = read("src/lib/supabase.js");
const release = JSON.parse(read("public/release-v241.json"));

test("v241 is loaded after v239/v240 as the final Studio authority", () => {
  const v240 = entry.indexOf('import "./studio-react-safe-v240.css"');
  const v241 = entry.indexOf('import "./studio-visual-stability-v241.js"');
  const final = entry.indexOf('import "./studio-visual-stability-v241-final.css"');
  assert.ok(v240 >= 0 && v241 > v240 && final > v241);
  assert.match(runtime, /studio-visual-stability-v241-20260803/);
});

test("all required sidebar menu items remain in the React source", () => {
  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    assert.ok(studio.includes(label), `missing sidebar item ${label}`);
  }
  assert.match(css, /--v241-side-open:248px/);
  assert.match(css, /--v241-side-closed:70px/);
  assert.match(css, /data-v238-family="large"/);
  assert.match(css, /data-v238-family="small"/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed\+\.sn-main/);
});

test("top-right profile has five real actions and Profile stays separate from Settings", () => {
  for (const action of ["profile", "settings", "add-site", "view-site", "logout"]) {
    assert.match(runtime, new RegExp(`data-action=\\"${action}\\"`));
  }
  assert.match(runtime, /openProfile\(avatar\)/);
  assert.match(runtime, /sn-account-settings-v135/);
  assert.match(runtime, /sn-account-logout-v135/);
  assert.match(css, /\.v241-account-menu/);
  assert.deepEqual(release.account.fiveActions, ["profile", "settings", "add-site", "view-site", "logout"]);
});

test("Domain mobile actions are horizontal full-width controls rather than vertical pills", () => {
  assert.match(css, /data-v238-family="small"[\s\S]*\.sv124-free-domain>aside/);
  assert.match(css, /writing-mode:horizontal-tb!important/);
  assert.match(css, /\.sv124-free-domain>aside>\*[\s\S]*width:100%!important/);
  assert.match(css, /\.sv124-free-domain>aside>\*[\s\S]*min-height:47px!important/);
  assert.match(finalCss, /data-v238-family="large"[\s\S]*\.sv124-free-domain/);
});

test("100 themes and 26 real widgets including custom HTML JavaScript stay connected", () => {
  const familyCount = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositionCount = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  const widgetCount = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(familyCount, 20);
  assert.equal(compositionCount, 5);
  assert.equal(familyCount * compositionCount, 100);
  assert.equal(widgetCount, 26);
  assert.match(themes, /FAMILIES\.flatMap/);
  assert.match(widgets, /id: "custom-html"/);
  assert.match(runtime, /BUILT_IN_WIDGETS/);
  assert.match(runtime, /LAYOUT_AREAS/);
  assert.match(runtime, /configureWidget/);
  assert.equal(release.themeSystem.themeCount, 100);
  assert.equal(release.themeSystem.widgetCount, 26);
});

test("layout map keeps four left slots, centered content, four right slots with a compact picker", () => {
  const v240 = read("src/studio-react-safe-v240.js");
  for (const marker of ["Widget kiri 1", "Widget kiri 4", "Konten utama", "Widget kanan 1", "Widget kanan 4"]) assert.match(v240, new RegExp(marker));
  assert.match(runtime, /v241-widget-picker/);
  assert.match(runtime, /custom-html/);
  assert.match(css, /\.v241-widget-picker/);
  assert.match(css, /\.tn-layout-canvas\[data-v240-shadow-map\]/);
  assert.equal(release.themeSystem.layout.leftWidgets, 4);
  assert.equal(release.themeSystem.layout.rightWidgets, 4);
});

test("theme code workspace has HTML CSS JavaScript, actual line numbers, and device-specific split", () => {
  const themeStudio = read("src/ThemeStudio.jsx");
  for (const tab of ["HTML", "CSS", "JavaScript"]) assert.ok(themeStudio.includes(tab));
  assert.match(read("src/studio-react-safe-v240.js"), /Math\.min\(10000/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /textarea\[data-v240-line-numbers="true"\]/);
  assert.equal(release.themeSystem.lineNumbers.maximum, 10000);
});

test("Nara attachment plus uses the real camera photo and file inputs in every family", () => {
  for (const marker of ["cameraInput", "imageInput", "fileInput", "intelligenceOptions", "modelOptions"]) assert.match(nara, new RegExp(marker));
  assert.match(runtime, /openAttachmentPortal/);
  assert.match(runtime, /data-kind="camera"/);
  assert.match(runtime, /data-kind="photo"/);
  assert.match(runtime, /data-kind="file"/);
  assert.match(css, /\.v241-nara-attachment-portal/);
  assert.match(css, /data-v241-nara-mode="nonmodal"/);
  assert.match(css, /data-nara-size="small"/);
  assert.match(css, /data-nara-size="medium"/);
  assert.match(css, /data-nara-size="full"/);
});

test("analytics uses production RPC and v241 only enlarges presentation, never invents production numbers", () => {
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.match(runtime, /loadAnalytics\(view, 30, false\)/);
  assert.match(css, /\.op41-line[\s\S]*min-height:310px!important/);
  assert.match(css, /\.op41-donut[\s\S]*190px!important/);
  assert.equal(release.analytics.fakeProductionNumbers, false);
});

test("auth persistence is preserved and v241 adds no destructive session action", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.equal(release.auth.automaticLogoutAdded, false);
  assert.equal(release.auth.providerEndToEndClaim, false);
});
