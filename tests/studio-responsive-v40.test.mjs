import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v40 device authority loads last without replacing Nara or navigation", async () => {
  const html = await read("index.html");
  const runtime = await read("src/studio-layout-device-v40.js");
  const css = await read("src/studio-layout-device-v40.css");
  assert.ok(html.indexOf("studio-layout-device-v40.css") > html.indexOf("studio-quality-v39.css"));
  assert.ok(html.indexOf("studio-layout-device-v40.js") > html.indexOf("studio-quality-v39.js"));
  assert.match(runtime, /studio-layout-device-v40-20260726/);
  assert.match(runtime, /Desktop/);
  assert.match(runtime, /Tablet/);
  assert.match(runtime, /Ponsel \/ aplikasi/);
  assert.doesNotMatch(css, /\.nara-|\.sn-side/);
});

test("layout builder and published sites use different device geometry", async () => {
  const css = await read("src/studio-layout-device-v40.css");
  assert.match(css, /data-lb40-preview="desktop"[\s\S]*grid-template-areas: "left post right"/);
  assert.match(css, /data-lb40-preview="tablet"[\s\S]*grid-template-areas: "post post" "left right"/);
  assert.match(css, /data-lb40-preview="mobile"[\s\S]*grid-template-areas: "post" "left" "right"/);
  assert.match(css, /@media \(min-width: 621px\) and \(max-width: 980px\)[\s\S]*"center center" "left right"/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*grid-template-areas: "center" "left" "right"/);
  assert.match(css, /overflow-x: clip !important/);
});

test("site creation uses dynamic server capacity and hides a fixed maximum", async () => {
  const bridge = await read("src/site-quota-bridge.js");
  const migration = await read("supabase/migrations/20260726091500_dynamic_site_capacity_v40.sql");
  const worker = await read("cloudflare/worker-v37.mjs");
  assert.match(bridge, /KAPASITAS SITUS DINAMIS/);
  assert.match(bridge, /capacityMode = "dynamic"/);
  assert.doesNotMatch(bridge, /maksimum|maximum_limit|free_limit|\|\| 12/i);
  assert.match(migration, /private\.account_site_capacity/);
  assert.match(migration, /private\.site_limit_for_owner/);
  assert.match(migration, /allowed_limit between 1 and 1000000/);
  assert.match(migration, /select 1000/);
  assert.match(migration, /security invoker/);
  assert.match(worker, /siteCapacity: \{ mode:"dynamic", defaultLimit:1000, perAccountOverrides:true \}/);
  assert.match(worker, /siteLimits: \{ dynamic:true \}/);
});

test("Cloudflare deploy validates v40 domains responsive assets and capacity", async () => {
  const workflow = await read(".github/workflows/cloudflare.yml");
  for (const name of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID", "CLOUDFLARE_CUSTOM_HOSTNAME_TARGET", "SUPABASE_SERVICE_ROLE_KEY"]) {
    assert.ok(workflow.includes(`put_secret ${name}`), name);
  }
  assert.match(workflow, /responsiveLayoutV40/);
  assert.match(workflow, /health\.siteCapacity/);
  assert.match(workflow, /health\.customDomains/);
  assert.doesNotMatch(workflow, /siteLimits\?\.free|siteLimits\.free/);
});

test("PWA cache rotates for v40 while retaining compatibility markers", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v40-20260726/);
  assert.match(sw, /ngeblogging-app-v39-20260726/);
  assert.match(sw, /networkFirst/);
});
