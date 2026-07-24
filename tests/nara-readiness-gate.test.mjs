import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../src/nara-availability-bridge.js", import.meta.url), "utf8");

test("Nara controls follow real provider health and survive transient network failures", () => {
  assert.match(worker, /function naraTextReady\(env\)/);
  assert.match(worker, /const nara = naraTextReady\(env\)/);
  assert.match(worker, /nara,/);
  assert.doesNotMatch(worker, /NARA_PRODUCTION_PROBE/);
  assert.doesNotMatch(worker, /uji produksi belum dinyatakan lulus/);
  assert.match(bridge, /let availability = "pending"/);
  assert.match(bridge, /availability = health\.nara === false \? "unavailable" : "ready"/);
  assert.match(bridge, /availability = "unknown"/);
  assert.match(bridge, /function scheduleRetry\(delay = 2500\)/);
  assert.match(bridge, /function conceal\(node\)/);
  assert.match(bridge, /homeButton\(\)\?\.click\(\)/);
  assert.match(bridge, /billingReady = health\.billing === true/);
  assert.match(bridge, /imageGenerationReady = health\.imageGeneration === true/);
  assert.match(index, /nara-availability-bridge\.js/);
  assert.match(index, /nara-v9-readiness\.css/);
});
