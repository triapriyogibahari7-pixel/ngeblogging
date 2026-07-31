import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-mobile-hardening-v181.js");
const css = read("src/studio-mobile-hardening-v181.css");
const sw179 = read("scripts/patch-service-worker-v179.mjs");
const sw181 = read("scripts/patch-service-worker-v181.mjs");

test("v180 and v181 are loaded after v179 without replacing the Studio entry", () => {
  const v179 = entry.indexOf('import "./studio-mobile-runtime-v179.js"');
  const v180 = entry.indexOf('import "./studio-production-recovery-v180.js"');
  const v181 = entry.indexOf('import "./studio-mobile-hardening-v181.js"');
  assert.ok(v179 >= 0);
  assert.ok(v180 > v179);
  assert.ok(v181 > v180);
  assert.match(runtime, /studio-mobile-hardening-v181-20260731/);
});

test("mobile operational pages stay in normal flow and within the viewport", () => {
  for (const selector of [".sn-view-pad", ".sv124-page", ".sn-api-page", ".mv176-page"]) {
    assert.ok(css.includes(selector), `missing page guard ${selector}`);
  }
  assert.match(css, /position:\s*relative\s*!important/);
  assert.match(css, /transform:\s*none\s*!important/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,1fr\)/);
});

test("Post and Page editor mobile structure cannot inherit clipped desktop geometry", () => {
  for (const selector of [".ce-titlebar", ".ce-tabs", ".ce-ribbon", ".ce-workspace", ".ce-paper-shell", ".ce-paper", ".ce-sidebar"]) {
    assert.ok(css.includes(selector), `missing editor guard ${selector}`);
  }
  assert.match(css, /grid-template-areas:\s*"back file"\s*"actions actions"/);
  assert.match(css, /\.ce-tabs[\s\S]*overflow-x:\s*auto\s*!important/);
  assert.match(css, /\.ce-ribbon[\s\S]*overflow-x:\s*auto\s*!important/);
  assert.match(css, /\.ce-paper[\s\S]*min-height:\s*60dvh\s*!important/);
});

test("drawer and Nara recovery do not remove sessions or drafts", () => {
  assert.match(runtime, /recoverDrawer/);
  assert.match(runtime, /main\?\.removeAttribute\("inert"\)/);
  assert.match(runtime, /recoverNara/);
  assert.match(runtime, /nonmodal/);
  assert.match(runtime, /button\[aria-label\*="Tutup" i\]/);
  assert.doesNotMatch(runtime, /signOut\s*\(/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /sessionStorage\.clear\s*\(/);
});

test("loading states become bounded retry states without logging the user out", () => {
  assert.match(runtime, /markLoadingStalled/);
  assert.match(runtime, /15000/);
  assert.match(runtime, /Sesi login dan draf perangkat tetap dipertahankan/);
  assert.match(runtime, /v181-loading-retry/);
  assert.match(css, /\.v181-loading-stalled/);
  assert.match(css, /animation-play-state:\s*paused\s*!important/);
});

test("service worker rotates cache after v180 and keeps forced navigation disabled", () => {
  assert.match(sw179, /patch-service-worker-v181\.mjs/);
  assert.match(sw181, /ngeblogging-app-v181-mobile-hardening-20260731/);
  assert.match(sw181, /mobile-hardening-cache-v181/);
  assert.match(sw181, /NGE_BLOGGING_UPDATE_AVAILABLE_V181/);
  assert.match(sw181, /V181_FORCED_NAVIGATION_MUST_REMAIN_DISABLED/);
});
