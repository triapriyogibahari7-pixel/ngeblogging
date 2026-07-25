import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const responsive = read("src/studio-responsive-v23.css");
const runtime = read("src/studio-runtime-v23.js");
const secure = read("src/StudioSecure.jsx");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");
const billing = read("src/billing-availability-bridge.js");
const worker = read("cloudflare/worker.mjs");
const workersAi = read("server/workers-ai-nara.mjs");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const serviceWorker = read("public/sw.js");

test("phone navigation is sidebar-only with one edge control and a visible icon rail", () => {
  assert.match(index, /studio-responsive-v23\.css/);
  assert.match(index, /studio-runtime-v23\.js/);
  assert.match(responsive, /--sn-v23-rail: 64px/);
  assert.match(responsive, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-v23-rail\) !important/);
  assert.match(responsive, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom[\s\S]*display: none !important/);
  assert.match(runtime, /toggle\.dataset\.sidebarAuthority = "single-v23"/);
  assert.match(runtime, /if \(\(profile\.compact \|\| profile\.tablet\) && !side\.classList\.contains\("collapsed"\)\)/);
  assert.doesNotMatch(index, /<script[^>]+studio-mobile-navigation\.js|<script[^>]+studio-production-guard\.js|<script[^>]+nara-launcher-v20\.js/);
  assert.match(secure, /studio-source-navigation-v23-20260725/);
});

test("settings site manager theme content and Nara use bounded mobile layouts", () => {
  assert.match(responsive, /@media \(max-width: 760px\)/);
  assert.match(responsive, /\.sn-welcome,[\s\S]*\.sn-settings-grid[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(responsive, /\.sn-content-card/);
  assert.match(responsive, /data-physical-phone="true"\] \.nara-assistant-layer[\s\S]*inset: 0 !important/);
  assert.match(responsive, /data-physical-phone="true"\] \.nara-assistant-shell[\s\S]*height: 100% !important/);
  assert.match(responsive, /\.nara-composer-tools[\s\S]*display: flex !important/);
  assert.match(responsive, /\.nara-composer input\[type="file"\][\s\S]*display: none !important/);
});

test("Nara launcher and complete capability center remain available", () => {
  assert.match(assistant, /className="nara-floating-button" onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(responsive, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(responsive, /\.nara-assistant-layer[\s\S]*z-index: 2147483600 !important/);
  assert.doesNotMatch(index, /<script[^>]+nara-launcher-v20\.js/);
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

test("inactive commerce stays hidden while PWA updates to v23", () => {
  assert.match(billing, /function upgradeButtons\(\)/);
  assert.match(billing, /upgrades\.forEach\(conceal\)/);
  assert.match(serviceWorker, /ngeblogging-app-v23-20260725/);
});
