import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const authority = readFileSync(new URL("../src/studio-v14-authority.css", import.meta.url), "utf8");
const naraAuthority = readFileSync(new URL("../src/nara-interaction-authority.css", import.meta.url), "utf8");
const commandCenter = readFileSync(new URL("../src/nara-command-center-bridge.js", import.meta.url), "utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
const billing = readFileSync(new URL("../src/billing-availability-bridge.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const fallback = readFileSync(new URL("../server/workers-ai-nara.mjs", import.meta.url), "utf8");
const imageHandler = readFileSync(new URL("../server/nara-image-handler.mjs", import.meta.url), "utf8");
const wrangler = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");


test("phone navigation is sidebar-only with one edge control and a visible icon rail", () => {
  assert.match(authority, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom,[\s\S]*display: none !important/);
  assert.match(authority, /--sn-phone-panel: min\(78vw, 272px\)/);
  assert.match(authority, /--sn-phone-rail: 58px/);
  assert.match(authority, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-phone-rail\) !important/);
  assert.match(authority, /\.sn-side\.collapsed > nav > button[\s\S]*justify-content: center/);
  assert.match(authority, /\.sn-icon[\s\S]*position: fixed !important/);
  assert.match(secure, /querySelectorAll\(":scope > \.sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom"\)/);
  assert.match(secure, /dataset\.sidebarAuthority = "single"/);
  assert.match(secure, /naraRoute\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(index, /studio-v14-authority\.css/);
  assert.doesNotMatch(index, /studio-v8-hardening\.css|studio-v10-authority\.css|studio-production-guard\.js/);
});


test("settings content domain and Nara cannot overlap on phones", () => {
  assert.match(secure, /ngeblogging-settings-extras/);
  assert.match(secure, /saveButton\.insertAdjacentElement\("afterend", extras\)/);
  assert.match(authority, /\.sn-settings-grid,[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(authority, /\.sn-content-tools[\s\S]*flex-direction: column/);
  assert.match(authority, /\.sn-doc-row[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto 34px !important/);
  assert.match(authority, /\.sn-domain-card[\s\S]*grid-template-columns: 42px minmax\(0, 1fr\) !important/);
  assert.match(authority, /\.nara-assistant-layer,[\s\S]*height: 100dvh !important/);
  assert.match(naraAuthority, /\.nara-assistant-shell[\s\S]*height: 100dvh !important/);
});


test("Nara launcher stays clickable and all capabilities remain available", () => {
  assert.match(secure, /\.sn-top-actions \.sn-nara-button/);
  assert.match(naraAuthority, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(naraAuthority, /\.nara-floating-button[\s\S]*z-index: 2147483000 !important/);
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector", "openWorkspace"]) {
    assert.ok(commandCenter.includes(marker), marker);
  }
  assert.doesNotMatch(index, /nara-availability-bridge\.js|nara-interaction-guard\.js/);
});


test("Nara has Qwen and authenticated Cloudflare Workers AI text vision and image fallback", () => {
  assert.equal(wrangler.ai.binding, "AI");
  assert.equal(wrangler.env.production.ai.binding, "AI");
  assert.equal(wrangler.vars.CF_AI_MODEL, "@cf/zai-org/glm-4.7-flash");
  assert.equal(wrangler.vars.CF_AI_VISION_MODEL, "@cf/google/gemma-4-26b-a4b-it");
  assert.equal(wrangler.vars.CF_AI_IMAGE_MODEL, "@cf/bytedance/stable-diffusion-xl-lightning");
  assert.match(worker, /handleWorkersAiNara, workersAiReady, workersVisionReady/);
  assert.match(worker, /qwenTextReady\(env\) \|\| workersAiReady\(env\)/);
  assert.match(worker, /naraProviders: \{ qwen: qwenTextReady\(env\), workersAi: workersAiReady\(env\), vision: workersVisionReady\(env\) \}/);
  assert.match(worker, /imageGenerationReady/);
  assert.match(fallback, /env\.AI\.run\(model/);
  assert.match(fallback, /DEFAULT_SUPABASE_URL/);
  assert.match(fallback, /NARA_SESSION_PROJECT_MISMATCH/);
  assert.match(fallback, /consume_nara_quota/);
  assert.match(fallback, /verifyUser\(request, env\)/);
  assert.match(fallback, /DEFAULT_VISION_MODEL/);
  assert.match(imageHandler, /generateWithWorkers/);
  assert.match(imageHandler, /imageGenerationReady/);
});


test("inactive commerce stays hidden while PWA updates to v14", () => {
  assert.match(billing, /function upgradeButtons\(\)/);
  assert.match(billing, /upgrades\.forEach\(conceal\)/);
  assert.match(serviceWorker, /ngeblogging-app-v14-20260724/);
});
