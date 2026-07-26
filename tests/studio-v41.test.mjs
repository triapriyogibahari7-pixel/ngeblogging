import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("index loads v41 after v40 and preserves the domain v41 bridge", () => {
  const index = read("index.html");
  const v40Css = index.indexOf("studio-layout-device-v40.css");
  const v41LayoutCss = index.indexOf("studio-layout-lock-v41.css");
  const v41OperationsCss = index.indexOf("studio-operations-v41.css");
  const v40Js = index.indexOf("studio-layout-device-v40.js");
  const domainJs = index.indexOf("studio-domain-v41.js");
  const v41LayoutJs = index.indexOf("studio-layout-lock-v41.js");
  const v41OperationsJs = index.indexOf("studio-operations-v41.js");
  assert.ok(v40Css >= 0 && v41LayoutCss > v40Css && v41OperationsCss > v41LayoutCss);
  assert.ok(v40Js >= 0 && domainJs > v40Js && v41LayoutJs > domainJs && v41OperationsJs > v41LayoutJs);
});

test("layout authority distinguishes desktop tablet and mobile without touching Nara", () => {
  const css = read("src/studio-layout-lock-v41.css");
  const js = read("src/studio-layout-lock-v41.js");
  assert.match(js, /studio-responsive-v41-20260726/);
  assert.match(js, /dataset\.lb40Preview/);
  assert.match(js, /grid-template-areas:\"center center\" \"left right\"/);
  assert.match(js, /grid-template-areas:\"center\" \"left\" \"right\"/);
  assert.match(css, /data-preview-device="desktop"/);
  assert.match(css, /data-preview-device="tablet"/);
  assert.match(css, /data-preview-device="mobile"/);
  assert.doesNotMatch(css, /\.nara-|nara-floating|\.sn-side/);
});

test("analytics uses production RPC and offers an explicitly labeled simulation", () => {
  const source = read("src/studio-analytics-v41.js");
  assert.match(source, /get_site_analytics_dashboard/);
  assert.match(source, /if \(result\.error\) throw result\.error/);
  assert.match(source, /DATA PRODUKSI NYATA/);
  assert.match(source, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.match(source, /Manusia dan bot/);
  assert.match(source, /Distribusi perangkat/);
  assert.match(source, /Performa konten/);
});

test("members and domains remain gated by real backend readiness", () => {
  const members = read("src/studio-members-v41.js");
  const domains = read("src/studio-domains-v41.js");
  assert.match(members, /state\.memberInvites === true/);
  assert.match(members, /get_site_member_quota/);
  assert.match(members, /\/api\/member-invitations\/create/);
  assert.match(members, /reloadAfterMutation/);
  assert.match(domains, /state\.customDomains !== true/);
  assert.match(domains, /customDomainBindings/);
  assert.match(domains, /CLOUDFLARE_API_TOKEN/);
  assert.match(domains, /databaseAccess/);
  assert.match(domains, /SUPABASE JWT \+ ROW LEVEL SECURITY/);
  assert.match(domains, /Service-role server tidak diperlukan/);
  assert.match(domains, /reloadAfterMutation/);
  assert.match(domains, /1 · Arahkan trafik/);
  assert.match(domains, /2 · Verifikasi kepemilikan/);
});

test("active site identity and mobile operation surfaces are present", () => {
  const source = read("src/studio-operations-v41.js");
  const css = read("src/studio-operations-v41.css");
  const sw = read("public/sw.js");
  assert.match(source, /SITUS YANG SEDANG DIKELOLA/);
  assert.match(source, /Beralih situs/);
  assert.match(source, /Tambah situs/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /overflow-x: auto/);
  assert.match(sw, /ngeblogging-app-v41-20260726/);
});

test("live verification checks active-zone bindings and production collectors", () => {
  const workflow = read(".github/workflows/production-v41-verify.yml");
  assert.match(workflow, /domainRelease !== '2026\.07\.26-custom-domains-v41'/);
  assert.match(workflow, /databaseAccess/);
  assert.doesNotMatch(workflow, /EXPECT_SERVICE_ROLE/);
  assert.match(workflow, /analytics-collector/);
  assert.match(workflow, /service-worker-v41/);
});
