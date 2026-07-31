import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v183.js");
const css = read("src/studio-production-v183.css");
const patch = read("scripts/patch-studio-production-v183.mjs");
const packageJson = JSON.parse(read("package.json"));
const release = JSON.parse(read("public/release-v183.json"));

test("v183 is loaded after the existing mobile hardening authority", () => {
  const v181 = entry.indexOf('import "./studio-mobile-hardening-v181.js";');
  const v183 = entry.indexOf('import "./studio-production-v183.js";');
  assert.ok(v181 >= 0);
  assert.ok(v183 > v181);
  assert.match(runtime, /studio-production-v183-20260801/);
});

test("drawer menu remains above its backdrop and all menu controls stay clickable", () => {
  assert.match(runtime, /recoverDrawer/);
  assert.match(runtime, /backdrop\.hidden = !open/);
  assert.match(runtime, /sidebar\.removeAttribute\("inert"\)/);
  assert.match(css, /\.sn-shell > \.sn-side[\s\S]*z-index:\s*2147483200/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*z-index:\s*2147483100/);
  assert.match(css, /\.sn-side\.mobile-open[\s\S]*pointer-events:\s*auto/);
  assert.match(css, /\.sn-side > nav[\s\S]*overflow-y:\s*auto/);
});

test("mobile editor prevents one-letter vertical wrapping and desktop clipping", () => {
  for (const selector of [".ce-titlebar", ".ce-file", ".ce-actions", ".ce-tabs", ".ce-ribbon", ".ce-paper"]) {
    assert.ok(css.includes(selector), `missing ${selector}`);
  }
  assert.match(css, /grid-template-areas:\s*"back file"\s*"actions actions"/);
  assert.match(css, /\.ce-file[\s\S]*grid-template-columns:\s*24px minmax\(0,1fr\)/);
  assert.match(css, /\.ce-file :is\(b,small,span\)[\s\S]*white-space:\s*nowrap/);
  assert.match(css, /\.ce-tabs,.ce-ribbon[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /\.ce-paper[\s\S]*word-break:\s*normal/);
});

test("Media, Members, Domain, API Keys and Theme actions remain normal-flow mobile surfaces", () => {
  for (const selector of [
    ".sn-media-tools nav",
    ".mv176-title-actions",
    ".sv124-page-title",
    ".sn-api-title",
    ".tn-hero-actions",
    ".tn-code-workspace",
    ".tn-layout-studio",
  ]) {
    assert.ok(css.includes(selector), `missing ${selector}`);
  }
  assert.match(css, /\.sn-media-tools nav[\s\S]*position:\s*relative/);
  assert.match(css, /\.sn-media-tools nav[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /\.tn-code-workspace[\s\S]*grid-template-columns:\s*minmax\(0,1fr\)/);
});

test("Nara small and medium are non-modal while full-screen remains modal", () => {
  assert.match(runtime, /recoverNara/);
  assert.match(runtime, /layer\.dataset\.v183Mode = full \? "modal" : "nonmodal"/);
  assert.match(runtime, /backdrop\.hidden = !full/);
  assert.match(css, /data-v183-mode="nonmodal"/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /data-v183-mode="modal"/);
  assert.match(patch, /aria-modal=\{size === "full"\}/);
  assert.match(patch, /hidden=\{size !== "full"\}/);
});

test("active-site bootstrap uses a bounded deadline, cache and retries without logout", () => {
  assert.match(patch, /studio-bootstrap-resilient-v183/);
  assert.match(patch, /ACTIVE_SITE_SNAPSHOT_V183/);
  assert.match(patch, /withStudioDeadlineV183/);
  assert.match(patch, /scheduleRetry/);
  assert.match(patch, /ngeblogging:active-site-ready/);
  assert.doesNotMatch(patch, /signOut\s*\(/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /sessionStorage\.clear\s*\(/);
});

test("loading is bounded and service worker rotates without forced navigation", () => {
  assert.match(runtime, /markLoadingStalled/);
  assert.match(runtime, /12000/);
  assert.match(runtime, /Sesi login dan draf tetap disimpan/);
  assert.match(css, /\.v183-loading-stalled/);
  assert.match(patch, /ngeblogging-app-v183-production-ui-20260801/);
  assert.match(patch, /production-ui-cache-v183/);
  assert.match(patch, /V183_FORCED_NAVIGATION_MUST_REMAIN_DISABLED/);
});

test("production test and release metadata include v183", () => {
  assert.match(packageJson.scripts["verify:v183"], /studio-production-v183\.test\.mjs/);
  assert.match(packageJson.scripts["test:production"], /studio-production-v183\.test\.mjs/);
  assert.equal(release.release, "studio-production-v183-20260801");
  assert.equal(release.repairs.drawerMenuClickable, true);
  assert.equal(release.repairs.naraSmallMediumNonModal, true);
  assert.equal(release.repairs.mobileEditorNoVerticalText, true);
  assert.equal(release.repairs.activeSiteBootstrapResilient, true);
});
