import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v340 Theme authority is loaded directly and keeps the secondary design below", async () => {
  const [entry, runtime, css] = await Promise.all([
    read("src/studio-sidebar-direct-v300.js"),
    read("src/studio-theme-final-v340.js"),
    read("src/studio-theme-final-v340.css"),
  ]);

  assert.match(entry, /import "\.\/studio-theme-final-v340\.js";/);
  assert.match(runtime, /STUDIO_THEME_FINAL_RELEASE_V340/);
  assert.match(runtime, /semanticSecondary/);
  assert.match(runtime, /forceBelow/);
  assert.match(runtime, /insertAdjacentElement\("afterend"/);
  assert.match(css, /data-v340-layout-role="secondary-below"/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)!important/);
});

test("v340 compact Theme surface contains preview, filters and detailed layout map", async () => {
  const css = await read("src/studio-theme-final-v340.css");

  assert.match(css, /data-v340-theme-family="compact"/);
  assert.match(css, /\.tn-active-stage/);
  assert.match(css, /height:clamp\(310px,50dvh,430px\)!important/);
  assert.match(css, /\.tn-category-tabs/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css, /\.tn-layout-map-v264/);
  assert.match(css, /overflow-x:clip!important/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.nara-assistant|\.sv124-domain-page|\.ce-app|\.sn-side/);
});

test("v340 build patch rotates the PWA cache without logout or forced reload", async () => {
  const [patch, release] = await Promise.all([
    read("scripts/patch-studio-theme-final-v340.mjs"),
    read("public/release-v340.json"),
  ]);

  assert.match(patch, /ngeblogging-app-v340-theme-final-20260807/);
  assert.match(patch, /studio-theme-final-cache-v340/);
  assert.match(patch, /ACTIVE_VERSION_V340/);
  assert.match(patch, /ACTIVE_CACHE_RELEASE_V340/);
  assert.doesNotMatch(patch, /location\.(?:reload|replace)\s*\(/);
  assert.match(release, /"themes": 100/);
  assert.match(release, /"layoutAreas": 26/);
  assert.match(release, /"widgets": 26/);
  assert.match(release, /"previewModes": 8/);
  assert.match(release, /"realDeviceCertificationClaimed": false/);
});

test("v338 build chain executes v339 then v340", async () => {
  const patch338 = await read("scripts/patch-studio-theme-layout-mobile-v338.mjs");
  const v339At = patch338.indexOf('await import("./patch-studio-theme-surface-v339.mjs")');
  const v340At = patch338.indexOf('await import("./patch-studio-theme-final-v340.mjs")');
  assert.ok(v339At >= 0, "v339 surface patch must run");
  assert.ok(v340At > v339At, "v340 final patch must run after v339");
});
