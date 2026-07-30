import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { composeThemeLayoutV170, THEME_LAYOUT_RUNTIME_V171 } from "../src/theme-layout-runtime-v170.js";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const widgets = read("src/widget-system.js");
const studio = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");
const main = read("src/main.jsx");
const responsiveCss = read("src/mobile-public-v171.css");
const mapCss = read("src/theme-map-extension-v171.css");
const runtime = read("src/theme-layout-runtime-v170.js");
const serviceWorker = read("public/sw.js");
const runner = read("scripts/run-patch-mobile-public-v171.mjs");
const packageJson = JSON.parse(read("package.json"));

const AUTHORITY = "mobile-public-v171-20260730";
const NEW_AREAS = [
  "header-primary-left", "header-primary-right",
  "footer-copyright-left", "footer-copyright-right",
];
const OLD_AREAS = [
  "top-left-1", "top-left-2", "top-left-3", "top-right-1", "top-right-2", "top-right-3",
  "before-content", "sidebar-left-1", "sidebar-left-2", "sidebar-left-3",
  "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "after-content",
  "bottom-left-1", "bottom-left-2", "bottom-left-3", "bottom-right-1", "bottom-right-2", "bottom-right-3",
];

test("v171 preserves 20 areas and adds four real header/footer areas", () => {
  assert.ok(widgets.includes(`WIDGET_LAYOUT_EXTENSION_V171 = "${AUTHORITY}"`));
  for (const area of [...OLD_AREAS, ...NEW_AREAS]) {
    assert.ok(widgets.includes(`id: "${area}"`), `missing widget area ${area}`);
  }
  for (const area of NEW_AREAS) {
    assert.ok(mapCss.includes(area), `map CSS missing ${area}`);
    assert.ok(runtime.includes(area), `public runtime missing ${area}`);
  }
  assert.ok(mapCss.includes("grid-template-areas"));
  assert.ok(mapCss.includes("@media(max-width:760px)"));
  assert.ok(mapCss.includes("@media(max-width:339px)"));
});

test("public theme runtime uses one, two, or three columns only when sidebars exist", () => {
  assert.equal(THEME_LAYOUT_RUNTIME_V171, AUTHORITY);
  const source = '<header><b>Nama</b></header><main class="legacy-grid"><h1>Judul tidak boleh pecah huruf</h1></main><footer>Hak cipta</footer>';
  const render = (_widgets, area) => area === "sidebar-right-1" ? '<div class="ng-widget">Kanan</div>' : "";
  const withoutSidebar = composeThemeLayoutV170(source, [], () => "");
  assert.ok(withoutSidebar.html.includes("content-only"));
  assert.ok(withoutSidebar.html.includes("legacy-grid ng-layout-main-v171"));
  assert.ok(withoutSidebar.html.includes(`data-layout-main-authority="${AUTHORITY}"`));
  assert.equal(withoutSidebar.html.includes("has-left"), false);
  assert.equal(withoutSidebar.html.includes("has-right"), false);

  const withRight = composeThemeLayoutV170(source, [], render);
  assert.ok(withRight.html.includes("has-right"));
  assert.equal(withRight.html.includes("has-left has-right"), false);
  assert.ok(withRight.html.includes('data-layout-area="sidebar-right-1"'));

  const both = composeThemeLayoutV170(source, [], (_widgets, area) => (
    area === "sidebar-left-1" || area === "sidebar-right-1" ? `<div>${area}</div>` : ""
  ));
  assert.ok(both.html.includes("has-left has-right"));
  for (const marker of [
    ".ng-layout-main-v171", "grid-column:1/-1!important", ".ng-content-grid-v170.content-only",
    "word-break:normal", "overflow-wrap:break-word", "@media(max-width:820px)", "@media(max-width:340px)",
  ]) assert.ok(runtime.includes(marker), `runtime safety missing ${marker}`);
});

test("Studio mobile drawer, profile, media, and all pages share bounded responsive sizing", () => {
  assert.ok(studio.includes(`data-mobile-layout-authority="${AUTHORITY}"`));
  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    assert.ok(studio.includes(`>${label}<`), `Studio menu removed: ${label}`);
  }
  for (const marker of [
    'width:min(82vw,340px)', ".sn-side.mobile-open", "justify-content:safe center",
    ".sn-profile-dropdown", 'width:min(300px,calc(100vw - 20px))',
    ".sn-upload-zone", "min-height:190px", ".sn-media-tools", ".sn-media-grid",
    "word-break:normal", "overflow-wrap:break-word", "@media(max-width:900px)", "@media(max-width:430px)",
  ]) assert.ok(responsiveCss.includes(marker), `responsive CSS missing ${marker}`);
  assert.ok(main.includes('import "./mobile-public-v171.css";'));
  assert.ok(main.includes('import "./theme-map-extension-v171.css";'));
});

test("Nara small and medium are non-modal while full screen remains closable modal", () => {
  assert.ok(nara.includes("data-nara-layer-size={size}"));
  assert.ok(nara.includes('aria-modal={size === "full"}'));
  for (const marker of [
    ".nara-assistant-layer{pointer-events:none!important", ".nara-assistant-backdrop{display:none!important",
    '.nara-assistant-shell[data-nara-size="small"]', '.nara-assistant-shell[data-nara-size="medium"]',
    '.nara-assistant-layer[data-nara-layer-size="full"]{pointer-events:auto!important',
    "body.nara-fullscreen-open-v148", ".nara-floating-button",
  ]) assert.ok(responsiveCss.includes(marker) || mapCss.includes(marker) || nara.includes(marker), `Nara contract missing ${marker}`);
  for (const capability of ["Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal", "Camera", "Mic", "SpeakerIcon"]) {
    assert.ok(nara.includes(capability), `Nara capability removed: ${capability}`);
  }
});

test("v171 rotates cache and production build cannot skip the responsive patch", () => {
  for (const marker of [
    "ngeblogging-app-v171-mobile-public-20260730", "mobile-public-cache-v171", AUTHORITY,
    "ngeblogging-app-v170-theme-layout-20260730", "theme-layout-cache-v170",
    "NGE_BLOGGING_FORCE_RELOAD_V170", "service-worker-stale-shell-v170", "service-worker-activated-theme-layout-v170",
  ]) assert.ok(serviceWorker.includes(marker), `service worker marker missing ${marker}`);
  for (const marker of [
    "patchWidgets()", "patchGlobalStyles()", "patchStudioAuthority()", "patchNaraNonModal()",
    "patchRuntimeContentOnly()", "patchServiceWorker()", "verifyComplete()", "patch applied exactly once and verified",
  ]) assert.ok(runner.includes(marker), `runner marker missing ${marker}`);
  for (const command of [packageJson.scripts.predev, packageJson.scripts.test, packageJson.scripts["test:production"], packageJson.scripts["verify:v171"]]) {
    assert.ok(command.includes("run-patch-theme-layout-v170.mjs"), `v170 prerequisite missing from ${command}`);
    assert.ok(command.includes("run-patch-mobile-public-v171.mjs"), `v171 runner missing from ${command}`);
  }
  assert.ok(packageJson.scripts["test:production"].includes("tests/mobile-public-layout-v171.test.mjs"));
});
