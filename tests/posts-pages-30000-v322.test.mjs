import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v322 gives both Posts and Pages a 30000-word publication ceiling", async () => {
  const [guard, editor, studio, release] = await Promise.all([
    read("src/studio-content-editor-final-v316.js"),
    read("src/ContentEditor.jsx"),
    read("src/StudioNext.jsx"),
    read("public/release-v322.json"),
  ]);

  assert.match(guard, /CONTENT_WORD_LIMIT_RELEASE_V322 = "posts-pages-30000-v322-20260806"/);
  assert.match(guard, /CONTENT_WORD_LIMIT_V316 = 30000/);
  assert.match(guard, /CONTENT_WORD_WARNING_V316 = 27000/);
  assert.match(guard, /30\.000 kata/);
  assert.match(editor, /const isPage = doc\.type === "page"/);
  assert.match(studio, /<ContentEditor doc=\{active\}/);
  assert.match(studio, /active\.type === "page" \? "pages" : "posts"/);
  assert.match(release, /"publicationWordLimit": 30000/);
  assert.match(release, /"warningStartsAtWords": 27000/);
});

test("v322 never trims draft text at the 30000-word boundary", async () => {
  const [guard, data, release] = await Promise.all([
    read("src/studio-content-editor-final-v316.js"),
    read("src/lib/content-data.js"),
    read("public/release-v322.json"),
  ]);

  assert.match(guard, /Draf tetap aman dan tidak dipotong/);
  assert.match(guard, /publishButton\.disabled = over/);
  assert.match(guard, /publishedOption\.disabled = over/);
  assert.doesNotMatch(guard, /slice\([^\n]*30000|substring\([^\n]*30000/);
  assert.match(data, /body_html = String\(values\.content\)\.slice\(0, 5_000_000\)/);
  assert.match(release, /"draftsAreNeverTrimmedByWordGuard": true/);
  assert.match(release, /"overLimitDraftSaveAllowed": true/);
  assert.match(release, /"overLimitPublicationBlocked": true/);
});

test("v322 is isolated from auth sidebar Theme Domain and Nara behavior", async () => {
  const [guard, release] = await Promise.all([
    read("src/studio-content-editor-final-v316.js"),
    read("public/release-v322.json"),
  ]);

  assert.doesNotMatch(guard, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/);
  assert.doesNotMatch(guard, /ngeblogging-studio-sidebar|nara-assistant|DomainPanel|ThemeStudio/);
  assert.match(release, /"sidebarUntouched": true/);
  assert.match(release, /"authSessionUntouched": true/);
  assert.match(release, /"themeStudioUntouched": true/);
  assert.match(release, /"domainV321Untouched": true/);
  assert.match(release, /"naraUntouched": true/);
});
