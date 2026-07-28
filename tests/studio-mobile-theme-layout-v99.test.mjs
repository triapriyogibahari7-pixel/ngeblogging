import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Comments row uses deterministic native geometry without transient computed-style copying", async () => {
  const [css, runtime] = await Promise.all([
    read("src/studio-mobile-precision-v99.css"),
    read("src/studio-mobile-precision-v99.js"),
  ]);
  for (const marker of [
    "grid-template-columns: 25px minmax(0, 1fr)",
    "min-height: 58px",
    "padding: 0 26px",
    "gap: 18px",
    "font-size: 17px",
    "width: 25px",
    "height: 25px",
    "grid-template-columns: 24px minmax(0, 112px)",
  ]) assert.ok(css.includes(marker), marker);
  for (const marker of [
    "physicalMobileV99",
    "stabilizeCommentsRow",
    "stableRowV102",
    "clearTransientStyle",
    "nativeRowV99",
  ]) assert.ok(runtime.includes(marker), marker);
  assert.doesNotMatch(runtime, /getComputedStyle\(reference/);
  assert.doesNotMatch(runtime, /copyComputed\(reference/);
});

test("theme editor keeps code and preview visible together with functional Copy and refresh tools", async () => {
  const [css, runtime] = await Promise.all([
    read("src/studio-mobile-precision-v99.css"),
    read("src/studio-mobile-precision-v99.js"),
  ]);
  for (const marker of [
    "tn-v102-tools-inline",
    "tn-v102-tool",
    "tn-code-status",
    "grid-template-columns: minmax(0, 1.08fr) minmax(320px, .92fr)",
    "grid-template-rows: minmax(250px, 1.08fr) minmax(220px, .92fr)",
    "display: block !important",
  ]) assert.ok(css.includes(marker), marker);
  for (const marker of [
    "Salin kode",
    "Perbarui preview",
    "Preview diperbarui",
    "navigator.clipboard.writeText",
    "splitPreviewV102",
    "status.insertBefore",
    "frame.srcdoc",
  ]) assert.ok(runtime.includes(marker), marker);
  assert.doesNotMatch(runtime, /footer\.prepend\(tools\)/);
});

test("theme and layout panels keep safe margins and preserve the structured layout map", async () => {
  const css = await read("src/studio-mobile-precision-v99.css");
  for (const marker of [
    "height: min(86dvh, 820px)",
    "height: min(88dvh, 760px)",
    "border-radius: 18px",
    ".lb39-body",
    ".lb39-content-row",
    "grid-template-columns: minmax(90px, .55fr) minmax(190px, 1.7fr) minmax(90px, .55fr)",
    "grid-template-columns: minmax(68px, .55fr) minmax(132px, 1.65fr) minmax(68px, .55fr)",
    ".lb39-pair",
    "repeat(2, minmax(0, 1fr))",
    "overflow-y: auto",
  ]) assert.ok(css.includes(marker), marker);
  assert.doesNotMatch(css, /\.tn-modal\.fullscreen[^}]*height:\s*100dvh/);
  assert.doesNotMatch(css, /\.lb39-dialog[^}]*height:\s*100dvh/);
  assert.doesNotMatch(css, /\.lb39-canvas[^}]*min-width:\s*640px/);
  assert.doesNotMatch(css, /\.lb39-content-row[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("precision authority still loads after v100 and remains part of the PWA shell", async () => {
  const [html, sw] = await Promise.all([read("index.html"), read("public/sw.js")]);
  const oldCss = html.indexOf("studio-surface-authority-v100.css");
  const precisionCss = html.indexOf("studio-mobile-precision-v99.css");
  const oldJs = html.indexOf("studio-surface-authority-v100.js");
  const precisionJs = html.indexOf("studio-mobile-precision-v99.js");
  assert.ok(oldCss >= 0 && precisionCss > oldCss, "precision CSS must load after v100");
  assert.ok(oldJs >= 0 && precisionJs > oldJs, "precision JS must load after v100");
  assert.match(sw, /studio-mobile-theme-layout-v101-20260728|studio-responsive-precision-v102-20260728/);
  assert.match(sw, /ngeblogging-app-v101-20260728|ngeblogging-app-v102-20260728/);
  assert.match(sw, /pwa-v101|pwa-v102/);
  assert.match(sw, /studio-mobile-precision-v99\.css/);
  assert.match(sw, /studio-mobile-precision-v99\.js/);
});
