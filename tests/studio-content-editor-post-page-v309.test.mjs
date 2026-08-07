import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/studio-content-editor-post-page-polish-v309.css", import.meta.url), "utf8");
const css310 = await readFile(new URL("../src/studio-content-editor-desktop-site-v310.css", import.meta.url), "utf8");
const css316 = await readFile(new URL("../src/studio-content-editor-final-v316.css", import.meta.url), "utf8");
const guard316 = await readFile(new URL("../src/studio-content-editor-final-v316.js", import.meta.url), "utf8");
const patch316 = await readFile(new URL("../scripts/patch-studio-content-editor-v316.mjs", import.meta.url), "utf8");
const patch304 = await readFile(new URL("../scripts/patch-service-worker-v304.mjs", import.meta.url), "utf8");
const isolation327 = await readFile(new URL("../scripts/patch-prebuild-test-runner-isolation-v327.mjs", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url), "utf8");
const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const studio = await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
const contentData = await readFile(new URL("../src/lib/content-data.js", import.meta.url), "utf8");
const layout336 = await readFile(new URL("../src/studio-theme-layout-one-v336.js", import.meta.url), "utf8");
const layout337 = await readFile(new URL("../src/studio-theme-layout-below-v337.js", import.meta.url), "utf8");
const layoutCss337 = await readFile(new URL("../src/studio-theme-layout-below-v337.css", import.meta.url), "utf8");
const patch337 = await readFile(new URL("../scripts/patch-studio-theme-layout-below-v337.mjs", import.meta.url), "utf8");
const chain331 = await readFile(new URL("../scripts/patch-content-capacity-v331.mjs", import.meta.url), "utf8");
const release337 = await readFile(new URL("../public/release-v337.json", import.meta.url), "utf8");

test("v309/v310 load after v308 and remain editor-only — v316 preserved", () => {
  assert.match(runtime, /studio-content-editor-responsive-v308\.css/);
  assert.match(runtime, /studio-content-editor-post-page-polish-v309\.css/);
  assert.match(runtime, /studio-content-editor-desktop-site-v310\.css/);
  assert.match(runtime, /studio-content-editor-final-v316\.js/);
  assert.match(runtime, /studio-content-editor-final-v316-20260806/);
  for (const source of [css, css310, css316]) {
    assert.doesNotMatch(source, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.ce-editor-side-v266|\.ce-editor-sidebar-toggle-v266|\.nara-assistant/);
  }
});

test("large family removes excessive blank paper and keeps inspector beside document", () => {
  assert.match(css316, /min-height:clamp\(280px,34dvh,430px\)!important/);
  assert.match(css316, /@media \(min-width:820px\)/);
  assert.match(css316, /grid-template-columns:minmax\(0,1fr\) clamp\(270px,27vw,340px\)!important/);
  assert.match(css316, /position:sticky!important/);
  assert.match(css316, /width:min\(790px,100%\)!important/);
});

test("v310 restores desktop composition for Android desktop-site and large tablets — v316 keeps it contained", () => {
  assert.match(css310, /@media \(min-width:820px\) and \(max-width:1080px\)/);
  assert.match(css316, /@media \(min-width:820px\) and \(max-width:1080px\)/);
  assert.match(css316, /min-height:clamp\(280px,32dvh,400px\)!important/);
  assert.match(css316, /max-width:292px!important/);
});

test("small family stays one-column, touch-safe, compact and complete", () => {
  assert.match(css316, /@media \(max-width:760px\)/);
  assert.match(css316, /grid-template-areas:"back file" "actions actions"/);
  assert.match(css316, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css316, /min-height:44px!important/);
  assert.match(css316, /overflow-x:auto!important/);
  assert.match(css316, /grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css316, /ce-source-layer footer\{flex-wrap:wrap!important/);
  assert.match(css316, /env\(safe-area-inset-top\)/);
});

test("Posts and Pages still share the same ContentEditor implementation", () => {
  assert.match(editor, /const isPage = doc\.type === "page"/);
  assert.match(studio, /<ContentEditor doc=\{active\}/);
  assert.match(studio, /active\.type === "page" \? "pages" : "posts"/);
});

test("v322 raises Posts and Pages to a real 30000-word publication limit without trimming drafts", () => {
  assert.match(guard316, /CONTENT_WORD_LIMIT_RELEASE_V322 = "posts-pages-30000-v322-20260806"/);
  assert.match(guard316, /CONTENT_WORD_LIMIT_V316 = 30000/);
  assert.match(guard316, /CONTENT_WORD_WARNING_V316 = 27000/);
  assert.match(guard316, /30\.000 kata/);
  assert.match(guard316, /Kurangi \$\{Math\.abs\(remaining\)/);
  assert.match(guard316, /Draf tetap aman dan tidak dipotong/);
  assert.match(guard316, /\.ce-actions \.ce-primary/);
  assert.match(guard316, /option\[value="published"\]/);
  assert.match(guard316, /publishButton\.disabled = over/);
  assert.match(guard316, /publishedOption\.disabled = over/);
  assert.match(contentData, /body_html = String\(values\.content\)\.slice\(0, 5_000_000\)/);
  assert.doesNotMatch(guard316, /CONTENT_WORD_LIMIT_V316 = 5000|CONTENT_WORD_WARNING_V316 = 4500/);
  assert.doesNotMatch(guard316, /slice\([^\n]*30000|substring\([^\n]*30000|innerHTML\s*=\s*[^;]*slice/);
  assert.doesNotMatch(guard316, /new MutationObserver|setInterval\s*\(|stopImmediatePropagation|localStorage\.clear|sessionStorage\.clear|signOut\s*\(|location\.(?:reload|replace)\s*\(/);
});

test("v316 historical prebuild accepts the promoted v322 test authority", () => {
  assert.match(patch316, /const guardHasV322Authority/);
  assert.match(patch316, /const wordLimitTestMarker = guardHasV322Authority/);
  assert.match(patch316, /v322 raises Posts and Pages to a real 30000-word publication limit without trimming drafts/);
  assert.match(patch316, /v316 enforces the real 5000-word publication limit without trimming drafts/);
});

test("v327 isolates node:test suites before the historical prebuild chain starts", () => {
  assert.match(patch304, /await import\("\.\/patch-prebuild-test-runner-isolation-v327\.mjs"\)/);
  assert.match(isolation327, /prebuild-test-runner-isolation-v327-20260806/);
  assert.match(isolation327, /entry\.name\.startsWith\("patch-"\)/);
  assert.match(isolation327, /inlineTestImportPattern/);
  assert.match(isolation327, /V327_PREBUILD_TEST_LEAK/);
  assert.match(isolation327, /await writeFile\(file, next\)/);
  assert.doesNotMatch(isolation327, /await\s+import\(\s*["']\.\.\/tests\//);
});

test("v329 resumes sanitized Theme and Domain production materialization", () => {
  assert.match(isolation327, /prebuild-materialization-v329-20260806/);
  assert.match(isolation327, /sanitized historical materialization chain enabled/);
  assert.doesNotMatch(isolation327, /process\.exit\s*\(\s*0\s*\)/);
  assert.doesNotMatch(isolation327, /NGEBLOGGING_REPLAY_HISTORICAL_PATCH_CHAIN/);
  assert.match(patch304, /await import\("\.\/patch-service-worker-v305\.mjs"\)/);
  assert.match(patch304, /await import\("\.\/patch-production-cutover-v320\.mjs"\)/);
});

test("v337 keeps the crossed-out Editorial/Majalah design but moves it below the main Theme map", () => {
  assert.match(runtime, /^import "\.\/studio-theme-layout-below-v337\.js";$/m);
  assert.doesNotMatch(runtime, /^import "\.\/studio-theme-layout-single-v332\.js";$/m);
  assert.doesNotMatch(runtime, /^import "\.\/studio-theme-layout-single-v334\.js";$/m);
  assert.doesNotMatch(runtime, /^import "\.\/studio-theme-layout-single-v335\.js";$/m);
  assert.doesNotMatch(runtime, /^import "\.\/studio-theme-layout-one-v336\.js";$/m);
  assert.match(runtime, /STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337 = "studio-theme-layout-below-v337-20260807"/);

  assert.match(layout337, /STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337 = "studio-theme-layout-below-v337-20260807"/);
  assert.match(layout337, /const LEGACY_MAP_SELECTOR = "\.tn-layout-map-v264"/);
  assert.match(layout337, /semanticSecondary/);
  assert.match(layout337, /placeSecondaryBelow/);
  assert.match(layout337, /showSecondaryBelow/);
  assert.match(layout337, /v337SecondaryLayout/);
  assert.match(layout337, /primary-then-secondary/);
  assert.match(layout337, /data-v336-duplicate-layout/);
  assert.match(layout337, /data-v335-duplicate-layout/);
  assert.match(layout337, /MutationObserver/);
  assert.doesNotMatch(layout337, /setImportant\([^\n]+"display",\s*"none"/);
  assert.doesNotMatch(layout337, /localStorage\.clear|sessionStorage\.clear|signOut\s*\(|location\.(?:reload|replace)\s*\(/);

  assert.match(layoutCss337, /data-v337-secondary-below="ready"/);
  assert.match(layoutCss337, /data-v337-canonical-layout="primary-v264"/);
  assert.match(layoutCss337, /data-v337-secondary-layout="below"/);
  assert.match(layoutCss337, /grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(layoutCss337, /grid-template-columns:minmax\(150px,\.88fr\) minmax\(330px,2fr\) minmax\(150px,\.88fr\)!important/);
  assert.match(layoutCss337, /writing-mode:horizontal-tb!important/);
  assert.doesNotMatch(layoutCss337, /#ngeblogging-studio-sidebar|\.nara-assistant|\.sv124-domain-page|\.ce-app|\.sn-side/);

  assert.match(chain331, /patch-studio-theme-layout-below-v337\.mjs/);
  assert.doesNotMatch(chain331, /await import\("\.\/patch-studio-theme-layout-(?:cache-v333|single-v334|single-v335|one-v336)\.mjs"\)/);
  assert.match(patch337, /STUDIO_THEME_CODE_DEVICE_RELEASE_V330/);
  assert.match(patch337, /ACTIVE_VERSION_V337/);
  assert.match(patch337, /studio-theme-layout-below-cache-v337/);

  assert.match(release337, /"secondaryEditorialMagazineSurfacePreserved": true/);
  assert.match(release337, /"secondarySurfacePosition": "below-primary-map"/);
  assert.match(release337, /"secondarySurfaceFullWidth": true/);
  assert.match(release337, /"rightHandCompressedColumnRemoved": true/);
  assert.match(release337, /"historicalFilesKeptInGit": true/);

  // v336 is retained as rollback/history source even though it is no longer active.
  assert.match(layout336, /STUDIO_THEME_LAYOUT_ONE_RELEASE_V336 = "studio-theme-layout-one-v336-20260807"/);
});
