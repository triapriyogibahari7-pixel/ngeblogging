import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-theme-domain-v50.css");
const runtime = read("src/studio-theme-domain-v50.js");
const domains = read("src/studio-domains-v41.js");
const sw = read("public/sw.js");

test("v50 loads after the previous flow authority and rotates PWA cache", () => {
  assert.ok(index.indexOf("studio-flow-v49.css") < index.indexOf("studio-theme-domain-v50.css"));
  assert.ok(index.indexOf("studio-reflow-v48.js") < index.indexOf("studio-theme-domain-v50.js"));
  assert.match(sw, /ngeblogging-app-v50-20260726/);
  assert.match(sw, /ngeblogging-app-v49-20260726/);
});

test("Theme Studio stays in normal flow and removes the malformed mobile preview surface", () => {
  assert.match(css, /\.tn-library > header/);
  assert.match(css, /\.tn-card-mock > header/);
  assert.match(css, /\.tn-theme-grid > article > div > footer/);
  assert.match(css, /position: static !important/);
  assert.match(css, /\.tn-hero > \.tn-active-stage[\s\S]*display: none !important/);
  assert.match(css, /studio-v30-desktop-phone/);
  assert.match(css, /\[class\*="glow"\]/);
});

test("theme category buttons remain touchable and categories are not silently emptied by the site blueprint", () => {
  assert.match(css, /\.tn-category-tabs > button[\s\S]*pointer-events: auto !important/);
  assert.match(css, /touch-action: manipulation/);
  assert.match(runtime, /const category = event\.target\.closest\("\.tn-category-tabs > button"\)/);
  assert.match(runtime, /buttonByText\(blueprints, "Semua"\)/);
  assert.match(runtime, /allBlueprints\.click\(\)/);
  assert.match(runtime, /aria-pressed/);
});

test("domain page exposes separate root and WWW or nested-subdomain workflows", () => {
  assert.match(domains, /op50-domain-root-form/);
  assert.match(domains, /op50-domain-host-form/);
  assert.match(domains, /Tambahkan domain Anda/);
  assert.match(domains, /WWW & SUBDOMAIN/);
  assert.match(domains, /cloud\.console/);
  assert.match(domains, /composeHostname/);
  assert.match(domains, /normalizePrefix/);
  assert.match(domains, /data-domain-ready/);
  assert.match(domains, /tombol penambahan tetap dikunci sampai Cloudflare Custom Hostnames API/);
  assert.match(css, /\.op50-domain-controls/);
  assert.match(css, /\.op50-domain-host-form/);
});
