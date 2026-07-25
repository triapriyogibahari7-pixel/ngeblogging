import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const shellCss = read("src/studio-shell-v29.css");
const shellRuntime = read("src/studio-shell-v29.js");
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

test("mobile Studio v29 uses a Cloudflare-style drawer with an internal close button", () => {
  assert.match(index, /studio-shell-v29\.css/);
  assert.match(index, /studio-shell-v29\.js/);
  for (const legacy of ["studio-runtime-layout-guard.js", "studio-mobile-navigation.js", "studio-production-guard.js", "studio-v10-authority.css", "studio-v11-mobile-repair.css", "studio-mobile-v15.css", "studio-mobile-v16.css", "studio-mobile-v17.css", "studio-mobile-v18.css", "studio-mobile-v19.css", "studio-mobile-v20.css", "nara-launcher-v20.js"]) {
    assert.doesNotMatch(index, new RegExp(`<script[^>]+${legacy.replaceAll(".", "\\.")}|<link[^>]+${legacy.replaceAll(".", "\\.")}`));
  }
  assert.match(shellCss, /--sn-v29-panel: min\(84vw, 360px\)/);
  assert.match(shellCss, /\.sn-mobile-v29-header/);
  assert.match(shellCss, /\.sn-mobile-v29-close/);
  assert.match(shellCss, /\.sn-mobile-v29-launcher[\s\S]*top: 50dvh !important/);
  assert.match(shellRuntime, /Cari menu…/);
  assert.match(shellRuntime, /clickSource\(shell, false\)/);
  assert.match(secure, /studio-source-navigation-v29-20260725/);
});

test("Nara workspace and the single assistant window remain directly available", () => {
  assert.match(secure, /naraRoute\.hidden = false/);
  assert.match(secure, /\.sn-top-actions \.sn-nara-button, \.ce-nara/);
  assert.doesNotMatch(index, /<script[^>]+nara-launcher-v20\.js/);
  assert.match(assistant, /className="nara-floating-button" onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(shellCss, /\.nara-assistant-layer\[data-nara-shell-v29="true"\][\s\S]*z-index: 2147483600 !important/);
  assert.match(secure, /document\.documentElement\.dataset\.naraReady/);
  assert.match(secure, /document\.documentElement\.dataset\.naraImageReady/);
});

test("Nara exposes model intelligence files vision voice QR memory and plugins", () => {
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar"]) assert.ok(assistant.includes(marker), `assistant missing ${marker}`);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), `workspace missing ${marker}`);
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector", "dedupe(shell)"]) assert.ok(commandCenter.includes(marker), `command center missing ${marker}`);
  assert.match(commandCenter, /data-release/);
  assert.match(index, /nara-command-center-bridge\.js/);
  assert.match(index, /nara-command-center\.css/);
});

test("plugin catalog includes permission-first GitHub Supabase Neon Cloudflare and other integrations", () => {
  for (const plugin of ["supabase", "neon", "github", "cloudflare", "paypal", "google-drive", "webhook"]) assert.ok(integrations.includes(`id:\"${plugin}\"`) || integrations.includes(`id:"${plugin}"`), `plugin missing ${plugin}`);
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

test("v29 invalidates stale shell CSS and JavaScript caches", () => {
  assert.match(serviceWorker, /ngeblogging-app-v29-20260725/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/src\/"\)/);
});
