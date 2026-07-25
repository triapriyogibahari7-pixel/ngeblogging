import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const worker = read("cloudflare/worker.mjs");
const secure = read("src/StudioSecure.jsx");
const authority = read("src/studio-responsive-v23.css");
const runtime = read("src/studio-runtime-v23.js");
const commandCenter = read("src/nara-command-center-bridge.js");

test("Nara follows real provider health without disappearing or locking the application", () => {
  assert.match(worker, /function naraTextReady\(env\)/);
  assert.match(worker, /const nara = naraTextReady\(env\)/);
  assert.match(worker, /naraProviders: \{ qwen: qwenTextReady\(env\), workersAi: workersAiReady\(env\), vision: workersVisionReady\(env\) \}/);
  assert.match(worker, /imageGeneration,/);
  assert.doesNotMatch(worker, /uji produksi belum dinyatakan lulus/);

  assert.match(secure, /cache: "no-store"/);
  assert.match(secure, /dataset\.naraReady = String\(health\.nara === true\)/);
  assert.match(secure, /dataset\.naraImageReady = String\(health\.imageGeneration === true\)/);
  assert.match(secure, /dataset\.naraReady = "false"/);
  assert.match(runtime, /button\.hidden = false/);
  assert.match(runtime, /button\.disabled = false/);
  assert.match(authority, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(authority, /\.nara-floating-button[\s\S]*z-index: 2147483000 !important/);

  assert.match(commandCenter, /nara-command-center-v13-20260724/);
  assert.match(commandCenter, /Projects/);
  assert.match(commandCenter, /Baca QR/);
  assert.match(index, /nara-command-center-bridge\.js/);
  assert.match(index, /nara-v9-readiness\.css/);
  assert.match(index, /studio-responsive-v23\.css/);
  assert.doesNotMatch(index, /<script[^>]+nara-availability-bridge\.js/);
});
