import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile Comments row matches native menu icon and text geometry", async () => {
  const [css, runtime] = await Promise.all([
    read("src/studio-mobile-precision-v99.css"),
    read("src/studio-mobile-precision-v99.js"),
  ]);
  for (const marker of [
    'data-native-row-v99="true"',
    "grid-template-columns: 25px minmax(0, 1fr)",
    "min-height: 58px",
    "padding: 0 26px",
    "gap: 18px",
    "font-size: 17px",
    "width: 25px",
    "height: 25px",
  ]) assert.ok(css.includes(marker), marker);
  for (const marker of [
    "physicalMobileV99",
    "referenceText",
    "commentsText",
    '"font-size"',
    '"font-weight"',
    "nativeRowV99",
  ]) assert.ok(runtime.includes(marker), marker);
});

test("theme editor has always-visible Copy and Preview tools", async () => {
  const [css, runtime] = await Promise.all([
    read("src/studio-mobile-precision-v99.css"),
    read("src/studio-mobile-precision-v99.js"),
  ]);
  for (const marker of [
    "tn-v99-tools-inline",
    "tn-v99-tool",
    "tn-code-status",
    "data-preview-open-v99",
  ]) assert.ok(css.includes(marker), marker);
  for (const marker of [
    "Salin kode",
    "Lihat pratinjau",
    "Kembali ke kode",
    "navigator.clipboard.writeText",
    "previewOpenV99",
    "status.insertBefore",
  ]) assert.ok(runtime.includes(marker), marker);
  assert.doesNotMatch(runtime, /footer\.prepend\(tools\)/);
});

test("theme and layout panels keep safe mobile margins instead of full-screen takeover", async () => {
  const css = await read("src/studio-mobile-precision-v99.css");
  for (const marker of [
    "height: min(84dvh, 800px)",
    "height: min(82dvh, 720px)",
    "border-radius: 18px",
    ".lb39-body",
    "grid-template-columns: minmax(0, 1fr)",
    ".lb39-canvas",
    "min-width: 0",
    "overflow-y: auto",
  ]) assert.ok(css.includes(marker), marker);
  assert.doesNotMatch(css, /\.tn-modal\.fullscreen[^}]*height:\s*100dvh/);
  assert.doesNotMatch(css, /\.lb39-dialog[^}]*height:\s*100dvh/);
  assert.doesNotMatch(css, /\.lb39-canvas[^}]*min-width:\s*640px/);
});

test("v99 authority loads after v97 and PWA rotates cache", async () => {
  const [html, sw] = await Promise.all([read("index.html"), read("public/sw.js")]);
  const oldCss = html.indexOf("studio-mobile-precision-v97.css");
  const newCss = html.indexOf("studio-mobile-precision-v99.css");
  const oldJs = html.indexOf("studio-mobile-precision-v97.js");
  const newJs = html.indexOf("studio-mobile-precision-v99.js");
  assert.ok(oldCss >= 0 && newCss > oldCss, "v99 CSS must load after v97");
  assert.ok(oldJs >= 0 && newJs > oldJs, "v99 JS must load after v97");
  assert.match(sw, /studio-mobile-theme-layout-v99-20260728/);
  assert.match(sw, /ngeblogging-app-v99-20260728/);
  assert.match(sw, /pwa-v99/);
  assert.match(sw, /studio-mobile-precision-v99\.css/);
  assert.match(sw, /studio-mobile-precision-v99\.js/);
});
