import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const critical = readFileSync(new URL("../src/studio-mobile-critical.css", import.meta.url), "utf8");
const finalMobile = readFileSync(new URL("../src/studio-final-mobile.css", import.meta.url), "utf8");
const hardening = readFileSync(new URL("../src/studio-v8-hardening.css", import.meta.url), "utf8");
const runtimeGuard = readFileSync(new URL("../src/studio-runtime-layout-guard.js", import.meta.url), "utf8");
const productionGuard = readFileSync(new URL("../src/studio-production-guard.js", import.meta.url), "utf8");
const themeStudio = readFileSync(new URL("../src/ThemeStudio.jsx", import.meta.url), "utf8");
const deviceCss = readFileSync(new URL("../src/theme-device-modes.css", import.meta.url), "utf8");
const themeSystem = readFileSync(new URL("../src/theme-system.js", import.meta.url), "utf8");
const publicSite = readFileSync(new URL("../src/PublicSiteNext.jsx", import.meta.url), "utf8");
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const runtime = readFileSync(new URL("../server/nara-runtime.mjs", import.meta.url), "utf8");
const workersAiFallback = readFileSync(new URL("../server/workers-ai-nara.mjs", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");


test("mobile Studio uses only the left sidebar and one edge toggle", () => {
  const deviceAuthority = index.indexOf("studio-device-mode.css");
  const criticalCss = index.indexOf("studio-mobile-critical.css");
  const finalCss = index.indexOf("studio-final-mobile.css");
  const hardeningCss = index.indexOf("studio-v8-hardening.css");
  const mainScript = index.indexOf("/src/main.jsx");
  const runtimeGuardScript = index.indexOf("studio-runtime-layout-guard.js");
  const productionGuardScript = index.indexOf("studio-production-guard.js");
  assert.ok(criticalCss > deviceAuthority);
  assert.ok(finalCss > criticalCss);
  assert.ok(hardeningCss > finalCss);
  assert.ok(runtimeGuardScript > -1 && runtimeGuardScript < mainScript);
  assert.ok(productionGuardScript > mainScript);
  assert.match(critical, /\.sn-shell>\.sn-mobile-nav,\.sn-shell>\.sn-mobile-sheet-layer\{display:none!important\}/);
  assert.match(finalMobile, /\.sn-mobile-nav,[\s\S]*display: none !important/);
  assert.match(hardening, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom[\s\S]*display: none !important/);
  assert.match(hardening, /--sn-phone-panel: min\(82vw, 272px\)/);
  assert.match(runtimeGuard, /removeLegacyControls\(shell\)/);
  assert.match(productionGuard, /removeLegacyMobileNavigation\(shell\)/);
  assert.match(productionGuard, /mergeSidebarMenus\(side\)/);
  assert.match(productionGuard, /dataset\.sidebarAuthority = "single"/);
  assert.match(productionGuard, /studio-production-guard-v8-20260724/);
  assert.doesNotMatch(productionGuard, /important\(nav, "display", "grid"\)/);
});


test("mobile settings, favicon, backup, site manager, theme modal, and Nara remain in normal flow", () => {
  assert.match(finalMobile, /\.sn-view-pad:has\(\.sn-settings-grid\)/);
  assert.match(finalMobile, /\.sn-settings-grid,[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(finalMobile, /#ngeblogging-site-favicon-settings/);
  assert.match(finalMobile, /\.sn-backup-host/);
  assert.match(finalMobile, /\.bc-center[\s\S]*position: static !important/);
  assert.match(hardening, /\.sn-site-manager[\s\S]*max-height: calc\(100dvh - 40px\)/);
  assert.match(hardening, /\.tn-modal-layer[\s\S]*z-index: 13000/);
  assert.match(hardening, /\.tn-widget-summary[\s\S]*grid-template-columns: 42px minmax\(0, 1fr\) auto/);
  assert.match(hardening, /\.nara-assistant-shell[\s\S]*width: 100vw !important/);
  assert.match(hardening, /\.sn-settings-grid input,[\s\S]*font-size: 16px !important/);
  assert.match(productionGuard, /ngeblogging-settings-extras/);
});


test("media, domain, and theme views have dedicated real-phone layouts", () => {
  assert.match(critical, /\.sn-media-tools\{display:grid!important/);
  assert.match(critical, /\.sn-media-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(critical, /\.sn-domain-card,/);
  assert.match(critical, /\.tn-hero\{display:grid!important;grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(critical, /\.tn-frame-shell\.mobile iframe/);
  assert.match(critical, /\.tn-frame-shell\.desktop iframe\{width:1440px!important/);
});


test("theme preview exposes native Mobile Tablet Laptop and Komputer modes", () => {
  assert.match(index, /theme-device-modes\.css/);
  assert.doesNotMatch(index, /theme-device-mode-bridge\.js/);
  assert.match(themeStudio, /\{ id: "mobile", label: "Mobile", icon: Smartphone \}/);
  assert.match(themeStudio, /\{ id: "tablet", label: "Tablet", icon: Tablet \}/);
  assert.match(themeStudio, /\{ id: "laptop", label: "Laptop", icon: Laptop \}/);
  assert.match(themeStudio, /\{ id: "desktop", label: "Komputer", icon: Monitor \}/);
  assert.match(themeStudio, /useState\(initialPreviewDevice\)/);
  assert.match(themeStudio, /<b>4<\/b><span>Mode perangkat<\/span>/);
  assert.match(deviceCss, /\.tn-frame-shell\.laptop iframe/);
  assert.match(deviceCss, /\.tn-frame-shell\.desktop iframe/);
});


test("the catalog contains 100 unique HTML themes instead of color-only duplicates", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.code.html)).size, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => `${theme.code.html}\n${theme.code.css}`)).size, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.layout)).size, 20);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.composition)).size, 5);
  for (const theme of BUILT_IN_THEMES) {
    assert.match(theme.code.html, /class="ng-theme/);
    assert.match(theme.code.html, /class="ng-header/);
    assert.match(theme.code.html, /class="ng-hero/);
    assert.match(theme.code.html, /class="ng-cards"/);
    assert.ok(theme.code.html.length > 1400, `${theme.id} HTML terlalu tipis`);
    assert.ok(theme.code.css.length > 4000, `${theme.id} CSS terlalu tipis`);
  }
});


test("public theme widgets are inserted inside the theme and populated from tenant data", () => {
  assert.match(themeSystem, /injectBeforeClosingTag\(sourceHtml, "main", contentWidgets\)/);
  assert.doesNotMatch(themeSystem, /\$\{sidebarWidgets \? `<aside[^`]+` : ""\}\$\{html\}/);
  assert.match(themeSystem, /grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,240px\),1fr\)\)/);
  assert.match(themeSystem, /\.ng-header nav\.open/);
  assert.match(themeSystem, /viewport-fit=cover/);
  assert.match(publicSite, /populatePostList\('\.ng-widget-recent-posts ol',data\.posts\)/);
  assert.match(publicSite, /renderCards\(input\?\.value\|\|''\)/);
  assert.match(publicSite, /const supported=new Set\(\['search','recent-posts','popular-posts','categories','tags'\]\)/);
  assert.doesNotMatch(publicSite, /className="ps-theme-tools"/);
});


test("Nara keeps Qwen as primary and uses Workers AI as an authenticated fallback", () => {
  assert.match(worker, /function qwenTextReady\(env\)/);
  assert.match(worker, /qwenTextReady\(env\) \|\| workersAiReady\(env\)/);
  assert.match(worker, /handleWorkersAiNara\(request, env, requestId, origin\)/);
  assert.match(worker, /naraProviders: \{ qwen: qwenTextReady\(env\), workersAi: workersAiReady\(env\) \}/);
  assert.match(runtime, /dashscope-intl\.aliyuncs\.com\/compatible-mode\/v1/);
  assert.match(runtime, /QWEN_API_BASE_URL:/);
  assert.match(workersAiFallback, /env\.AI\.run\(model/);
  assert.match(workersAiFallback, /DEFAULT_SUPABASE_URL/);
  assert.match(workersAiFallback, /DEFAULT_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(workersAiFallback, /NARA_SESSION_PROJECT_MISMATCH/);
  assert.match(workersAiFallback, /consume_nara_quota/);
  assert.match(wrangler, /"binding": "AI"/);
  assert.match(wrangler, /@cf\/zai-org\/glm-4\.7-flash/);
});


test("the release invalidates stale CSS and JavaScript caches", () => {
  assert.match(serviceWorker, /ngeblogging-app-v9-20260724/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/src\/"\)/);
});
