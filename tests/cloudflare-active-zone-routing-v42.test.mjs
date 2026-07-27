import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const requiredRoutes = ["*/*", "ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"];

test("production workflow resolves the zone with the dedicated token and proves live routes", async () => {
  const workflow = await read(".github/workflows/cloudflare.yml");
  assert.match(workflow, /CLOUDFLARE_DOMAIN_API_TOKEN/);
  assert.match(workflow, /RESOLVED_CLOUDFLARE_ZONE_ID/);
  assert.match(workflow, /wrangler\.production\.active-zone\.jsonc/);
  assert.match(workflow, /zones\/\$\{RESOLVED_CLOUDFLARE_ZONE_ID\}\/workers\/routes/);
  assert.match(workflow, /routes\.get\(pattern\) !== 'ngeblogging'/);
  assert.match(workflow, /Verify dedicated custom-domain token permissions/);
  assert.match(workflow, /zoneCreateEndpointAuthorized/);
  assert.match(workflow, /Worker full-zone v62 dan token domain khusus/);
  assert.match(workflow, /WORKERS_DEV_SMOKE_TEST_URL/);
  assert.match(workflow, /TENANT_SMOKE_TEST_URL/);
  assert.match(workflow, /API_SMOKE_TEST_URL/);
  assert.match(workflow, /ngeblogging\.triapriyogibahari7\.workers\.dev/);
  assert.match(workflow, /access-control-request-method: POST/);
  assert.match(workflow, /x-ngeblogging-api-origin/);
});

test("generated Wrangler configuration pins every official and SaaS route to the resolved zone and account", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ngeblogging-zone-v42-"));
  const input = join(directory, "input.jsonc");
  const output = join(directory, "output.jsonc");
  await writeFile(input, JSON.stringify({ name: "ngeblogging", routes: [{ pattern: "old.example/*", zone_name: "old.example" }] }), "utf8");

  await execFileAsync(process.execPath, [new URL("../scripts/build-active-zone-wrangler.mjs", import.meta.url).pathname, input, output], {
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: "",
      RESOLVED_CLOUDFLARE_ZONE_ID: "0123456789abcdef0123456789abcdef",
      RESOLVED_CLOUDFLARE_ACCOUNT_ID: "fedcba9876543210fedcba9876543210",
    },
  });

  const generated = JSON.parse(await readFile(output, "utf8"));
  assert.equal(generated.account_id, "fedcba9876543210fedcba9876543210");
  assert.deepEqual(generated.routes.map((route) => route.pattern), requiredRoutes);
  for (const route of generated.routes) {
    assert.equal(route.zone_id, "0123456789abcdef0123456789abcdef");
    assert.equal(route.zone_name, undefined);
  }
});

test("generated Wrangler upload preserves existing routes when Zone Read is unavailable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ngeblogging-preserve-routes-v60-"));
  const input = join(directory, "input.jsonc");
  const output = join(directory, "output.jsonc");
  await writeFile(input, JSON.stringify({
    name: "ngeblogging",
    routes: requiredRoutes.map((pattern) => ({ pattern, zone_name: "ngeblogging.com" })),
  }), "utf8");

  await execFileAsync(process.execPath, [new URL("../scripts/build-active-zone-wrangler.mjs", import.meta.url).pathname, input, output], {
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: "",
      CLOUDFLARE_ZONE_ID: "",
      RESOLVED_CLOUDFLARE_ZONE_ID: "",
      CLOUDFLARE_ACCOUNT_ID: "fedcba9876543210fedcba9876543210",
      RESOLVED_CLOUDFLARE_ACCOUNT_ID: "fedcba9876543210fedcba9876543210",
    },
  });

  const generated = JSON.parse(await readFile(output, "utf8"));
  assert.equal(generated.account_id, "fedcba9876543210fedcba9876543210");
  assert.equal(Object.hasOwn(generated, "routes"), false);
});
