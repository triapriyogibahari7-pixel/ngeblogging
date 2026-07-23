import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const bootstrap = readFileSync(new URL("../supabase/migrations/202607231920_fix_cloud_workspace_bootstrap.sql", import.meta.url), "utf8");
const slugFix = readFileSync(new URL("../supabase/migrations/202607231925_fix_workspace_slug_validation.sql", import.meta.url), "utf8");
const contentGrant = readFileSync(new URL("../supabase/migrations/202607231930_grant_authenticated_content_crud.sql", import.meta.url), "utf8");
const workspaceBridge = readFileSync(new URL("../src/workspace-rpc-bridge.js", import.meta.url), "utf8");
const migrationBridge = readFileSync(new URL("../src/device-content-migration-bridge.js", import.meta.url), "utf8");


test("workspace creation is atomic, authenticated, and uses the authoritative 5/12 quota", () => {
  assert.match(bootstrap, /drop trigger if exists sites_enforce_account_quota/);
  assert.match(bootstrap, /drop function if exists private\.enforce_site_account_quota/);
  assert.match(bootstrap, /create or replace function public\.create_site_workspace/);
  assert.match(bootstrap, /security definer/);
  assert.match(bootstrap, /private\.site_limit_for_plan\(account_plan\)/);
  assert.match(bootstrap, /pg_advisory_xact_lock/);
  assert.match(bootstrap, /grant execute on function public\.create_site_workspace/);
  assert.match(slugFix, /reserved_slugs constant text\[\]/);
  assert.match(slugFix, /exists \(select 1 from public\.sites s where s\.slug = normalized_slug\)/);
  assert.doesNotMatch(slugFix, /public\.is_site_slug_available/);
});


test("the Studio create-site action is routed through the server RPC", () => {
  assert.match(index, /workspace-rpc-bridge\.js/);
  assert.match(workspaceBridge, /\.sn-create-site > button\.sn-primary/);
  assert.match(workspaceBridge, /supabase\.rpc\("create_site_workspace"/);
  assert.match(workspaceBridge, /event\.stopImmediatePropagation/);
  assert.match(workspaceBridge, /ACTIVE_SITE_STORAGE_KEY/);
  assert.match(workspaceBridge, /window\.location\.reload/);
});


test("authenticated cloud content CRUD has table grants in addition to RLS", () => {
  assert.match(contentGrant, /grant select, insert, update, delete on public\.contents to authenticated/);
  assert.match(contentGrant, /grant select on public\.contents to anon/);
  assert.match(contentGrant, /always constrained by row-level security policies/);
});


test("device documents migrate explicitly without deleting the local backup", () => {
  assert.match(index, /device-content-migration-bridge\.css/);
  assert.match(index, /device-content-migration-bridge\.js/);
  assert.match(migrationBridge, /const LOCAL_STORE = "ngeblogging-studio-v3"/);
  assert.match(migrationBridge, /Pindahkan ke Cloud/);
  assert.match(migrationBridge, /device_import/);
  assert.match(migrationBridge, /supabase\.from\("contents"\)\.insert\(payload\)/);
  assert.match(migrationBridge, /Tidak ada data lokal yang dihapus/);
  assert.match(migrationBridge, /Salinan perangkat tetap disimpan sebagai cadangan/);
  assert.match(migrationBridge, /window\.location\.reload/);
  assert.doesNotMatch(migrationBridge, /removeItem\(LOCAL_STORE\)/);
});
