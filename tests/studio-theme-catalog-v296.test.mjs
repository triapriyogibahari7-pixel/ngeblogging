import test from "node:test";
import assert from "node:assert/strict";

const EXTRA_IDS = [
  "custom-creator-v296",
  "custom-signal-v296",
  "custom-venture-v296",
  "custom-folio-v296",
  "custom-manual-v296",
];

test("v296 extends the real Theme Studio catalog from 95 to exactly 100 themes", async () => {
  const catalog = await import("../src/theme-catalog.js");
  assert.equal(catalog.BUILT_IN_THEMES.length, 95, "base catalog must remain the known 95-theme source before v296");

  const v296 = await import("../src/studio-theme-catalog-v296.js");
  assert.equal(v296.STUDIO_THEME_TARGET_V296, 100);
  assert.equal(v296.ensureThemeCatalog100V296(), 100);
  assert.equal(catalog.BUILT_IN_THEMES.length, 100);

  const ids = new Set(catalog.BUILT_IN_THEMES.map((theme) => theme.id));
  assert.equal(ids.size, 100, "all theme ids must be unique");
  for (const id of EXTRA_IDS) assert.ok(ids.has(id), `missing real extra theme ${id}`);
});

test("v296 extra themes have distinct runnable HTML CSS and JavaScript fingerprints", async () => {
  const { BUILT_IN_THEMES } = await import("../src/theme-catalog.js");
  await import("../src/studio-theme-catalog-v296.js");

  const extras = EXTRA_IDS.map((id) => BUILT_IN_THEMES.find((theme) => theme.id === id));
  for (const theme of extras) {
    assert.ok(theme, "extra theme must exist");
    assert.equal(theme.catalogRelease, "studio-theme-catalog-100-v296-20260805");
    assert.match(theme.code.html, new RegExp(theme.id));
    assert.match(theme.code.html, /ng-v296-custom-strip/);
    assert.match(theme.code.css, /studio-theme-catalog-100-v296-20260805/);
    assert.match(theme.code.javascript, /customCatalogV296/);
    assert.ok(Array.isArray(theme.defaultWidgetIds) && theme.defaultWidgetIds.length >= 2);
  }
  assert.equal(new Set(extras.map((theme) => theme.code.html)).size, 5);
  assert.equal(new Set(extras.map((theme) => theme.code.css)).size, 5);
  assert.equal(new Set(extras.map((theme) => theme.code.javascript)).size, 5);
});

test("v312 Theme Studio moves the squeezed right panel below the map on handheld devices", async () => {
  const { readFile } = await import("node:fs/promises");
  const [runtime, css] = await Promise.all([
    readFile(new URL("../src/studio-sidebar-direct-v300.js", import.meta.url), "utf8"),
    readFile(new URL("../src/studio-theme-mobile-v312.css", import.meta.url), "utf8"),
  ]);

  assert.match(runtime, /import \"\.\/studio-theme-mobile-v312\.css\";/, "final Studio shell must load the v312 theme authority");
  assert.match(css, /data-studio-handheld=\"true\"\][^{]+\.tn-layout-studio/);
  assert.match(css, /\.tn-layout-studio>\.tn-layout-side[\s\S]*?grid-row:2!important/);
  assert.match(css, /grid-template-areas:\"header\" \"main\" \"sidebar\" \"footer\"!important/);
  assert.match(css, /\.tn-active-stage>\.tn-frame-shell[\s\S]*?height:360px!important/);
  assert.match(css, /\.tn-category-tabs[\s\S]*?overflow-x:auto!important/);
  assert.match(css, /grid-template-areas:\"preview\" \"code\"!important/);
  assert.doesNotMatch(css, /\.tn-layout-studio>\.tn-layout-side[^}]*position:\s*fixed/i, "handheld widget panel must remain in document flow");
});
