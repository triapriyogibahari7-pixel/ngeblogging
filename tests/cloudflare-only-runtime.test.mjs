import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const worker = readFileSync(new URL("cloudflare/worker.mjs", root), "utf8");
const api = readFileSync(new URL("api/server.mjs", root), "utf8");
const naraTests = readFileSync(new URL("tests/nara.test.mjs", root), "utf8");
const runtime = readFileSync(new URL("server/nara-runtime.mjs", root), "utf8");

test("legacy deployment configuration and runtime directory are absent", () => {
  assert.equal(existsSync(new URL("netlify.toml", root)), false);
  assert.equal(existsSync(new URL("netlify/", root)), false);
});

test("all executable Nara entrypoints use the portable runtime", () => {
  assert.match(worker, /server\/nara-runtime\.mjs/);
  assert.match(api, /server\/nara-runtime\.mjs/);
  assert.match(naraTests, /server\/nara-runtime\.mjs/);
  assert.doesNotMatch(worker, /x-nf-client-connection-ip|netlify\/functions/);
  assert.doesNotMatch(api, /x-nf-client-connection-ip|netlify\/functions/);
  assert.doesNotMatch(naraTests, /x-nf-client-connection-ip|netlify\/functions/);
});

test("portable runtime identifies itself independently and rejects legacy provider origins", () => {
  assert.match(runtime, /portable-nara-v4/);
  assert.match(runtime, /legacyProviderOrigin/);
  assert.match(runtime, /ORIGIN_NOT_ALLOWED/);
});
