import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const authority = read("src/studio-v14-authority.css");
const secure = read("src/StudioSecure.jsx");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");
const billing = read("src/billing-availability-bridge.js");
const worker = read("cloudflare/worker.mjs");
const workersAi = read("server/workers-ai-nara.mjs");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const serviceWorker = read("public/sw.js");

test("phone navigation is sidebar-only with one edge control and a visible icon rail", () => {
  assert.match(index, /studio-v14-authority\.css/);
  assert.match(authority, /--sn-phone-rail: 58px/);
  assert.match(authority, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-phone-rail\) !important/);
  assert.match(authority, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom,[\s\S]*display: none !important/);
  assert.match(secure, /dataset\.sidebarAuthority = "single"/);
  assert.match(secure, /if \(!side\.classList\.contains\("collapsed"\)\) toggle\.click\(\)/);
  assert.doesNotMatch(index, /studio-mobile-navigation\.js|studio-production-guard\.js/);
});

test("settings site manager theme content and Nara use bounded mobile layouts", () => {
  assert.match(authority, /\.sn-welcome,[\s\S]*\.sn-settings-grid,[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(authority, /\.sn-content-tools[\s\S]*flex-direction: column/);
  assert.match(authority, /html\[data-physical-mobile="true"\] \.nara-assistant-layer[\s\S]*inset: 0 !important/);
  assert.match(authority, /html\[data-physical-mobile="true"\] \.nara-assistant-shell[\s\S]*width: auto !important/);
  assert.match(authority, /\.nara-composer-tools[\s\S]*grid-template-columns:/);
  assert.match(authority, /\.nara-composer input\[type="file"\][\s\S]*display: none !important/);
});

test("Nara launcher and complete capability center remain available", () => {
  assert.match(authority, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(authority, /\.nara-assistant-layer[\s\S]*z-index: 30000 !important/);
  assert.match(authority, /html\[data-physical-mobile="true"\] \.nara-floating-button[\s\S]*place-items: center !important/);
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

test("inactive commerce stays hidden while PWA updates to v14", () => {
  assert.match(billing, /function upgradeButtons\(\)/);
  assert.match(billing, /upgrades\.forEach\(conceal\)/);
  assert.match(serviceWorker, /ngeblogging-app-v14-20260724/);
});
