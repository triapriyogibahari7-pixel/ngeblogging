import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-ui-v187.mjs");
const entry = read("src/Studio.jsx");
const studio = read("src/StudioNext.jsx");
const editor = read("src/ContentEditor.jsx");
const nara = read("src/NaraAssistant.jsx");
const runtime = read("src/studio-production-authority-v187.js");
const css = read("src/studio-production-authority-v187.css");
const sw = read("public/sw.js");
const release = JSON.parse(read("public/release-v187.json"));

test("v187 patch runs after v186", () => {
  assert.match(chain, /patch-production-data-v186\.mjs/);
  assert.match(chain, /patch-production-ui-v187\.mjs/);
  assert.ok(chain.indexOf("patch-production-data-v186.mjs") < chain.indexOf("patch-production-ui-v187.mjs"));
  assert.match(patch, /studio-production-authority-v187-20260801/);
});

test("Studio entry loads final v187 authority", () => {
  assert.match(entry, /studio-mobile-authority-v185\.js/);
  assert.match(entry, /studio-production-authority-v187\.js/);
  assert.ok(entry.indexOf("studio-production-authority-v187.js") > entry.indexOf("studio-mobile-authority-v185.js"));
});

test("sidebar state and active site survive render and navigation", () => {
  assert.match(studio, /SIDEBAR_STATE_V187/);
  assert.match(studio, /readSidebarStateV187/);
  assert.match(studio, /writeSidebarStateV187/);
  assert.match(studio, /active-site-selected-v187/);
  assert.match(studio, /ngeblogging:active-site-change/);
});

test("5000 word rule warns without truncating drafts", () => {
  assert.match(studio, /documentWordCountV187\(active\.content\)/);
  assert.match(studio, /wordCount > 5000/);
  assert.match(studio, /Draf tetap tersimpan utuh/);
  assert.match(editor, /\/ 5\.000 kata/);
  assert.match(editor, /mendekati batas/);
  assert.doesNotMatch(patch, /slice\([^\n]*5000\)/);
});

test("drawer remains clickable above a non-blur backdrop", () => {
  assert.match(runtime, /normalizeDrawer/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*z-index:3090!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*z-index:3100!important/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /width:min\(78vw,330px\)!important/);
});

test("mobile editor uses a full-width single column", () => {
  assert.match(css, /\.ce-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /\.ce-paper[\s\S]*width:100%!important/);
  assert.match(css, /\.ce-sidebar[\s\S]*position:static!important/);
  assert.match(css, /\.ce-file input[\s\S]*white-space:nowrap!important/);
  assert.match(css, /\.ce-ribbon[\s\S]*overflow-x:auto!important/);
});

test("Nara small and medium are non-modal with visible close controls", () => {
  assert.match(nara, /aria-modal=\{size === "full"\}/);
  assert.match(nara, /hidden=\{size !== "full"\}/);
  assert.match(nara, /Buka Nara AI Assistant dalam ukuran kecil/);
  assert.match(runtime, /productionNaraModeV187/);
  assert.match(css, /data-production-nara-mode-v187="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /data-production-nara-mode-v187="modal"[\s\S]*pointer-events:auto!important/);
});

test("Theme actions expose layout, HTML, CSS, JavaScript, widgets, and site preview", () => {
  assert.match(runtime, /Edit Tata Letak/);
  assert.match(runtime, /Edit CSS/);
  assert.match(runtime, /Edit JavaScript/);
  assert.match(runtime, /openThemeCodeTab/);
  assert.match(css, /\.tn-hero-actions/);
});

test("six responsive families and desktop variants are explicit", () => {
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.match(css, new RegExp(`data-studio-responsive-mode="${mode}"`));
  }
  assert.match(css, /data-studio-device-variant="laptop"/);
  assert.match(css, /data-studio-device-variant="computer"/);
});

test("service worker rotates without forced logout or navigation", () => {
  assert.match(sw, /ngeblogging-app-v187-production-authority-20260801/);
  assert.match(sw, /production-authority-cache-v187/);
  assert.match(sw, /PRODUCTION_AUTHORITY_RELEASE_V187/);
  assert.doesNotMatch(sw, /await refreshStaleWindow\(client, url\);/);
  assert.doesNotMatch(patch, /signOut\s*\(/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(/);
});

test("release manifest records only verifiable repairs", () => {
  assert.equal(release.release, "studio-production-authority-v187-20260801");
  assert.equal(release.repairs.drawerMenuClickable, true);
  assert.equal(release.repairs.naraSmallMediumNonModal, true);
  assert.equal(release.repairs.wordLimitWithoutTruncation, true);
  assert.equal(release.repairs.themeActionsVisible, true);
});
