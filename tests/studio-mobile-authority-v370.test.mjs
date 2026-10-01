import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/studio-mobile-authority-v370.css", import.meta.url), "utf8");
const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const studio = await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

test("v370 is loaded after every existing mobile editor layer", () => {
  assert.match(editor, /studio-mobile-final-v369\.css/);
  assert.match(editor, /studio-mobile-authority-v370\.css/);
  assert.match(studio, /studio-mobile-final-v369\.css/);
  assert.match(studio, /studio-mobile-authority-v370\.css/);
});

test("v370 is hard-scoped to the small device family", () => {
  assert.match(css, /html\.editor-v266-small/);
  assert.match(css, /html\[data-studio-device-mode="small"\]/);
  assert.doesNotMatch(css, /editor-v266-large/);
  assert.doesNotMatch(css, /data-studio-device-mode="large"/);
  assert.doesNotMatch(css, /@media\s*\(min-width/);
});

test("v370 covers requested Studio surfaces", () => {
  for (const marker of [
    ".sn-page-title",
    ".sn-metrics",
    ".sn-content-card",
    ".sn-doc-row",
    ".tn-theme-grid",
    ".sn-media-grid",
    ".sn-analytics-data-host",
    ".sn-members",
    ".sv124-comments-page",
    ".sv124-domain-page",
    ".sn-api-page",
    ".sn-settings-grid",
  ]) assert.match(css, new RegExp(marker.replaceAll(".", "\\.")));
});

test("v370 gives Posts/Pages editor a single mobile flow", () => {
  for (const marker of [
    ".ce-titlebar",
    ".ce-tabs",
    ".ce-ribbon",
    ".ce-workspace",
    ".ce-paper",
    ".ce-sidebar",
    ".ce-field-grid",
    ".ce-preview-layer",
    ".ce-source-layer",
  ]) assert.match(css, new RegExp(marker.replaceAll(".", "\\.")));
  assert.match(css, /position:relative!important/);
  assert.match(css, /display:flex!important/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /font-size:16px!important/);
  assert.match(css, /overflow-wrap:normal!important/);
});

test("v370 leaves editor semantics and SEO implementation untouched", () => {
  assert.match(editor, /const isPage = doc\.type === "page"/);
  assert.match(editor, /dangerouslySetInnerHTML=\{\{ __html: doc\.content \|\| "" \}\}/);
  assert.match(editor, /canonicalUrl/);
  assert.match(editor, /schemaType/);
});

test("v370 bumps the service worker refresh/cache release", () => {
  assert.match(sw, /ngeblogging-app-v370-mobile-authority-20261001/);
  assert.match(sw, /studio-mobile-authority-cache-v370/);
  assert.match(sw, /mobile-authority-v370/);
});


test("v370.1 neutralizes legacy responsive editor overlay rules", () => {
  assert.match(css, /html\.editor-v266-small \.ce-titlebar/);
  assert.match(css, /html\[data-studio-device-mode="small"\] \.ce-titlebar/);
  assert.match(css, /\.ce-titlebar[\s\S]*position:relative!important/);
  assert.match(css, /\.ce-actions[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /\.ce-actions \.ce-primary[\s\S]*justify-self:stretch!important/);
  assert.match(css, /\.ce-paper-shell[\s\S]*background:transparent!important/);
  assert.match(css, /\.ce-paper[\s\S]*visibility:visible!important/);
  assert.match(css, /\.ce-preview-devices[\s\S]*left:50%!important/);
});

test("mobile authority is also loaded from the Studio shell after v23", async () => {
  const secure = await readFile(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
  assert.match(secure, /import "\.\/studio-responsive-v23\.css";/);
  assert.match(secure, /import "\.\/studio-mobile-authority-v370\.css";/);
});
