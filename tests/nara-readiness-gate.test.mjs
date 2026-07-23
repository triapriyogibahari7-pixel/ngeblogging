import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../src/nara-availability-bridge.js", import.meta.url), "utf8");

test("Nara controls follow the production health signal", () => {
  assert.match(worker, /function naraReady\(env\)/);
  assert.match(worker, /nara: naraReady\(env\)/);
  assert.match(bridge, /dataset\.naraReady = "pending"/);
  assert.match(bridge, /naraReady = health\.nara === true/);
  assert.match(bridge, /function conceal\(button\)/);
  assert.match(bridge, /homeButton\(\)\?\.click\(\)/);
  assert.match(index, /nara-availability-bridge\.js/);
});
