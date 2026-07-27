import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL(
    "../supabase/migrations/20260727090851_restore_authenticated_site_domain_writes_v66.sql",
    import.meta.url,
  ),
  "utf8",
);

test("custom-domain storage keeps anonymous clients read-only", () => {
  assert.match(
    migration,
    /revoke insert, update, delete on public\.site_domains from anon;/i,
  );
  assert.match(
    migration,
    /grant select on public\.site_domains to anon;/i,
  );
});

test("authenticated site owners and admins retain domain CRUD before RLS checks", () => {
  assert.match(
    migration,
    /grant select, insert, update, delete on public\.site_domains to authenticated;/i,
  );
  assert.match(migration, /row-level security/i);
  assert.match(migration, /site owners and admins/i);
});
