import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const widgets = read("src/widget-system.js");
const themeSystem = read("src/theme-system.js");
const themeStudio = read("src/ThemeStudio.jsx");
const layoutRuntime = read("src/theme-layout-runtime-v170.js");
const layoutCss = read("src/theme-layout-v170.css");
const layoutV256 = read("src/studio-theme-layout-v256.css");
const entry = read("src/Studio.jsx");
const studio = read("src/StudioNext.jsx");
const pageAudit = read("src/studio-page-audit-v170.css");
const main = read("src/main.jsx");
const pwa = read("src/pwa-runtime.js");
const serviceWorker = read("public/sw.js");
const packageJson = JSON.parse(read("package.json"));

const AUTHORITY = "theme-layout-v170-20260730";
const AREAS = [
  "top-left-1", "top-left-2", "top-left-3", "top-right-1", "top-right-2", "top-right-3",
  "before-content", "sidebar-left-1", "sidebar-left-2", "sidebar-left-3",
  "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "after-content",
  "bottom-left-1", "bottom-left-2", "bottom-left-3", "bottom-right-1", "bottom-right-2", "bottom-right-3",
];
const v256Active = widgets.includes("SIDEBAR_LEFT_SLOTS")
  && widgets.includes('"sidebar-left-4"')
  && widgets.includes('"sidebar-right-4"')
  && entry.includes('import "./studio-theme-layout-v256.css"');

test("theme widget areas retain v170 compatibility or use the newer real v256 4+4 model", () => {
  if (v256Active) {
    for (let index = 1; index <= 4; index += 1) {
      assert.ok(widgets.includes(`"sidebar-left-${index}"`), `v256 missing left slot ${index}`);
      assert.ok(widgets.includes(`"sidebar-right-${index}"`), `v256 missing right slot ${index}`);
    }
    for (const legacy of ["header", "sidebar", "sidebar-left", "sidebar-right", "footer"]) {
      assert.ok(widgets.includes(legacy), `v256 migration missing ${legacy}`);
    }
    assert.match(widgets, /migrateLegacyArea/);
    assert.match(widgets, /SIDEBAR_RIGHT_SLOTS\[index % SIDEBAR_RIGHT_SLOTS\.length\]/);
    return;
  }

  assert.ok(widgets.includes(`WIDGET_LAYOUT_AUTHORITY = "${AUTHORITY}"`));
  for (const area of AREAS) assert.ok(widgets.includes(`id: "${area}"`), `missing area ${area}`);
  for (const legacy of ["header-left", "header-right", "below-header", "sidebar-left", "sidebar-right", "footer-left", "footer-right", "footer-wide", "sidebar", "footer"]) {
    assert.ok(widgets.includes(legacy), `legacy map missing ${legacy}`);
  }
  assert.ok(widgets.includes("LEGACY_AREA_MAP[requestedArea] || requestedArea"));
  assert.ok(widgets.includes("new Set([normalizedGroup])"));
  assert.ok(widgets.includes('"sidebar-right-1", "sidebar-right-2", "sidebar-left-1", "bottom-left-1"'));
});

test("Theme Studio keeps a detailed responsive map on every device preview", () => {
  for (const device of ["application", "phone", "mobile", "compact", "tablet", "laptop", "desktop", "computer"]) {
    assert.ok(themeStudio.includes(`id: "${device}"`), `preview missing ${device}`);
  }

  if (v256Active) {
    assert.match(layoutV256, /Post \/ Page\\A Konten utama/);
    for (const area of ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]) {
      assert.ok(layoutV256.includes(area), `v256 layout CSS missing ${area}`);
    }
    assert.ok(layoutV256.includes("@media(max-width:760px)"));
    assert.ok(layoutV256.includes("@media(max-width:380px)"));
    assert.ok(themeStudio.includes("WIDGET TERPILIH"));
    return;
  }

  for (const marker of [
    AUTHORITY, "theme-layout-v170.css", "LAYOUT_AREAS", "PETA TATA LETAK V170",
    "Enam widget atas, konten tiga kolom, dan enam widget bawah", "tn-layout-canvas-v170",
    "tn-widget-order-v170", "Naikkan ", "Turunkan ", "WIDGET TERPILIH",
  ]) assert.ok(themeStudio.includes(marker), `Theme Studio missing ${marker}`);
  for (const area of AREAS) assert.ok(layoutCss.includes(area), `layout CSS missing ${area}`);
  assert.ok(layoutCss.includes("@media(max-width:760px)"));
  assert.ok(layoutCss.includes("@media(max-width:390px)"));
});

test("theme preview renders widget placement instead of a decorative-only map", () => {
  if (v256Active) {
    for (const marker of [
      "composeMainWidgetLayout", 'widgetsMarkup(widgets, "sidebar-left")', 'widgetsMarkup(widgets, "sidebar-right")',
      'widgetsMarkup(widgets, "before-content")', 'widgetsMarkup(widgets, "after-content")',
      "ng-main-layout", "ng-main-content", "ng-widget-stack left", "ng-widget-stack right",
    ]) assert.ok(themeSystem.includes(marker), `v256 preview runtime missing ${marker}`);
    assert.ok(widgets.includes("data-layout-area"));
    return;
  }

  for (const marker of [
    "composeThemeLayoutV170", "THEME_LAYOUT_CSS_V170", "data-layout-area",
    "ng-content-grid-v170", "ng-main-content-v170", "top-grid", "bottom-grid",
    "sidebar-left", "sidebar-right", "before-content", "after-content",
  ]) assert.ok(layoutRuntime.includes(marker) || themeSystem.includes(marker), `preview runtime missing ${marker}`);
  assert.ok(themeSystem.includes('data-theme-layout-authority="theme-layout-v170-20260730"'));
  assert.ok(themeSystem.includes("layout.html"));
  assert.ok(themeSystem.includes("layout.css"));
});

test("every Studio sidebar page remains present and receives the global overflow contract", () => {
  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    assert.ok(studio.includes(`>${label}<`), `menu missing ${label}`);
  }
  for (const view of ["home", "posts", "pages", "themes", "media", "analytics", "members", "comments", "domain", "api-keys", "settings"]) {
    assert.ok(studio.includes(`view === "${view}"`), `view missing ${view}`);
  }
  for (const marker of [
    "studio-page-audit-v170-20260730", "min-width:0", "max-width:100%", "overflow-x:clip",
    "overflow-wrap:anywhere", "table-scroll", "sn-content-card", "tn-code-workspace",
    "@media(max-width:760px)", "@media(max-width:430px)",
  ]) assert.ok(studio.includes(marker) || pageAudit.includes(marker), `page audit missing ${marker}`);
});

test("profile dropdown, install app, and explicit logout to landing page are wired", () => {
  for (const marker of [
    "sn-profile-dropdown", "Profil", "Pengaturan", "Dapatkan aplikasi", "exitToLanding",
    "ngeblogging:request-install-app", "Buka menu profil", "role=\"menu\"",
  ]) assert.ok(studio.includes(marker) || pwa.includes(marker), `profile contract missing ${marker}`);
  assert.ok(main.includes("await signOut()"));
  assert.ok(main.includes("logout-landing-v170-20260730"));
  assert.ok(main.includes('document.title, "/"'));
  assert.ok(main.includes("setSession(null)"));
  assert.ok(main.includes("setStudio(false)"));
});

test("v170 rotates PWA cache while preserving v169 auth and onboarding compatibility", () => {
  for (const marker of [
    "ngeblogging-app-v170-theme-layout-20260730", "theme-layout-cache-v170",
    "ngeblogging-app-v169-first-site-20260730", "first-site-cache-v169",
    "themeLayoutRelease", "NGE_BLOGGING_FORCE_RELOAD_V170",
    "service-worker-activated-theme-layout-v170", "service-worker-stale-shell-v170",
  ]) assert.ok(serviceWorker.includes(marker), `service worker missing ${marker}`);
  for (const auth of ["/login", "/signup", "/signin", "/auth/"]) assert.ok(serviceWorker.includes(auth));
});

test("v170 patch and regression cannot be skipped by production build", () => {
  for (const command of [packageJson.scripts.predev, packageJson.scripts.test, packageJson.scripts["test:production"]]) {
    assert.ok(command.includes("run-patch-theme-layout-v170.mjs"));
  }
  assert.ok(packageJson.scripts.build.includes("verify:v170") || packageJson.scripts.build.includes("test:production"));
  assert.ok(packageJson.scripts["test:production"].includes("tests/theme-layout-v170.test.mjs"));
  assert.ok(packageJson.scripts["verify:v170"].includes("tests/theme-layout-v170.test.mjs"));
});