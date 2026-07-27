import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20260727091000_restore_authenticated_site_domain_writes_v66.sql", import.meta.url),
  "utf8",
);

test("authenticated site owners and admins can persist custom-domain state", () => {
  assert.match(
    migration,
    /grant select, insert, update, delete on public\.site_domains to authenticated;/,
  );
  assert.match(
    migration,
    /revoke insert, update, delete on public\.site_domains from anon;/,
  );
});

test("database privileges still rely on row-level security rather than anonymous writes", () => {
  assert.doesNotMatch(
    migration,
    /grant[^;]*\binsert\b[^;]*on public\.site_domains to anon;/i,
  );
  assert.doesNotMatch(
    migration,
    /grant[^;]*\bupdate\b[^;]*on public\.site_domains to anon;/i,
  );
});
