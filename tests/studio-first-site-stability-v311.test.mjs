import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v311 fast entry never trusts an unscoped active-site id from another account", async () => {
  const fast = await read("src/StudioFastGate.jsx");
  assert.match(fast, /studio-fast-entry-v311-20260806/);
  assert.match(fast, /siteBelongsToUser/);
  assert.match(fast, /value\.__userId === userId/);
  assert.match(fast, /snapshotForUser/);
  assert.doesNotMatch(fast, /if \(document\.documentElement\.dataset\.activeSiteId\) return true/);
  assert.doesNotMatch(fast, /if \(localStorage\.getItem\(ACTIVE_SITE_STORAGE_KEY\)\) return true/);
});

test("v311 first-site creation remains stable, recoverable and duplicate-safe on slow responses", async () => {
  const gate = await read("src/StudioOnboardingGate.jsx");
  assert.match(gate, /first-site-onboarding-stability-v311-20260806/);
  assert.match(gate, /FIRST_SITE_DRAFT_PREFIX_V311/);
  assert.match(gate, /CREATE_RECOVERY_DELAY_MS = 12_000/);
  assert.match(gate, /CREATE_RECOVERY_WINDOW_MS = 100_000/);
  assert.match(gate, /findOwnedSiteBySlug/);
  assert.match(gate, /reconcileCreatedSite/);
  assert.match(gate, /new AbortController\(\)/);
  assert.match(gate, /tanpa menutup form atau membuat situs kedua/);
  assert.doesNotMatch(gate, /withDeadline\(createUserSiteWithPolicy\(/);
  assert.match(gate, /First-site v311 preference configuration deferred/);
  assert.match(gate, /localStorage\.setItem\(onboardingDraftKey\(user\?\.id\)/);
  assert.match(gate, /localStorage\.removeItem\(onboardingDraftKey\(userId\)\)/);
  assert.match(gate, /aria-busy=\{creating\}/);
  assert.match(gate, /eventSite\?\.__userId === props\.user\?\.id/);
  assert.match(gate, /site\.__userId !== props\.user\?\.id/);
  assert.match(gate, /firstSiteRequiredRef\.current = false/);
});

test("v311 onboarding visual layer removes blur and movement without touching the Studio sidebar", async () => {
  const css = await read("src/studio-first-site-stability-v311.css");
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /filter:none!important/);
  assert.match(css, /opacity:1!important/);
  assert.match(css, /transform:none!important/);
  assert.match(css, /animation:none!important/);
  assert.match(css, /so75-creating-status/);
  assert.doesNotMatch(css, /\.sn-side|#ngeblogging-studio-sidebar|\.nara-assistant|\.ce-editor-side-v266/);
});

test("v311 preserves the already-promoted shared Posts and Pages v310 editor", async () => {
  const runtime = await read("src/studio-content-editor-responsive-v308.js");
  const editorCss = await read("src/studio-content-editor-desktop-site-v310.css");
  assert.match(runtime, /studio-content-editor-desktop-site-v310\.css/);
  assert.match(runtime, /studio-content-editor-desktop-site-v310-20260806/);
  assert.match(editorCss, /@media \(min-width:820px\) and \(max-width:1080px\)/);
  assert.match(editorCss, /grid-template-columns:minmax\(0,1fr\) clamp\(260px,29vw,300px\)/);
  assert.match(editorCss, /html\.editor-v266-small \.ce-actions>button/);
  assert.doesNotMatch(editorCss, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark/);
});
