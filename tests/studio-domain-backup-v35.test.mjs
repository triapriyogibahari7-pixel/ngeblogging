import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v35 loads after v34 and its runtime is last", async () => {
  const html = await read("index.html");
  assert.ok(html.indexOf("studio-domain-backup-v35.css") > html.indexOf("studio-content-flow-v34.css"));
  assert.ok(html.indexOf("studio-domain-backup-v35.js") > html.indexOf("studio-content-flow-v34.js"));
});

test("domain preview is moved into an independent row before the hostname card", async () => {
  const runtime = await read("src/studio-domain-backup-v35.js");
  assert.match(runtime, /Domain & publikasi/);
  assert.match(runtime, /sn-domain-preview-row-v35/);
  assert.match(runtime, /row\.append\(action\)/);
  assert.match(runtime, /row\.insertAdjacentElement\("afterend", card\)/);
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

test("every account quota and database authority are twelve sites", async () => {
  const bridge = await read("src/site-quota-bridge.js");
  const migration = await read("supabase/migrations/20260725150000_expand_all_accounts_to_12_sites.sql");
  assert.match(bridge, /allowed_limit \|\| 12/);
  assert.match(bridge, /free_limit \|\| 12/);
  assert.match(migration, /create or replace function private\.site_limit_for_plan/);
  assert.match(migration, /select 12;/);
  assert.match(migration, /private\.site_limit_for_plan\(state\.plan\)/);
  assert.match(migration, /private\.site_limit_for_plan\(account_plan\)/);
});

test("PWA cache rotates to v35", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v35-20260725/);
  assert.match(sw, /ngeblogging-app-v34-20260725/);
});
