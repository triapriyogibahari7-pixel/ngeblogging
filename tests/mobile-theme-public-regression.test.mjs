import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const authority = readFileSync(new URL("../src/studio-v14-authority.css", import.meta.url), "utf8");
const naraAuthority = readFileSync(new URL("../src/nara-interaction-authority.css", import.meta.url), "utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
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
const imageHandler = readFileSync(new URL("../server/nara-image-handler.mjs", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");


test("mobile Studio uses one left sidebar, one toggle, and a persistent icon rail", () => {
  const studioAuthority = index.indexOf("studio-v14-authority.css");
  const naraFinalAuthority = index.indexOf("nara-interaction-authority.css");
  assert.ok(studioAuthority > -1);
  assert.ok(naraFinalAuthority > studioAuthority);
  assert.match(authority, /--sn-phone-rail: 58px/);
  assert.match(authority, /--sn-phone-panel: min\(78vw, 272px\)/);
  assert.match(authority, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-phone-rail\) !important/);
  assert.match(authority, /\.sn-side\.collapsed > nav > button[\s\S]*justify-content: center/);
  assert.match(authority, /\.sn-icon[\s\S]*position: fixed !important/);
  assert.match(authority, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom,[\s\S]*display: none !important/);
  assert.match(secure, /dataset\.sidebarAuthority = "single"/);
  assert.match(secure, /studio-source-navigation-v14-20260724/);
  assert.match(secure, /initialSidebarResolved/);
  assert.doesNotMatch(index, /studio-runtime-layout-guard\.js|studio-mobile-navigation\.js|studio-production-guard\.js/);
});


test("Nara is removed from the sidebar but preserved as a clickable floating assistant", () => {
  assert.match(secure, /buttonLabel\(button\) === "Nara AI"/);
  assert.match(secure, /naraRoute\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(secure, /\.sn-top-actions \.sn-nara-button/);
  assert.match(naraAuthority, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(naraAuthority, /\.nara-floating-button[\s\S]*z-index: 2147483000 !important/);
  assert.match(naraAuthority, /\.nara-assistant-layer[\s\S]*z-index:/);
  assert.match(naraAuthority, /\.nara-assistant-shell[\s\S]*height: 100dvh !important/);
  assert.match(index, /nara-command-center-bridge\.js/);
  assert.doesNotMatch(index, /nara-availability-bridge\.js|nara-interaction-guard\.js/);
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
  for (const plugin of ["supabase", "github", "neon", "cloudflare", "paypal", "google-drive", "webhook"]) {
    assert.ok(integrations.includes(`id:\"${plugin}\"`) || integrations.includes(`id:"${plugin}"`), `plugin missing ${plugin}`);
  }
  assert.match(index, /nara-command-center-bridge\.js/);
  assert.match(index, /nara-command-center\.css/);
});


test("mobile settings, content, domain, and Nara stay in normal flow", () => {
  assert.match(authority, /\.sn-view-pad,[\s\S]*max-width: 100%/);
  assert.match(authority, /\.sn-settings-grid,[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(authority, /\.sn-content-tools[\s\S]*flex-direction: column/);
  assert.match(authority, /\.sn-doc-row[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto 34px !important/);
  assert.match(authority, /\.sn-domain-card[\s\S]*grid-template-columns: 42px minmax\(0, 1fr\) !important/);
  assert.match(authority, /\.nara-assistant-layer,[\s\S]*width: 100vw !important/);
  assert.match(secure, /ngeblogging-settings-extras/);
  assert.match(secure, /saveButton\.insertAdjacentElement\("afterend", extras\)/);
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


test("Nara keeps Qwen primary and Workers AI text vision and image fallbacks", () => {
  assert.match(worker, /function qwenTextReady\(env\)/);
  assert.match(worker, /qwenTextReady\(env\) \|\| workersAiReady\(env\)/);
  assert.match(worker, /handleWorkersAiNara\(request, env, requestId, origin\)/);
  assert.match(worker, /naraProviders: \{ qwen: qwenTextReady\(env\), workersAi: workersAiReady\(env\), vision: workersVisionReady\(env\) \}/);
  assert.match(worker, /imageGenerationReady/);
  assert.match(runtime, /dashscope-intl\.aliyuncs\.com\/compatible-mode\/v1/);
  assert.match(runtime, /QWEN_API_BASE_URL:/);
  assert.match(workersAiFallback, /env\.AI\.run\(model/);
  assert.match(workersAiFallback, /DEFAULT_SUPABASE_URL/);
  assert.match(workersAiFallback, /NARA_SESSION_PROJECT_MISMATCH/);
  assert.match(workersAiFallback, /consume_nara_quota/);
  assert.match(workersAiFallback, /DEFAULT_VISION_MODEL/);
  assert.match(imageHandler, /generateWithWorkers/);
  assert.match(imageHandler, /imageGenerationReady/);
  assert.match(wrangler, /"binding": "AI"/);
  assert.match(wrangler, /@cf\/zai-org\/glm-4\.7-flash/);
  assert.match(wrangler, /@cf\/google\/gemma-4-26b-a4b-it/);
  assert.match(wrangler, /@cf\/bytedance\/stable-diffusion-xl-lightning/);
});


test("the v14 release invalidates stale CSS and JavaScript caches", () => {
  assert.match(serviceWorker, /ngeblogging-app-v14-20260724/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/src\/"\)/);
});
