import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../src/auth-readiness-bridge.js", import.meta.url), "utf8");

test("branded email registration stays hidden until a real inbox delivery probe passes", () => {
  assert.match(worker, /const deliveryProbe = String\(env\.AUTH_EMAIL_DELIVERY_PROBE/);
  assert.match(worker, /deliveryProbe === "passed"/);
  assert.match(worker, /sender\.endsWith\("@ngeblogging\.com"\)/);
  assert.match(wrangler, /"AUTH_BRANDED_EMAIL_READY": "false"/);
  assert.match(wrangler, /"AUTH_EMAIL_DELIVERY_PROBE": "not-run"/);
  assert.match(bridge, /emailRegistrationReady = health\.emailRegistration === true/);
  assert.match(bridge, /leaveSignupMode\(modal\)/);
  assert.match(bridge, /\.magic-link-button,\.forgot-link/);
  assert.match(bridge, /row\.hidden = true/);
  assert.doesNotMatch(bridge, /Email resmi sedang dikunci/);
});
