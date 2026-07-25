import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-shell-v29.css");
const runtime = read("src/studio-shell-v29.js");
const secure = read("src/StudioSecure.jsx");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");
const billing = read("src/billing-availability-bridge.js");
const worker = read("cloudflare/worker.mjs");
const workersAi = read("server/workers-ai-nara.mjs");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const serviceWorker = read("public/sw.js");

test("phone navigation is a Cloudflare-style drawer with one n. launcher and internal X", () => {
  assert.match(index, /studio-shell-v29\.css/);
  assert.match(index, /studio-shell-v29\.js/);
  assert.match(css, /--sn-v29-panel: min\(84vw, 360px\)/);
  assert.match(css, /\.sn-mobile-v29-launcher[\s\S]*top: 50dvh !important/);
  assert.match(css, /\.sn-mobile-v29-close[\s\S]*display: grid !important/);
  assert.match(css, /\.sn-mobile-v29-scrim[\s\S]*backdrop-filter: none !important/);
  assert.match(runtime, /sn-mobile-v29-brand/);
  assert.match(runtime, /Cari menu…/);
  assert.match(runtime, /if \(profile\.compact && !side\.classList\.contains\("collapsed"\)\)/);
  assert.doesNotMatch(index, /<script[^>]+studio-mobile-navigation\.js|<script[^>]+studio-production-guard\.js|<script[^>]+nara-launcher-v20\.js/);
  assert.match(secure, /studio-source-navigation-v29-20260725/);
});

test("settings site manager theme content and Nara use bounded mobile layouts", () => {
  assert.match(css, /html\.studio-v29-compact \.sn-shell/);
  assert.match(css, /html\.studio-v29-compact \.sn-shell > \.sn-main[\s\S]*width: 100% !important/);
  assert.match(css, /\.nara-assistant-layer\[data-nara-shell-v29="true"\] > \.nara-assistant-shell[\s\S]*max-width: calc\(100vw - 24px\) !important/);
  assert.match(css, /data-nara-size-v29="mini"[\s\S]*width: min\(350px/);
  assert.match(css, /data-nara-size-v29="compact"[\s\S]*height: min\(640px/);
  assert.match(css, /\.nara-assistant-layer\[data-nara-shell-v29="true"\] \.nara-composer-tools[\s\S]*display: flex !important/);
});

test("Nara launcher and complete capability center remain available", () => {
  assert.match(assistant, /className="nara-floating-button" onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(css, /\.nara-assistant-layer\[data-nara-shell-v29="true"\][\s\S]*z-index: 2147483600 !important/);
  assert.doesNotMatch(index, /<script[^>]+nara-launcher-v20\.js/);
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector"]) assert.ok(commandCenter.includes(marker), marker);
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  assert.match(runtime, /SpeechSynthesisUtterance/);
  assert.match(runtime, /Mode kerja Nara/);
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

test("inactive commerce stays hidden while PWA updates to v29", () => {
  assert.match(billing, /function upgradeButtons\(\)/);
  assert.match(billing, /upgrades\.forEach\(conceal\)/);
  assert.match(serviceWorker, /ngeblogging-app-v29-20260725/);
});
