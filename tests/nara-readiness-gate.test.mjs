import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../src/nara-availability-bridge.js", import.meta.url), "utf8");


test("Nara follows real provider health without disappearing or locking the application", () => {
  assert.match(worker, /function naraTextReady\(env\)/);
  assert.match(worker, /const nara = naraTextReady\(env\)/);
  assert.match(worker, /nara,/);
  assert.doesNotMatch(worker, /uji produksi belum dinyatakan lulus/);

  assert.match(bridge, /nara-capability-bridge-v10-20260724/);
  assert.match(bridge, /let availability = "pending"/);
  assert.match(bridge, /availability = health\.nara === false \? "degraded" : "ready"/);
  assert.match(bridge, /availability = "degraded"/);
  assert.match(bridge, /function scheduleRetry\(delay = 3000\)/);
  assert.match(bridge, /assistantLaunchers\(\)\.forEach/);
  assert.match(bridge, /reveal\(button\)/);
  assert.match(bridge, /preserveAssistantCapabilities\(\)/);
  assert.match(bridge, /billingReady = health\.billing === true/);
  assert.match(bridge, /imageGenerationReady = health\.imageGeneration === true/);

  assert.doesNotMatch(bridge, /function conceal\(node\)/);
  assert.doesNotMatch(bridge, /homeButton\(\)\?\.click\(\)/);
  assert.doesNotMatch(bridge, /controls\.forEach\(conceal\)/);
  assert.doesNotMatch(bridge, /removeInactiveOptions/);

  assert.match(index, /nara-availability-bridge\.js/);
  assert.match(index, /nara-v9-readiness\.css/);
  assert.match(index, /studio-v10-authority\.css/);
});
