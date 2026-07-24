import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
const authority = readFileSync(new URL("../src/nara-interaction-authority.css", import.meta.url), "utf8");


test("Nara follows real provider health without disappearing or locking the application", () => {
  assert.match(worker, /function naraTextReady\(env\)/);
  assert.match(worker, /const nara = naraTextReady\(env\)/);
  assert.match(worker, /nara,/);
  assert.match(worker, /imageGenerationReady/);
  assert.match(worker, /workersVisionReady/);
  assert.doesNotMatch(worker, /uji produksi belum dinyatakan lulus/);

  assert.match(secure, /fetch\("\/api\/health"/);
  assert.match(secure, /cache: "no-store"/);
  assert.match(secure, /dataset\.naraReady = String\(health\.nara === true\)/);
  assert.match(secure, /dataset\.naraImageReady = String\(health\.imageGeneration === true\)/);
  assert.match(secure, /dataset\.billingReady = String\(health\.billing === true\)/);
  assert.match(secure, /button\.hidden = false/);
  assert.match(secure, /button\.disabled = false/);
  assert.match(secure, /button\.style\.removeProperty\("pointer-events"\)/);
  assert.match(authority, /\.nara-floating-button/);
  assert.match(authority, /pointer-events:\s*auto\s*!important/);

  assert.match(index, /nara-v9-readiness\.css/);
  assert.match(index, /studio-v14-authority\.css/);
  assert.match(index, /nara-interaction-authority\.css/);
  assert.doesNotMatch(index, /nara-availability-bridge\.js/);
});
