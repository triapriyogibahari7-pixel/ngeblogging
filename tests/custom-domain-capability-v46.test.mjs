import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("health requires an independently verified Custom Hostnames capability", () => {
  const worker = read("cloudflare/worker-v41.mjs");
  assert.match(worker, /customHostnamesApi: enabled\(env\.CLOUDFLARE_CUSTOM_HOSTNAMES_READY\)/);
  assert.match(worker, /ready: Object\.values\(bindings\)\.every\(Boolean\)/);
  assert.match(worker, /customDomainBindings: domain\.bindings/);
});

test("Studio hides the custom-domain form while provider capability is unavailable", () => {
  const source = read("src/studio-domains-v41.js");
  assert.match(source, /CLOUDFLARE CUSTOM HOSTNAMES API/);
  assert.match(source, /bindings\.customHostnamesApi/);
  assert.match(source, /if \(state\.customDomains !== true\)/);
  assert.match(source, /Form domain hanya dibuka/);
});

test("activation workflow closes the gate before probing and opens it only after success", () => {
  const workflow = read(".github/workflows/custom-domains-v41.yml");
  const closeGate = workflow.indexOf("printf 'false' | npx wrangler secret put CLOUDFLARE_CUSTOM_HOSTNAMES_READY");
  const probe = workflow.indexOf("/custom_hostnames?per_page=5");
  const openGate = workflow.indexOf("CLOUDFLARE_CUSTOM_HOSTNAMES_READY: 'true'");
  assert.ok(closeGate >= 0 && probe > closeGate && openGate > probe);
  assert.match(workflow, /bindings\.customHostnamesApi/);
  assert.match(workflow, /form remains safely disabled/);
});
