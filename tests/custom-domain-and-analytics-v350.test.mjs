import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("custom-domain repair uses an active Cloudflare zone and explicit zone_id", () => {
  const script = read("scripts/repair-custom-domain-v350.mjs");
  assert.match(script, /workers\/domains/);
  assert.match(script, /zone_id: zoneId/);
  assert.match(script, /zoneStatus/);
  assert.match(script, /DNS publik belum sehat/);
  assert.match(script, /HTTPS publik belum menyajikan situs Ngeblogging/);
});

test("retired custom-domain repair workflow is manual and audit-only", () => {
  const workflow = read(".github/workflows/custom-domain-repair.yml");
  const executable = workflow.split("\n").filter((line) => !/^\s*#/.test(line)).join("\n");
  assert.match(executable, /^on:\s*\n  workflow_dispatch:\s*\npermissions:/m);
  assert.match(executable, /^permissions:\s*\n  contents: read\s*\njobs:/m);
  assert.match(executable, /run: node --test tests\/platform-domain-deployment\.test\.mjs/);
  assert.match(executable, /Configuration audit only/);
  assert.match(executable, /Customer domains must use the authenticated Domain and Publication flow/);
  assert.match(executable, /no domain was attached or verified by this workflow/);
  assert.doesNotMatch(executable, /repair-custom-domain-v350\.mjs|TARGET_DOMAIN|Public smoke test passed/);
  assert.doesNotMatch(executable, /secrets\.|wrangler\s+(?:deploy|publish)|curl\s|cloudflare:attach-domains|workers\/domains/);
});

test("analytics final authority is imported after historical analytics CSS", () => {
  const studio = read("src/Studio.jsx");
  assert.match(studio, /studio-analytics-layout-v349\.js/);
  assert.match(studio, /studio-analytics-layout-v349\.css/);
});

test("analytics final authority isolates the title and prevents overflow", () => {
  const js = read("src/studio-analytics-layout-v349.js");
  const css = read("src/studio-analytics-layout-v349.css");
  assert.match(js, /sn-analytics-view-v349/);
  assert.match(js, /dataset\.analyticsLayoutV349/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /max-width: 100%/);
  assert.match(css, /op41-table-wrap/);
});
