import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const authority = read("src/studio-v14-authority.css");
const secure = read("src/StudioSecure.jsx");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");
const workspace = read("src/NaraWorkspace.jsx");
const integrations = read("src/lib/nara-data.js");
const themeStudio = read("src/ThemeStudio.jsx");
const deviceCss = read("src/theme-device-modes.css");
const themeSystem = read("src/theme-system.js");
const publicSite = read("src/PublicSiteNext.jsx");
const publicData = read("src/lib/public-data.js");
const serviceWorker = read("public/sw.js");
const worker = read("cloudflare/worker.mjs");
const workersAi = read("server/workers-ai-nara.mjs");
const imageHandler = read("server/nara-image-handler.mjs");
const wrangler = read("wrangler.jsonc");

test("mobile Studio v14 uses one sidebar one toggle and a persistent icon rail", () => {
  assert.match(index, /studio-v14-authority\.css/);
  for (const legacy of [
    "studio-runtime-layout-guard.js",
    "studio-mobile-navigation.js",
    "studio-production-guard.js",
    "studio-v10-authority.css",
    "studio-v11-mobile-repair.css",
  ]) assert.doesNotMatch(index, new RegExp(legacy.replaceAll(".", "\\.")));
  assert.match(authority, /--sn-phone-rail: 58px/);
  assert.match(authority, /--sn-phone-panel: min\(78vw, 272px\)/);
  assert.match(authority, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-phone-rail\) !important/);
  assert.match(authority, /\.sn-side\.collapsed \+ \.sn-main \.sn-icon[\s\S]*left: calc\(var\(--sn-phone-rail\) - 20px\) !important/);
  assert.match(secure, /dataset\.sidebarAuthority = "single"/);
  assert.match(secure, /sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
});

test("Nara is outside the sidebar and remains clickable in healthy or degraded mode", () => {
  assert.match(secure, /naraRoute\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(secure, /\.sn-top-actions \.sn-nara-button/);
  assert.match(authority, /\.sn-top-actions \.sn-nara-button,[\s\S]*\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(authority, /\.nara-assistant-layer[\s\S]*z-index: 30000 !important/);
  assert.match(secure, /document\.documentElement\.dataset\.naraReady/);
  assert.match(secure, /document\.documentElement\.dataset\.naraImageReady/);
});

test("Nara exposes one command center with model intelligence files vision voice QR memory and plugins", () => {
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar"]) {
    assert.ok(assistant.includes(marker), `assistant missing ${marker}`);
  }
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) {
    assert.ok(workspace.includes(marker), `workspace missing ${marker}`);
  }
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector", "dedupe(shell)"]) {
    assert.ok(commandCenter.includes(marker), `command center missing ${marker}`);
  }
  assert.match(commandCenter, /data-release/);
  assert.match(index, /nara-command-center-bridge\.js/);
  assert.match(index, /nara-command-center\.css/);
});

test("plugin catalog includes permission-first GitHub Supabase Neon Cloudflare and other integrations", () => {
  for (const plugin of ["supabase", "neon", "github", "cloudflare", "paypal", "google-drive", "webhook"]) {
    assert.ok(integrations.includes(`id:\"${plugin}\"`) || integrations.includes(`id:"${plugin}"`), `plugin missing ${plugin}`);
  }
});

test("theme preview exposes Mobile Tablet Laptop and Komputer modes", () => {
  assert.match(index, /theme-device-modes\.css/);
  assert.match(themeStudio, /\{ id: "mobile", label: "Mobile"/);
  assert.match(themeStudio, /\{ id: "tablet", label: "Tablet"/);
  assert.match(themeStudio, /\{ id: "laptop", label: "Laptop"/);
  assert.match(themeStudio, /\{ id: "desktop", label: "Komputer"/);
  assert.match(deviceCss, /\.tn-frame-shell\.laptop iframe/);
  assert.match(deviceCss, /\.tn-frame-shell\.desktop iframe/);
});

test("catalog contains 100 themes with distinct HTML structures", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.code.html)).size, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => `${theme.code.html}\n${theme.code.css}`)).size, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.layout)).size, 20);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.composition)).size, 5);
  for (const theme of BUILT_IN_THEMES) {
    assert.match(theme.code.html, /class="ng-theme/);
    assert.ok(theme.code.html.length > 1400, `${theme.id} HTML terlalu tipis`);
    assert.ok(theme.code.css.length > 4000, `${theme.id} CSS terlalu tipis`);
  }
});

test("public tenants use real published data themes widgets and posts", () => {
  assert.match(publicData, /\.eq\("status","active"\)\.eq\("is_public",true\)/);
  assert.match(publicData, /site_theme_settings/);
  assert.match(publicData, /contents/);
  assert.match(themeSystem, /injectBeforeClosingTag\(sourceHtml, "main", contentWidgets\)/);
  assert.match(publicSite, /populatePostList\('\.ng-widget-recent-posts ol',data\.posts\)/);
  assert.match(publicSite, /const supported=new Set\(\['search','recent-posts','popular-posts','categories','tags'\]\)/);
});

test("Nara has authenticated text vision and image fallbacks on Workers AI", () => {
  assert.match(worker, /handleWorkersAiNara, workersAiReady, workersVisionReady/);
  assert.match(worker, /naraProviders: \{ qwen: qwenTextReady\(env\), workersAi: workersAiReady\(env\), vision: workersVisionReady\(env\) \}/);
  assert.match(worker, /imageProviders:/);
  assert.match(workersAi, /env\.AI\.run\(model/);
  assert.match(workersAi, /consume_nara_quota/);
  assert.match(imageHandler, /imageGenerationReady/);
  assert.match(wrangler, /CF_AI_VISION_MODEL/);
  assert.match(wrangler, /CF_AI_IMAGE_MODEL/);
});

test("v16 invalidates stale shell CSS and JavaScript caches", () => {
  assert.match(serviceWorker, /ngeblogging-app-v16-20260724/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/src\/"\)/);
});
