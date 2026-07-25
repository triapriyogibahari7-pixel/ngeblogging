import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v36 assets load after the locked v35 authority", async () => {
  const html = await read("index.html");
  assert.ok(html.indexOf("studio-layout-builder-v36.css") > html.indexOf("studio-domain-backup-v35.css"));
  assert.ok(html.indexOf("studio-layout-builder-v36.js") > html.indexOf("studio-domain-backup-v35.js"));
});

test("widget system exposes every requested visual layout area", async () => {
  const source = await read("src/widget-system.js");
  for (const area of [
    "header-left", "header-right", "below-header", "sidebar-left", "before-content",
    "after-content", "sidebar-right", "footer-left", "footer-right",
  ]) assert.ok(source.includes(`id: "${area}"`), area);
  assert.match(source, /data-layout-area/);
  assert.match(source, /RENDER_GROUPS/);
  assert.match(source, /export const WIDGET_COUNT = BUILT_IN_WIDGETS\.length/);
});

test("layout builder persists state using the active site id", async () => {
  const source = await read("src/studio-layout-builder-v36.js");
  assert.match(source, /ACTIVE_SITE_STORAGE_KEY/);
  assert.match(source, /loadSiteThemeState\(siteId\)/);
  assert.match(source, /saveSiteThemeState\(context\.siteId, context\.user\.id, next\)/);
  assert.match(source, /Tata letak, widget, dan copyright berhasil disimpan/);
  assert.match(source, /Copyright atas nama/);
});

test("visual canvas contains header content sidebars footer and copyright", async () => {
  const source = await read("src/studio-layout-builder-v36.js");
  for (const marker of [
    "header-left", "header-right", "below-header", "Kotak postingan", "sidebar-left",
    "sidebar-right", "footer-left", "footer-right", "ng-layout-copyright",
  ]) assert.ok(source.includes(marker), marker);
  assert.match(source, /ng-layout-body/);
  assert.match(source, /data-slot/);
});

test("Tata Letak sidebar route opens v36 instead of the old customizer", async () => {
  const route = await read("src/studio-layout-route-v29.js");
  assert.match(route, /ngeblogging:open-layout-builder-v36/);
  assert.match(route, /data-layout-builder-v36/);
  assert.doesNotMatch(route, /\/sesuaikan\/i/);
});

test("v36 never targets locked Studio sidebar geometry or Nara widget", async () => {
  const css = await read("src/studio-layout-builder-v36.css");
  const runtime = await read("src/studio-layout-builder-v36.js");
  for (const forbidden of [".sn-side", ".sn-mobile-v30", ".nara-"]) {
    const pattern = new RegExp(forbidden.replace(".", "\\."));
    assert.doesNotMatch(css, pattern);
    assert.doesNotMatch(runtime, pattern);
  }
});

test("PWA cache rotates to v36", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v36-20260725/);
  assert.match(sw, /ngeblogging-app-v35-20260725/);
});
