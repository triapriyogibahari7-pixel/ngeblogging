import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [provider, failover, css, precision, index, sw] = await Promise.all([
  read("server/cloudflare-full-zone-provider.mjs"),
  read("src/api-origin-failover-v60.js"),
  read("src/domain-mobile-precision-v61.css"),
  read("src/domain-mobile-precision-v61.js"),
  read("index.html"),
  read("public/sw.js"),
]);

test("v61 maps missing Cloudflare zone-create permission to a precise user error", () => {
  assert.match(provider, /CLOUDFLARE_ZONE_CREATE_PERMISSION_REQUIRED/);
  assert.match(provider, /com\.cloudflare\.api\.account\.zone\.create/);
  assert.match(provider, /Zone: Edit\/Create/);
  assert.match(provider, /CLOUDFLARE_DOMAIN_API_TOKEN/);
});

test("v61 reuses existing zones and retries nameserver hydration", () => {
  assert.match(provider, /findFullZone\(env, name\)/);
  assert.match(provider, /hydrateNameservers/);
  assert.match(provider, /\[0, 350, 800, 1500\]/);
  assert.match(provider, /raced/);
});

test("v61 failover validates JSON bodies instead of trusting content-type", () => {
  assert.match(failover, /JSON\.parse\(text\)/);
  assert.match(failover, /validJson/);
  assert.match(failover, /primaryBodyPreview/);
  assert.match(failover, /api-origin-failover-v61-20260727/);
});

test("v61 archived precision source keeps managed subdomains on one responsive line", () => {
  assert.match(css, /white-space:nowrap!important/);
  assert.match(css, /text-overflow:ellipsis!important/);
  assert.match(css, /overflow-wrap:normal!important/);
  assert.match(precision, /fitHostname/);
  assert.match(precision, /ResizeObserver/);
  assert.match(precision, /--d61-hostname-size/);
});

test("v61 UI assets are archived while v76 owns production and rotates cache", () => {
  assert.match(index, /domain-mobile-precision-v61\.css[^>]*media="not all"[^>]*data-disabled-authority="domain-v76"/);
  assert.match(index, /type="application\/x-disabled" src="\/src\/domain-mobile-precision-v61\.js" data-disabled-authority="domain-v76"/);
  assert.doesNotMatch(index, /type="module" src="\/src\/domain-mobile-precision-v61\.js"/);
  assert.match(index, /ngeblogging-domain-authority" content="single-domain-authority-v76"/);
  assert.match(sw, /ngeblogging-app-v76-20260727/);
  assert.match(sw, /ngeblogging-app-v61-20260727/);
});
