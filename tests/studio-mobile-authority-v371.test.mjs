import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/studio-mobile-authority-v371.css", import.meta.url), "utf8");
const secure = await readFile(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");

test("v371 is the final mobile authority and is loaded after legacy v23", () => {
  assert.match(secure, /import "\.\/studio-responsive-v23\.css";/);
  assert.match(secure, /import "\.\/studio-mobile-authority-v371\.css";/);
  assert.ok(secure.indexOf('studio-responsive-v23.css') < secure.indexOf('studio-mobile-authority-v371.css'));
});

test("v371 is hard-scoped to small devices only", () => {
  assert.match(css, /html\.editor-v266-small/);
  assert.match(css, /html\[data-studio-device-mode="small"\]/);
  assert.doesNotMatch(css, /editor-v266-large/);
  assert.doesNotMatch(css, /data-studio-device-mode="large"/);
  assert.doesNotMatch(css, /@media\s*\(min-width/);
});

test("v371 fixes the mobile Post/Page editor architecture", () => {
  for (const marker of [
    ".ce-app",
    ".ce-titlebar",
    ".ce-back",
    ".ce-file",
    ".ce-actions",
    ".ce-tabs",
    ".ce-ribbon",
    ".ce-workspace",
    ".ce-paper-shell",
    ".ce-paper",
    ".ce-sidebar",
    ".ce-preview-layer",
    ".ce-media-layer",
    ".ce-source-layer",
  ]) assert.match(css, new RegExp(marker.replaceAll(".", "\\.")));

  assert.match(css, /\.ce-titlebar[\s\S]*position:relative!important/);
  assert.match(css, /\.ce-actions[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /\.ce-actions \.ce-primary[\s\S]*justify-self:stretch!important/);
  assert.match(css, /\.ce-paper-shell[\s\S]*background:transparent!important/);
  assert.match(css, /\.ce-paper[\s\S]*visibility:visible!important/);
  assert.match(css, /\.ce-preview-devices[\s\S]*left:50%!important/);
});

test("v371 keeps semantic SEO/editor implementation unchanged", () => {
  assert.match(editor, /const isPage = doc\.type === "page"/);
  assert.match(editor, /canonicalUrl/);
  assert.match(editor, /schemaType/);
  assert.match(editor, /dangerouslySetInnerHTML=\{\{ __html: doc\.content \|\| "" \}\}/);
});

test("v371 contains all requested Studio mobile surfaces", () => {
  for (const marker of [
    ".sn-page-title",
    ".sn-metrics",
    ".sn-content-card",
    ".sn-doc-row",
    ".tn-theme-grid",
    ".sn-media-grid",
    ".sn-analytics-data-host",
    ".sn-members",
    ".sv124-comment-columns",
    ".sv124-domain-page",
    ".sn-api-page",
    ".sn-settings-grid",
  ]) assert.match(css, new RegExp(marker.replaceAll(".", "\\.")));
});
