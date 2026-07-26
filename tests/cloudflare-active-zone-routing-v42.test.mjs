import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const requiredRoutes = ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"];

test("production workflow resolves one active zone and verifies route ownership", async () => {
  const workflow = await read(".github/workflows/cloudflare.yml");
  assert.match(workflow, /zones\?name=ngeblogging\.com&status=active&per_page=10/);
  assert.match(workflow, /RESOLVED_CLOUDFLARE_ZONE_ID/);
  assert.match(workflow, /wrangler\.production\.active-zone\.jsonc/);
  assert.match(workflow, /zones\/\$\{RESOLVED_CLOUDFLARE_ZONE_ID\}\/workers\/routes/);
  assert.match(workflow, /routes\.get\(pattern\) !== 'ngeblogging'/);
  assert.match(workflow, /WORKERS_DEV_SMOKE_TEST_URL/);
});

test("generated Wrangler configuration pins every official route to the resolved zone", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ngeblogging-zone-v42-"));
  const input = join(directory, "input.jsonc");
  const output = join(directory, "output.jsonc");
  const accountId = "fedcba9876543210fedcba9876543210";
  await writeFile(input, JSON.stringify({ name: "ngeblogging", routes: [{ pattern: "old.example/*", zone_name: "old.example" }] }), "utf8");

  await execFileAsync(process.execPath, [new URL("../scripts/build-active-zone-wrangler.mjs", import.meta.url).pathname, input, output], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      RESOLVED_CLOUDFLARE_ZONE_ID: "0123456789abcdef0123456789abcdef",
      CLOUDFLARE_API_TOKEN: "test-token",
      CLOUDFLARE_ACCOUNT_ID: accountId,
      RESOLVED_CLOUDFLARE_ACCOUNT_ID: accountId,
      NGEBLOGGING_SKIP_CLOUDFLARE_ZONE_FETCH: "true",
    },
  });

  const generated = JSON.parse(await readFile(output, "utf8"));
  assert.equal(generated.account_id, accountId);
  assert.deepEqual(generated.routes.map((route) => route.pattern), requiredRoutes);
  for (const route of generated.routes) {
    assert.equal(route.zone_id, "0123456789abcdef0123456789abcdef");
    assert.equal(route.zone_name, undefined);
  }
});
