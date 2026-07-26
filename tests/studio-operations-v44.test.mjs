import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("operational layer loads after the responsive v43 authority", () => {
  const index = read("index.html");
  const repairCss = index.indexOf("studio-responsive-repair-v43.css");
  const operationsCss = index.indexOf("studio-operations-v41.css");
  const repairJs = index.indexOf("studio-responsive-repair-v43.js");
  const operationsJs = index.indexOf("studio-operations-v41.js");
  assert.ok(repairCss >= 0 && operationsCss > repairCss);
  assert.ok(repairJs >= 0 && operationsJs > repairJs);
});

test("analytics is backed by the production RPC and labels simulation honestly", () => {
  const source = read("src/studio-analytics-v41.js");
  assert.match(source, /get_site_analytics_dashboard/);
  assert.match(source, /if \(result\.error\) throw result\.error/);
  assert.match(source, /DATA PRODUKSI NYATA/);
  assert.match(source, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.match(source, /Manusia dan bot/);
  assert.match(source, /Distribusi perangkat/);
  assert.match(source, /Performa konten/);
});

test("members use real quota and invitation endpoints with post-mutation refresh", () => {
  const source = read("src/studio-members-v41.js");
  assert.match(source, /get_site_member_quota/);
  assert.match(source, /state\.memberInvites === true/);
  assert.match(source, /\/api\/member-invitations\/create/);
  assert.match(source, /\/api\/member-invitations\/cancel/);
  assert.match(source, /reloadAfterMutation/);
});

test("custom domains use active-zone readiness and two primary DNS records", () => {
  const source = read("src/studio-domains-v41.js");
  assert.match(source, /state\.customDomains !== true/);
  assert.match(source, /customDomainBindings/);
  assert.match(source, /databaseAccess/);
  assert.match(source, /SUPABASE JWT \+ ROW LEVEL SECURITY/);
  assert.match(source, /Service-role server tidak diperlukan/);
  assert.match(source, /1 · Arahkan trafik/);
  assert.match(source, /2 · Verifikasi kepemilikan/);
  assert.match(source, /\/api\/domains\/register/);
  assert.match(source, /reloadAfterMutation/);
});

test("active-site identity and responsive operation surfaces are present", () => {
  const source = read("src/studio-operations-v41.js");
  const css = read("src/studio-operations-v41.css");
  assert.match(source, /SITUS YANG SEDANG DIKELOLA/);
  assert.match(source, /Beralih situs/);
  assert.match(source, /Tambah situs/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /overflow-x: auto/);
  assert.doesNotMatch(css, /\.nara-|nara-floating-button/);
});
