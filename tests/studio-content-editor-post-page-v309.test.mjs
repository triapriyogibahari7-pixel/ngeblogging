import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/studio-content-editor-post-page-polish-v309.css", import.meta.url), "utf8");
const css310 = await readFile(new URL("../src/studio-content-editor-desktop-site-v310.css", import.meta.url), "utf8");
const css314 = await readFile(new URL("../src/studio-content-editor-final-v314.css", import.meta.url), "utf8");
const guard314 = await readFile(new URL("../src/studio-content-editor-final-v314.js", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url), "utf8");
const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const studio = await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");

test("v309/v310/v314 load after v308 and remain editor-only", () => {
  assert.match(runtime, /studio-content-editor-responsive-v308\.css/);
  assert.match(runtime, /studio-content-editor-post-page-polish-v309\.css/);
  assert.match(runtime, /studio-content-editor-desktop-site-v310\.css/);
  assert.match(runtime, /studio-content-editor-final-v314\.js/);
  assert.match(runtime, /studio-content-editor-post-page-polish-v309-20260806/);
  assert.match(runtime, /studio-content-editor-desktop-site-v310-20260806/);
  assert.match(runtime, /studio-content-editor-final-v314-20260806/);
  for (const source of [css, css310, css314]) {
    assert.doesNotMatch(source, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.ce-editor-side-v266|\.ce-editor-sidebar-toggle-v266|\.nara-assistant/);
  }
});

test("large family removes excessive blank paper", () => {
  assert.match(css, /html\.editor-v266-large \.ce-paper\{/);
  assert.match(css, /min-height:clamp\(420px,46dvh,600px\)/);
  assert.match(css314, /min-height:clamp\(280px,34dvh,430px\)!important/);
  assert.match(css314, /@media \(min-width:820px\)/);
  assert.match(css314, /grid-template-columns:minmax\(0,1fr\) clamp\(270px,27vw,340px\)!important/);
});

test("v310/v314 preserve desktop-site composition for Android desktop-site and large tablets", () => {
  assert.match(css310, /@media \(min-width:820px\) and \(max-width:1080px\)/);
  assert.match(css310, /grid-template-columns:minmax\(0,1fr\) clamp\(260px,29vw,300px\)!important/);
  assert.match(css310, /position:sticky!important/);
  assert.match(css314, /@media \(min-width:820px\) and \(max-width:1080px\)/);
  assert.match(css314, /min-height:clamp\(280px,32dvh,400px\)!important/);
  assert.match(css314, /max-width:292px!important/);
});

test("small family stays one-column, touch-safe, compact and complete", () => {
  assert.match(css310, /html\.editor-v266-small \.ce-actions>button/);
  assert.match(css314, /@media \(max-width:760px\)/);
  assert.match(css314, /grid-template-areas:"back file" "actions actions"/);
  assert.match(css314, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css314, /min-height:44px!important/);
  assert.match(css314, /overflow-x:auto!important/);
  assert.match(css314, /grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css314, /ce-source-layer footer\{flex-wrap:wrap!important/);
});

test("Posts and Pages still share the same ContentEditor implementation", () => {
  assert.match(editor, /const isPage = doc\.type === "page"/);
  assert.match(studio, /<ContentEditor doc=\{active\}/);
  assert.match(studio, /active\.type === "page" \? "pages" : "posts"/);
});

test("v314 enforces the real 5000-word publication limit without trimming drafts", () => {
  assert.match(guard314, /CONTENT_WORD_LIMIT_V314 = 5000/);
  assert.match(guard314, /CONTENT_WORD_WARNING_V314 = 4500/);
  assert.match(guard314, /Kurangi \$\{Math\.abs\(remaining\)/);
  assert.match(guard314, /Draf tetap aman dan tidak dipotong/);
  assert.match(guard314, /\.ce-actions \.ce-primary/);
  assert.match(guard314, /option\[value="published"\]/);
  assert.match(guard314, /publishButton\.disabled = over/);
  assert.match(guard314, /publishedOption\.disabled = over/);
  assert.doesNotMatch(guard314, /slice\([^\n]*5000|substring\([^\n]*5000|innerHTML\s*=\s*[^;]*slice/);
  assert.doesNotMatch(guard314, /new MutationObserver|setInterval\s*\(|stopImmediatePropagation|localStorage\.clear|sessionStorage\.clear|signOut\s*\(|location\.(?:reload|replace)\s*\(/);
});
