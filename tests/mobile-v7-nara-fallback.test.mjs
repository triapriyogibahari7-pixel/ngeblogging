import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const authority = read("src/studio-v14-authority.css");
const responsive = read("src/studio-responsive-v21.css");
const sidebar = read("src/studio-sidebar-v21.js");
const secure = read("src/StudioSecure.jsx");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");
const billing = read("src/billing-availability-bridge.js");
const worker = read("cloudflare/worker.mjs");
const workersAi = read("server/workers-ai-nara.mjs");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const serviceWorker = read("public/sw.js");

test("phone navigation is sidebar-only with one edge control and a visible icon rail", () => {
  assert.match(index, /studio-responsive-v21\.css/);
  assert.match(index, /studio-sidebar-v21\.js/);
  assert.match(responsive, /--sn-v21-mobile-rail: 64px/);
  assert.match(responsive, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-v21-mobile-rail\) !important/);
  assert.match(responsive, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom,[\s\S]*display: none !important/);
  assert.match(sidebar, /toggle\.dataset\.sidebarAuthority = "single-v21"/);
  assert.match(sidebar, /if \(mobile && !side\.classList\.contains\("collapsed"\)\)/);
  assert.doesNotMatch(index, /studio-mobile-navigation\.js|studio-production-guard\.js|nara-launcher-v20\.js/);
  assert.match(secure, /studio-source-navigation-v21-20260725/);
});

test("settings site manager theme content and Nara use bounded mobile layouts", () => {
  assert.match(responsive, /@media \(max-width: 760px\)/);
  assert.match(responsive, /\.sn-welcome,[\s\S]*\.sn-settings-grid[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(responsive, /\.sn-content-tools[\s\S]*display: grid !important/);
  assert.match(responsive, /\.nara-assistant-layer[\s\S]*inset: 0 !important/);
  assert.match(responsive, /\.nara-assistant-shell[\s\S]*min-height: 100dvh !important/);
  assert.match(responsive, /\.nara-composer-tools[\s\S]*grid-template-columns:/);
  assert.match(authority, /\.nara-composer input\[type="file"\][\s\S]*display: none !important/);
});

test("Nara launcher and complete capability center remain available", () => {
  assert.match(assistant, /className="nara-floating-button" onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(responsive, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(responsive, /\.nara-assistant-layer[\s\S]*z-index: 2147483100 !important/);
  assert.doesNotMatch(index, /nara-launcher-v20\.js/);
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector"]) {
    assert.ok(commandCenter.includes(marker), marker);
  }
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) {
    assert.ok(assistant.includes(marker), marker);
  }
});

test("Nara has authenticated Qwen and Workers AI text vision and image fallbacks", () => {
  assert.equal(wrangler.ai.binding, "AI");
  assert.equal(wrangler.env.production.ai.binding, "AI");
  assert.equal(wrangler.vars.CF_AI_MODEL, "@cf/zai-org/glm-4.7-flash");
  assert.ok(wrangler.vars.CF_AI_VISION_MODEL);
  assert.ok(wrangler.vars.CF_AI_IMAGE_MODEL);
  assert.match(worker, /handleWorkersAiNara, workersAiReady, workersVisionReady/);
  assert.match(worker, /naraProviders: \{ qwen: qwenTextReady\(env\), workersAi: workersAiReady\(env\), vision: workersVisionReady\(env\) \}/);
  assert.match(workersAi, /env\.AI\.run\(model/);
  assert.match(workersAi, /verifyUser\(request, env\)/);
  assert.match(workersAi, /consume_nara_quota/);
});

test("inactive commerce stays hidden while PWA updates to v21", () => {
  assert.match(billing, /function upgradeButtons\(\)/);
  assert.match(billing, /upgrades\.forEach\(conceal\)/);
  assert.match(serviceWorker, /ngeblogging-app-v14-20260724-v21/);
});
