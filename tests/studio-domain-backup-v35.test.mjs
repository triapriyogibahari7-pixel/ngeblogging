import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v35 loads after v34 and its runtime is last among the v35 pair", async () => {
  const html = await read("index.html");
  assert.ok(html.indexOf("studio-domain-backup-v35.css") > html.indexOf("studio-content-flow-v34.css"));
  assert.ok(html.indexOf("studio-domain-backup-v35.js") > html.indexOf("studio-content-flow-v34.js"));
});

test("legacy v35 no longer moves domain preview or hostname cards", async () => {
  const runtime = await read("src/studio-domain-backup-v35.js");
  assert.match(runtime, /domain-manager-v78-20260727/);
  assert.match(runtime, /Halaman Domain tidak lagi diubah/);
  assert.doesNotMatch(runtime, /normalizeDomain/);
  assert.doesNotMatch(runtime, /sn-domain-preview-row-v35/);
  assert.doesNotMatch(runtime, /row\.append\(action\)/);
  assert.doesNotMatch(runtime, /insertAdjacentElement\("afterend", card\)/);
});

test("backup cards and headings have explicit mobile-safe normal flow", async () => {
  const css = await read("src/studio-domain-backup-v35.css");
  for (const marker of [
    "#ngeblogging-backup-center .nb-backup-head",
    "#ngeblogging-backup-center .nb-backup-grid",
    "#ngeblogging-backup-center .nb-backup-card",
    "#ngeblogging-backup-center .nb-backup-manifest",
    "grid-template-columns: 42px minmax(0, 1fr)",
  ]) assert.ok(css.includes(marker), marker);
  assert.match(css, /position: static !important/);
  assert.match(css, /overflow-wrap: anywhere !important/);
});

test("v35 does not target the locked sidebar or Nara widget", async () => {
  const css = await read("src/studio-domain-backup-v35.css");
  const runtime = await read("src/studio-domain-backup-v35.js");
  for (const forbidden of [".sn-side", ".sn-mobile-v30", ".nara-"]) {
    const pattern = new RegExp(forbidden.replace(".", "\\."));
    assert.doesNotMatch(css, pattern);
    assert.doesNotMatch(runtime, pattern);
  }
});

test("twelve-site authority is restored as the production account capacity", async () => {
  const bridge = await read("src/site-quota-bridge.js");
  const migration = await read("supabase/migrations/20260726140500_enforce_twelve_site_capacity_v55.sql");
  const productionWorker = await read("cloudflare/worker-v37.mjs");
  assert.match(bridge, /MAX_SITES_PER_ACCOUNT = 12/);
  assert.match(bridge, /KAPASITAS 12 SITUS PER AKUN/);
  assert.match(bridge, /capacityMode = "twelve-sites"/);
  assert.match(migration, /select 12;/);
  assert.match(migration, /greatest\(12 - state\.current_count, 0\)/);
  assert.match(productionWorker, /siteCapacity: \{ mode: "fixed", defaultLimit: 12, perAccountOverrides: false \}/);
  assert.match(productionWorker, /siteLimitsDeprecated: false/);
});

test("production worker keeps the v35 compatibility contract while workspaces remain independent", async () => {
  const config = await read("wrangler.production.jsonc");
  const worker = await read("cloudflare/worker-v35.mjs");
  assert.match(config, /worker-v35\.mjs/);
  assert.match(config, /2026\.07\.25-studio-v35/);
  assert.match(worker, /siteLimits: \{ free: 12, maximum: 12 \}/);
  assert.match(worker, /independentSiteWorkspaces: true/);
});

test("PWA cache keeps v35 compatibility and rotates to v40", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v40-20260726/);
  assert.match(sw, /ngeblogging-app-v35-20260725/);
  assert.match(sw, /ngeblogging-app-v34-20260725/);
});
