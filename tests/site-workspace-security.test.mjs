import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260723143000_make_site_workspace_rpc_security_invoker.sql", import.meta.url), "utf8");

test("site creation RPC runs as the authenticated caller", () => {
  assert.match(migration, /create or replace function public\.create_site_workspace/);
  assert.match(migration, /security invoker/);
  assert.doesNotMatch(migration, /security definer/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /then 5 else 12/);
  assert.match(migration, /SITE_LIMIT_REACHED/);
  assert.match(migration, /new\.slug|normalized_slug/);
  assert.match(migration, /revoke all on function public\.create_site_workspace\(text,text,text,text\) from anon/);
  assert.match(migration, /grant execute on function public\.create_site_workspace\(text,text,text,text\) to authenticated/);
});
