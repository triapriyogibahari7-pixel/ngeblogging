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

test("site creation uses a server-enforced twelve-site account capacity", async () => {
  const bridge = await read("src/site-quota-bridge.js");
  const migration = await read("supabase/migrations/20260726140500_enforce_twelve_site_capacity_v55.sql");
  const worker = await read("cloudflare/worker-v37.mjs");
  assert.match(bridge, /MAX_SITES_PER_ACCOUNT = 12/);
  assert.match(bridge, /KAPASITAS 12 SITUS PER AKUN/);
  assert.match(bridge, /capacityMode = "twelve-sites"/);
  assert.match(bridge, /createButton\.disabled = !canCreate/);
  assert.match(migration, /private\.site_limit_for_owner/);
  assert.match(migration, /select 12;/);
  assert.match(migration, /security invoker/);
  assert.match(worker, /siteCapacity: \{ mode: "fixed", defaultLimit: 12, perAccountOverrides: false \}/);
});

test("PWA cache rotates for v40 while retaining compatibility markers", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v40-20260726/);
  assert.match(sw, /ngeblogging-app-v39-20260726/);
  assert.match(sw, /networkFirst/);
});
