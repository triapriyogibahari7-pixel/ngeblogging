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

test("custom-domain workflow is manually runnable and invokes the repair script", () => {
  const workflow = read(".github/workflows/custom-domain-repair.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /repair-custom-domain-v350\.mjs/);
  assert.match(workflow, /TARGET_DOMAIN/);
  assert.match(workflow, /Public smoke test passed/);
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
