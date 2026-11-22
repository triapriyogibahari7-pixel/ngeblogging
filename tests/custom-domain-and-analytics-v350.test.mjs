import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

function assertAuditOnlyWorkflow(workflow) {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /^permissions:\s*\n\s+contents:\s*read\s*$/m);
  assert.doesNotMatch(workflow, /\bwrite(?:-all)?\b|\$\{\{\s*secrets\./);
  const actions = [...workflow.matchAll(/^\s+- uses:\s*(\S+)\s*$/gm)].map(match => match[1]);
  assert.deepEqual(actions, ["actions/checkout@v4", "actions/setup-node@v4"]);
  const commands = [...workflow.matchAll(/^\s+run:\s*(.+)$/gm)].map(match => match[1]);
  assert.deepEqual(commands, [
    "node --test tests/platform-domain-deployment.test.mjs",
    "echo 'Configuration audit only. Customer domains must use the authenticated Domain and Publication flow; no domain was attached or verified by this workflow.'",
  ]);
}

test("custom-domain repair uses an active Cloudflare zone and explicit zone_id", () => {
  const script = read("scripts/repair-custom-domain-v350.mjs");
  assert.match(script, /workers\/domains/);
  assert.match(script, /zone_id: zoneId/);
  assert.match(script, /zoneStatus/);
  assert.match(script, /DNS publik belum sehat/);
  assert.match(script, /HTTPS publik belum menyajikan situs Ngeblogging/);
});

test("custom-domain workflow is manually runnable and remains audit-only", () => {
  assertAuditOnlyWorkflow(read(".github/workflows/custom-domain-repair.yml"));
});

test("custom-domain audit contract rejects provisioning, secrets and write permissions", () => {
  const workflow = read(".github/workflows/custom-domain-repair.yml");
  const invalid = [
    workflow.replace("node --test tests/platform-domain-deployment.test.mjs", "node scripts/repair-custom-domain-v350.mjs"),
    workflow.replace("contents: read", "contents: write"),
    workflow + "\nenv:\n  TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}\n",
    workflow + "\n      - name: Unexpected deployment\n        run: npx wrangler deploy\n",
    workflow.replace("actions/setup-node@v4", "untrusted/action@main"),
  ];
  for (const source of invalid) assert.throws(() => assertAuditOnlyWorkflow(source));
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
