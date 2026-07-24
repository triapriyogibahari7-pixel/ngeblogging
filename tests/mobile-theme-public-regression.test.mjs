import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const critical = readFileSync(new URL("../src/studio-mobile-critical.css", import.meta.url), "utf8");
const finalMobile = readFileSync(new URL("../src/studio-final-mobile.css", import.meta.url), "utf8");
const hardening = readFileSync(new URL("../src/studio-v8-hardening.css", import.meta.url), "utf8");
const authority = readFileSync(new URL("../src/studio-v10-authority.css", import.meta.url), "utf8");
const runtimeGuard = readFileSync(new URL("../src/studio-runtime-layout-guard.js", import.meta.url), "utf8");
const productionGuard = readFileSync(new URL("../src/studio-production-guard.js", import.meta.url), "utf8");
const capabilityBridge = readFileSync(new URL("../src/nara-availability-bridge.js", import.meta.url), "utf8");
const commandCenter = readFileSync(new URL("../src/nara-command-center-bridge.js", import.meta.url), "utf8");
const assistant = readFileSync(new URL("../src/NaraAssistant.jsx", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../src/NaraWorkspace.jsx", import.meta.url), "utf8");
const integrations = readFileSync(new URL("../src/lib/nara-data.js", import.meta.url), "utf8");
const themeStudio = readFileSync(new URL("../src/ThemeStudio.jsx", import.meta.url), "utf8");
const deviceCss = readFileSync(new URL("../src/theme-device-modes.css", import.meta.url), "utf8");
const themeSystem = readFileSync(new URL("../src/theme-system.js", import.meta.url), "utf8");
const publicSite = readFileSync(new URL("../src/PublicSiteNext.jsx", import.meta.url), "utf8");
const publicData = readFileSync(new URL("../src/lib/public-data.js", import.meta.url), "utf8");
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const runtime = readFileSync(new URL("../server/nara-runtime.mjs", import.meta.url), "utf8");
const workersAiFallback = readFileSync(new URL("../server/workers-ai-nara.mjs", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");


test("mobile Studio uses one left sidebar, one toggle, and a persistent icon rail", () => {
  const hardeningCss = index.indexOf("studio-v8-hardening.css");
  const authorityCss = index.indexOf("studio-v10-authority.css");
  const mainScript = index.indexOf("/src/main.jsx");
  const runtimeGuardScript = index.indexOf("studio-runtime-layout-guard.js");
  const productionGuardScript = index.indexOf("studio-production-guard.js");
  assert.ok(authorityCss > hardeningCss, "v10 authority must load after legacy CSS");
  assert.ok(runtimeGuardScript > -1 && runtimeGuardScript < mainScript);
  assert.ok(productionGuardScript > mainScript);
  assert.match(critical, /\.sn-shell>\.sn-mobile-nav,\.sn-shell>\.sn-mobile-sheet-layer\{display:none!important\}/);
  assert.match(finalMobile, /\.sn-mobile-nav,[\s\S]*display: none !important/);
  assert.match(hardening, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom[\s\S]*display: none !important/);
  assert.match(authority, /--sn-phone-rail: 68px/);
  assert.match(authority, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-rail-width\) !important/);
  assert.match(authority, /\.sn-side\.collapsed > nav > button[\s\S]*justify-content: center !important/);
  assert.match(authority, /\.sn-icon[\s\S]*position: fixed !important/);
  assert.match(runtimeGuard, /studio-icon-rail-v10-20260724/);
  assert.match(runtimeGuard, /MOBILE_RAIL = 68/);
  assert.match(productionGuard, /removeLegacyMobileNavigation\(shell\)/);
  assert.match(productionGuard, /mergeSidebarMenus\(side\)/);
  assert.match(productionGuard, /dataset\.sidebarAuthority = "single"/);
  assert.match(productionGuard, /studio-production-guard-v10-20260724/);
  assert.doesNotMatch(productionGuard, /important\(nav, "display", "grid"\)/);
});


test("Nara is removed from the sidebar but preserved as a clickable floating assistant", () => {
  assert.match(productionGuard, /hideNaraSidebarRoute\(side\)/);
  assert.match(productionGuard, /ensureFloatingNara\(\)/);
  assert.match(productionGuard, /data-nara-workspace-route/);
  assert.match(authority, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(authority, /\.nara-floating-button[\s\S]*z-index: 18000 !important/);
  assert.match(authority, /\.nara-assistant-layer[\s\S]*z-index: 22000 !important/);
  assert.match(authority, /\.nara-assistant-shell[\s\S]*height: 100dvh !important/);
  assert.match(capabilityBridge, /nara-capability-bridge-v10-20260724/);
  assert.match(capabilityBridge, /preserveAssistantCapabilities/);
  assert.doesNotMatch(capabilityBridge, /removeInactiveOptions/);
  assert.doesNotMatch(capabilityBridge, /controls\.forEach\(conceal\)/);
});


test("Nara keeps models, intelligence, files, images, voice, QR, memory, and plugins", () => {
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar"]) {
    assert.ok(assistant.includes(marker), `assistant missing ${marker}`);
  }
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) {
    assert.ok(workspace.includes(marker), `workspace missing ${marker}`);
  }
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector", "openWorkspace"]) {
    assert.ok(commandCenter.includes(marker), `command center missing ${marker}`);
  }
  for (const plugin of ["supabase", "github", "cloudflare", "paypal", "google-drive", "webhook"]) {
    assert.ok(integrations.includes(`id:\"${plugin}\"`) || integrations.includes(`id:"${plugin}"`), `plugin missing ${plugin}`);
  }
  assert.match(index, /nara-command-center-bridge\.js/);
  assert.match(index, /nara-command-center\.css/);
});


test("mobile settings, favicon, backup, site manager, theme modal, widget studio, and Nara stay in flow", () => {
  assert.match(finalMobile, /\.sn-view-pad:has\(\.sn-settings-grid\)/);
  assert.match(authority, /\.sn-settings-grid,[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(authority, /#ngeblogging-site-favicon-settings/);
  assert.match(authority, /\.sn-backup-host/);
  assert.match(authority, /\.sn-modal-layer,[\s\S]*position: fixed !important/);
  assert.match(authority, /\.sn-site-manager,[\s\S]*max-height: calc\(100dvh - 32px\) !important/);
  assert.match(authority, /\.tn-widget-summary[\s\S]*grid-template-columns: 44px minmax\(0, 1fr\) auto/);
  assert.match(authority, /\.sn-settings-grid input,[\s\S]*font-size: 16px !important/);
  assert.match(productionGuard, /ngeblogging-settings-extras/);
});


test("media, domain, theme, and content views have dedicated phone layouts", () => {
  assert.match(critical, /\.sn-media-tools\{display:grid!important/);
  assert.match(critical, /\.sn-media-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(critical, /\.sn-domain-card,/);
  assert.match(critical, /\.tn-hero\{display:grid!important;grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(authority, /\.sn-doc-row[\s\S]*grid-template-areas: "title trash" "status time"/);
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


test("public tenant lookup, themes, widgets, and posts use real published data", () => {
  assert.match(publicData, /\.eq\("status","active"\)\.eq\("is_public",true\)/);
  assert.match(publicData, /site_theme_settings/);
  assert.match(publicData, /contents/);
  assert.match(themeSystem, /injectBeforeClosingTag\(sourceHtml, "main", contentWidgets\)/);
  assert.match(themeSystem, /grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,240px\),1fr\)\)/);
  assert.match(themeSystem, /\.ng-header nav\.open/);
  assert.match(themeSystem, /viewport-fit=cover/);
  assert.match(publicSite, /populatePostList\('\.ng-widget-recent-posts ol',data\.posts\)/);
  assert.match(publicSite, /renderCards\(input\?\.value\|\|''\)/);
  assert.match(publicSite, /const supported=new Set\(\['search','recent-posts','popular-posts','categories','tags'\]\)/);
  assert.doesNotMatch(publicSite, /className="ps-theme-tools"/);
});


test("Nara keeps Qwen primary and Workers AI as an authenticated fallback", () => {
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


test("the v13 release invalidates stale CSS and JavaScript caches", () => {
  assert.match(serviceWorker, /ngeblogging-app-v13-20260724/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/src\/"\)/);
});
