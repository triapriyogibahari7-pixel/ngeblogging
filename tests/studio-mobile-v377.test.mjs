import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  next: await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8"),
  secure: await readFile(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8"),
  editor: await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8"),
  allPages: await readFile(new URL("../src/studio-mobile-all-pages-v377.css", import.meta.url), "utf8"),
  editorFix: await readFile(new URL("../src/studio-mobile-editor-v376.css", import.meta.url), "utf8"),
};

test("small-device authority styles load from Studio entry points", () => {
  assert.match(files.next, /studio-mobile-all-pages-v377\.css/);
  assert.match(files.secure, /studio-mobile-all-pages-v377\.css/);
  assert.match(files.editor, /studio-mobile-editor-v376\.css/);
});

test("all-page v377 covers every requested Studio surface", () => {
  for (const selector of [
    "sn-metrics","sn-content-card","tn-studio","sn-media-library",
    "sn-analytics-data-host","sn-members","sv124-comment-workspace",
    "sv124-domain-page","sn-api-page","sn-settings-grid"
  ]) assert.match(files.allPages, new RegExp(selector));
});

test("v377 is small-device-only", () => {
  assert.match(files.allPages, /editor-v266-small/);
  assert.match(files.allPages, /data-studio-device-mode="small"/);
  assert.doesNotMatch(files.allPages, /editor-v266-large/);
  assert.doesNotMatch(files.allPages, /data-studio-device-mode="large"/);
  assert.doesNotMatch(files.allPages, /tablet/);
  assert.doesNotMatch(files.allPages, /desktop/);
  assert.doesNotMatch(files.allPages, /laptop/);
  assert.doesNotMatch(files.allPages, /computer/);
});

test("v376 explicitly fixes the flex-to-grid root cause", () => {
  assert.match(files.editorFix, /\.ce-titlebar\{[\s\S]*display:grid!important/);
  assert.match(files.editorFix, /\.ce-file\{[\s\S]*display:grid!important/);
  assert.match(files.editorFix, /\.ce-file label\{[\s\S]*display:grid!important/);
  assert.match(files.editorFix, /\.ce-actions\{[\s\S]*display:grid!important/);
});

test("small editor keeps the real Nara button visible while large-device behavior remains hidden", async () => {
  const secure = await readFile(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
  assert.match(secure, /isSmallEditor/);
  assert.match(secure, /documentElement\.classList\.contains\("editor-v266-small"\)/);
  assert.match(secure, /dataset\.studioDeviceMode === "small"/);
  assert.match(secure, /shell\.querySelectorAll\("\.ce-nara"\)/);
  assert.match(secure, /if \(isSmallEditor\)/);
  assert.match(secure, /button\.hidden = false/);
});

test("v405 covers all ten Studio pages with small-device-only layout authority", async () => {
  const secure = await readFile(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/studio-mobile-pages-v405.css", import.meta.url), "utf8");
  assert.match(secure, /studio-mobile-pages-v405\.css/);
  assert.match(css, /\.sn-shell/);
  assert.match(css, /\.sn-main/);
  assert.match(css, /\.sn-top/);
  assert.match(css, /\.sn-side/);
  assert.match(css, /\.sn-view-pad/);
  assert.match(css, /\.sn-page-title/);
  assert.match(css, /\.sn-content-card/);
  assert.match(css, /\.sn-doc-row/);
  assert.match(css, /\.tn-studio/);
  assert.match(css, /\.sn-media-library/);
  assert.match(css, /\.sn-analytics-data-host/);
  assert.match(css, /\.sn-members/);
  assert.match(css, /\.sv124-comment-workspace/);
  assert.match(css, /\.sv124-domain-page/);
  assert.match(css, /\.sn-api-page/);
  assert.match(css, /\.sn-settings-grid/);
  assert.match(css, /html\.editor-v266-small/);
  assert.match(css, /data-studio-device-mode="small"/);
  assert.doesNotMatch(css, /editor-v266-large/);
  assert.doesNotMatch(css, /data-studio-responsive-mode="tablet"/);
  assert.doesNotMatch(css, /data-studio-responsive-mode="desktop"/);
});


test("mobile sidebar has only Post while Pages keeps its own create action", async () => {
  const studio = await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(studio, /className="sn-new sn-new-page"/);
  assert.match(studio, /view === "pages"[\\s\\S]*createDoc\(type\)/);
});

test("v414 preserves the desktop editor menu and hides only phone-only controls on large devices", async () => {
  const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/studio-mobile-v414.css", import.meta.url), "utf8");
  assert.match(editor, /studio-mobile-v414\\.css/);
  assert.match(editor, /data-mobile-editor-v414="true"/);
  assert.match(editor, /className="ce-preview-action"/);
  assert.match(css, /\\.ce-ribbon button\\[title="Undo"\\]/);
  assert.match(css, /\\.ce-ribbon button\\[title="Redo"\\]/);
  assert.match(css, /\\.ce-ribbon button\\[title="Bold"\\]/);
  assert.match(css, /\\.ce-ribbon button\\[title="Italic"\\]/);
  assert.match(css, /\\.ce-ribbon button\\[title="Underline"\\]/);
  assert.match(css, /\\.ce-ribbon button\\[title="Daftar poin"\\]/);
  assert.match(css, /\\.ce-ribbon button\\[title="Daftar nomor"\\]/);
  assert.match(css, /\\.ce-ribbon button\\[title="Tautan"\\]/);
  assert.match(css, /\\.ce-ribbon button\\[title="Media"\\]/);
  assert.match(css, /\\.ce-ribbon button\\[title="Tabel"\\]/);
  assert.match(css, /\\.ce-app \\.ce-nara/);
  assert.match(css, /\\.ce-app \\.ce-actions \\.ce-preview-action/);
  assert.match(css, /body:has\\(\\.ce-app\\[data-mobile-editor-v414="true"\\]\\) \\.nara-floating-button/);
  assert.match(css, /html\\.editor-v266-small/);
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /\\.ce-mobile-toolbar/);
  assert.match(css, /\\.ce-mobile-actions/);
  assert.match(css, /\\.sn-mobile-menu-mark>strong/);
  assert.match(css, /overflow:visible!important/);
  assert.doesNotMatch(css, /editor-v266-large|data-studio-responsive-mode="tablet"|data-studio-responsive-mode="desktop"|data-studio-device-mode="large"/);
  assert.equal((css.match(/{/g)||[]).length, (css.match(/}/g)||[]).length);
});
