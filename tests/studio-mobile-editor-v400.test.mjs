import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const secure = await readFile(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/studio-mobile-editor-v400.css", import.meta.url), "utf8");
const css401 = await readFile(new URL("../src/studio-mobile-editor-v401.css", import.meta.url), "utf8");

test("v400 mobile editor authority is wired into both editor entry paths", () => {
  assert.match(editor, /studio-mobile-editor-v400\.css/);
  assert.match(editor, /data-mobile-editor-v400="true"/);
  assert.match(secure, /studio-mobile-editor-v400\.css/);
});

test("v400 keeps the title and actions in a deterministic two-row grid", () => {
  assert.match(css, /\.ce-titlebar\{[\s\S]*display:grid!important/);
  assert.match(css, /grid-template-areas:"back file" "actions actions"!important/);
  assert.match(css, /\.ce-file\{[\s\S]*display:grid!important/);
  assert.match(css, /\.ce-actions\{[\s\S]*display:grid!important/);
});

test("v400 removes the old striped word-status block on small devices", () => {
  assert.match(css, /\.ce-word-status\{\s*display:none!important/);
});

test("v400 is gated to the small device mode and never targets tablet or desktop modes", () => {
  assert.match(css, /html\[data-studio-device-mode="small"\]/);
  assert.doesNotMatch(css, /data-studio-device-mode="large"/);
  assert.doesNotMatch(css, /data-studio-responsive-mode="tablet"/);
  assert.doesNotMatch(css, /data-studio-responsive-mode="desktop"/);
  assert.doesNotMatch(css, /editor-v266-large/);
});


test("v401 clean rebuild is wired and owns mobile editor geometry", () => {
  assert.match(editor, /studio-mobile-editor-v401\.css/);
  assert.match(editor, /data-mobile-editor-v401="true"/);
  assert.match(css401, /html\.editor-v266-small/);
  assert.match(css401, /\.ce-titlebar\{[\s\S]*display:grid!important/);
  assert.match(css401, /grid-template-areas:"back file" "actions actions"!important/);
  assert.match(css401, /\.ce-file input\{[\s\S]*width:100%!important/);
  assert.match(css401, /\.ce-actions\{[\s\S]*display:grid!important/);
  assert.match(css401, /\.ce-word-status\{[\s\S]*display:none!important/);
  assert.match(css401, /#ngeblogging-editor-nav-v266/);
  assert.doesNotMatch(css401, /editor-v266-large/);
  assert.doesNotMatch(css401, /data-studio-responsive-mode="tablet"/);
  assert.doesNotMatch(css401, /data-studio-responsive-mode="desktop"/);
});


test("v402 removes duplicate mobile Nara launcher and mobile status box", async () => {
  const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
  const css402 = await readFile(new URL("../src/studio-mobile-editor-v402.css", import.meta.url), "utf8");
  assert.match(editor, /studio-mobile-editor-v402\.css/);
  assert.match(editor, /data-mobile-editor-v402="true"/);
  assert.match(css402, /body:has\(\.ce-app\[data-mobile-editor-v402="true"\]\) \.nara-floating-button/);
  assert.match(css402, /\.ce-word-status\{[\s\S]*display:none!important/);
  assert.match(css402, /\.ce-ribbon \.ce-nara\{[\s\S]*display:grid!important/);
  assert.match(css402, /\.ce-ribbon \.ce-nara svg\{[\s\S]*width:21px!important/);
  assert.doesNotMatch(css402, /editor-v266-large/);
  assert.doesNotMatch(css402, /data-studio-responsive-mode="tablet"/);
  assert.doesNotMatch(css402, /data-studio-responsive-mode="desktop"/);
});


test("v403 hard reset has real small-device specificity and removes the mobile overlap sources", async () => {
  const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
  const css403 = await readFile(new URL("../src/studio-mobile-editor-v403.css", import.meta.url), "utf8");
  assert.match(editor, /studio-mobile-editor-v403\.css/);
  assert.match(editor, /data-mobile-editor-v403="true"/);
  assert.match(css403, /:is\(html\.editor-v266-small,html\[data-studio-device-mode="small"\]\) \.ce-app\[data-mobile-editor-v403="true"\] \.ce-titlebar/);
  assert.match(css403, /\.ce-file input\{[\s\S]*width:100%!important/);
  assert.match(css403, /\.ce-actions\{[\s\S]*display:grid!important/);
  assert.match(css403, /\.ce-word-status\{[\s\S]*display:none!important/);
  assert.match(css403, /\.ce-ribbon \.ce-nara\{[\s\S]*display:grid!important/);
  assert.match(css403, /nara-floating-button/);
  assert.match(css403, /#ngeblogging-editor-nav-v266/);
  assert.doesNotMatch(css403, /editor-v266-large/);
  assert.doesNotMatch(css403, /data-studio-responsive-mode="tablet"/);
  assert.doesNotMatch(css403, /data-studio-responsive-mode="desktop"/);
  assert.doesNotMatch(css403, /:where\(/);
});

test("v404 keeps Nara visible and replaces the mobile status strip with editor actions", async () => {
  const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/studio-mobile-editor-v404.css", import.meta.url), "utf8");
  assert.match(editor, /studio-mobile-editor-v404\.css/);
  assert.match(editor, /data-mobile-editor-v404="true"/);
  assert.match(editor, /className="ce-nara-section"/);
  assert.match(editor, /className="ce-mobile-actions"/);
  assert.doesNotMatch(editor, /<div className="ce-word-status">/);
  assert.match(css, /\.ce-nara-section/);
  assert.match(css, /\.ce-nara-section \.ce-nara/);
  assert.match(css, /\.ce-mobile-actions\{/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)!important/);
  assert.match(css, /\.ce-word-status\{/);
  assert.doesNotMatch(css, /editor-v266-large|data-studio-responsive-mode="tablet"|data-studio-responsive-mode="desktop"/);
});


test("v406 is the final isolated mobile Post/Page editor authority", async () => {
  const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
  const css406 = await readFile(new URL("../src/studio-mobile-editor-v406.css", import.meta.url), "utf8");
  assert.match(editor, /studio-mobile-editor-v406\.css/);
  assert.match(editor, /data-mobile-editor-v406="true"/);
  assert.match(css406, /\.ce-titlebar\{[\s\S]*display:grid!important/);
  assert.match(css406, /grid-template-areas:"back file" "actions actions"!important/);
  assert.match(css406, /\.ce-file input\{[\s\S]*width:100%!important/);
  assert.match(css406, /\.ce-actions\{[\s\S]*display:grid!important/);
  assert.match(css406, /\.ce-paper\{[\s\S]*width:100%!important/);
  assert.match(css406, /\.ce-mobile-actions\{[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
  assert.match(css406, /\.ce-word-status,[\s\S]*\.ce-word-limit-v316\{[\s\S]*display:none!important/);
  assert.match(css406, /\.nara-floating-button\{[\s\S]*display:flex!important/);
  assert.match(css406, /\.nara-floating-button svg\{[\s\S]*width:21px!important/);
  assert.match(css406, /#ngeblogging-editor-nav-v266:not\(\.mobile-open\)/);
  assert.doesNotMatch(css406, /editor-v266-large/);
  assert.doesNotMatch(css406, /data-studio-responsive-mode="tablet"/);
  assert.doesNotMatch(css406, /data-studio-responsive-mode="desktop"/);
  assert.doesNotMatch(css406, /data-studio-device-mode="large"/);
});


test("v407 replaces the fragile mobile ribbon with a clean phone-only toolbar", async () => {
  const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
  const css407 = await readFile(new URL("../src/studio-mobile-editor-v407.css", import.meta.url), "utf8");
  assert.match(editor, /studio-mobile-editor-v407\.css/);
  assert.match(editor, /data-mobile-editor-v407="true"/);
  assert.match(editor, /className="ce-mobile-toolbar"/);
  assert.match(editor, /className="ce-mobile-toolbar-nara"/);
  assert.match(css407, /@media screen and \(max-width:760px\)/);
  assert.match(css407, /\.ce-ribbon\{\s*display:none!important/);
  assert.match(css407, /\.ce-mobile-toolbar\{\s*display:flex!important/);
  assert.match(css407, /\.ce-mobile-toolbar-nara/);
  assert.match(css407, /\.ce-file input\{[\s\S]*width:100%!important/);
  assert.match(css407, /\.ce-actions\{[\s\S]*display:grid!important/);
  assert.match(css407, /\.ce-paper\{[\s\S]*width:100%!important/);
  assert.match(css407, /\.ce-word-status/);
  assert.match(css407, /#ngeblogging-editor-nav-v266:not\(\.mobile-open\)/);
  assert.match(css407, /\.nara-floating-button/);
  assert.doesNotMatch(css407, /editor-v266-large/);
  assert.doesNotMatch(css407, /data-studio-responsive-mode="tablet"/);
  assert.doesNotMatch(css407, /data-studio-responsive-mode="desktop"/);
  assert.doesNotMatch(css407, /data-studio-device-mode="large"/);
});


test("v409 is the fresh mobile Post/Page editor authority and is strictly small-device scoped", async () => {
  const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
  const css409 = await readFile(new URL("../src/studio-mobile-editor-v409.css", import.meta.url), "utf8");
  assert.match(editor, /studio-mobile-editor-v409\.css/);
  assert.match(editor, /data-mobile-editor-v409="true"/);
  assert.match(css409, /@media screen and \(max-width:760px\)/);
  assert.match(css409, /\.ce-ribbon\{display:none!important/);
  assert.match(css409, /\.ce-titlebar\{[\\s\\S]*display:grid!important/);
  assert.match(css409, /grid-template-areas:"back file" "actions actions"!important/);
  assert.match(css409, /\.ce-file input\{[\\s\\S]*width:100%!important/);
  assert.match(css409, /\.ce-actions\{[\\s\\S]*display:grid!important/);
  assert.match(css409, /\.ce-paper\{[\\s\\S]*width:100%!important/);
  assert.match(css409, /#ngeblogging-editor-nav-v266:not\(\.mobile-open\)/);
  assert.match(css409, /\.nara-assistant-shell\{[\\s\\S]*left:50%!important/);
  assert.match(css409, /\.nara-send\{[\\s\\S]*grid-column:4!important/);
  assert.doesNotMatch(css409, /editor-v266-large|data-studio-responsive-mode="tablet"|data-studio-responsive-mode="desktop"|data-studio-device-mode="large"/);
});

test("v410 makes mobile sidebar controls deterministic and non-submit navigation", async () => {
  const studio = await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
  const css410 = await readFile(new URL("../src/studio-mobile-v410.css", import.meta.url), "utf8");
  assert.match(studio, /studio-mobile-v410\.css/);
  assert.match(studio, /sn-new-page/);
  assert.match(studio, /<button type="button" className=\{view === "pages"/);
  assert.match(studio, /<button type="button" className=\{view === "posts"/);
  assert.match(css410, /\.sn-logo-mark\{[\\s\\S]*overflow:visible!important/);
  assert.match(css410, /\.sn-new-page/);
  assert.match(css410, /\.sn-side>nav>button\{/);
  assert.doesNotMatch(css410, /editor-v266-large|data-studio-responsive-mode="tablet"|data-studio-responsive-mode="desktop"/);
});
