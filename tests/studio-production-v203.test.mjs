import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v203.js");
const css = read("src/studio-production-v203.css");
const patch = read("scripts/patch-production-v203.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const sw = read("public/sw.js");
const release = JSON.parse(read("public/release-v203.json"));
const supabase = read("src/lib/supabase.js");

const RELEASE = "studio-production-v203-20260802";

test("v203 loads after v202 and build patch chain ends at v203", () => {
  const v202 = entry.indexOf('import "./studio-production-v202.js";');
  const v203 = entry.indexOf('import "./studio-production-v203.js";');
  assert.ok(v202 >= 0, "v202 import missing");
  assert.ok(v203 > v202, "v203 must load after v202");
  assert.ok(chain.indexOf('patch-production-v202.mjs') < chain.indexOf('patch-production-v203.mjs'));
  assert.match(runtime, /studio-production-v203-20260802/);
});

test("physical mobile authority does not depend only on CSS viewport width", () => {
  for (const marker of [
    "studioPhysicalMobileV193",
    "studioPhysicalMobileV191",
    "studioDesktopSitePhone",
    "navigator.userAgentData?.mobile",
    "physicalShortEdge",
    "cssPhysicalWidth",
  ]) assert.ok(runtime.includes(marker), `physical-mobile marker missing ${marker}`);
  assert.match(css, /data-studio-mobile-v203="true"/);
});

test("mobile n mark is always white on blue and drawer remains clickable without blur", () => {
  assert.match(css, /#ngeblogging-studio-sidebar \.sn-logo-mark/);
  assert.match(css, /background: linear-gradient\(145deg,#2d73e6,#5149dc\) !important/);
  assert.match(css, /-webkit-text-fill-color: #fff !important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*pointer-events: auto !important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background: transparent !important/);
  assert.match(runtime, /sidebar\?\.removeAttribute\("inert"\)/);
  assert.match(runtime, /main\?\.removeAttribute\("inert"\)/);
});

test("Posts and Pages keep create buttons visible and use mobile cards instead of an 880px table", () => {
  assert.match(css, /\.sc161-content-page > \.sn-page-title > \.sn-primary/);
  assert.match(css, /\.sc161-content-page > \.sn-page-title > \.sn-primary[\s\S]*display: inline-flex !important/);
  assert.match(css, /\.sc161-table[\s\S]*min-width: 0 !important/);
  assert.match(css, /\.sc161-table-head \{ display: none !important; \}/);
  assert.ok(css.includes('"title status"') && css.includes('"taxonomy taxonomy"') && css.includes('"time actions"'));
  assert.match(runtime, /normalizeCreateActions/);
});

test("Members use readable cards and delete control cannot stretch across the row", () => {
  assert.match(css, /\.mv176-list > article[\s\S]*grid-template-columns: 48px minmax\(0,1fr\) !important/);
  assert.match(css, /\.mv176-list \.identity :is\(b,small,time\)[\s\S]*word-break: normal !important/);
  assert.match(css, /\.mv176-list \.danger[\s\S]*width: 44px !important/);
  assert.match(css, /\.mv176-list \.danger[\s\S]*height: 44px !important/);
});

test("Domain free and custom cards retain readable words on physical phones", () => {
  assert.match(css, /\.sv124-free-domain[\s\S]*grid-template-columns: 48px minmax\(0,1fr\) !important/);
  assert.match(css, /\.sv124-domain-register > header[\s\S]*grid-template-columns: 48px minmax\(0,1fr\) !important/);
  assert.match(css, /\.sv124-page :is\(h1,h2,h3,p,b,small,span,label\)[\s\S]*word-break: normal !important/);
  assert.match(css, /\.sv124-domain-register > form[\s\S]*grid-template-columns: minmax\(0,1fr\) !important/);
});

test("Post and Page editor receives physical-mobile header and contained editing geometry", () => {
  assert.ok(css.includes('"back file"') && css.includes('"actions actions"'));
  assert.match(css, /\.ce-file small[\s\S]*white-space: nowrap !important/);
  assert.match(css, /\.ce-actions[\s\S]*grid-template-columns: repeat\(2,minmax\(0,1fr\)\) !important/);
  assert.match(css, /\.ce-workspace[\s\S]*display: block !important/);
  assert.match(css, /\.ce-paper table[\s\S]*overflow-x: auto !important/);
  assert.match(css, /\.ce-sidebar[\s\S]*position: static !important/);
});

test("Theme layout and code workspace stay contained on mobile", () => {
  assert.match(css, /\.tn-layout-studio[\s\S]*grid-template-columns: minmax\(0,1fr\) !important/);
  assert.match(css, /\.tn-code-workspace[\s\S]*grid-template-columns: minmax\(0,1fr\) !important/);
  assert.match(css, /\.tn-code-pane textarea[\s\S]*ui-monospace/);
  assert.match(css, /\.tn-code-preview-pane \.tn-frame-shell[\s\S]*overflow: auto !important/);
});

test("Nara small and medium are non-modal and model/intelligence controls stop animating", () => {
  assert.match(runtime, /layer\.dataset\.v203Mode = full \? "modal" : "nonmodal"/);
  assert.match(runtime, /backdrop\.hidden = !full/);
  assert.match(css, /data-v203-mode="nonmodal"[\s\S]*pointer-events: none !important/);
  assert.match(css, /data-v203-mode="nonmodal"[\s\S]*\.nara-assistant-shell[\s\S]*pointer-events: auto !important/);
  assert.match(css, /\.nara-select[\s\S]*animation: none !important/);
  assert.match(css, /\.nara-select\.intelligence[\s\S]*grid-column: 1 \/ 3 !important/);
  assert.match(css, /\.nara-select\.model[\s\S]*grid-column: 3 \/ 5 !important/);
});

test("v203 service worker rotates cache without session destruction or forced navigation", () => {
  for (const marker of [
    "ngeblogging-app-v203-mobile-reflow-20260802",
    "mobile-reflow-cache-v203",
    "mobile-reflow-v203",
    "studio-production-v203-20260802",
    "ngeblogging-app-v202-mobile-theme-nara-20260802",
    "mobile-theme-nara-cache-v202",
  ]) assert.ok(patch.includes(marker) || sw.includes(marker), `v203 SW marker missing ${marker}`);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.doesNotMatch(sw, /await refreshStaleWindow\(client, url\);/);
});

test("auth continuity and release claims stay factual", () => {
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
  assert.equal(release.release, RELEASE);
  assert.equal(release.repairs.createPostVisibleOnMobile, true);
  assert.equal(release.repairs.createPageVisibleOnMobile, true);
  assert.equal(release.repairs.membersUseReadableMobileCards, true);
  assert.equal(release.repairs.domainHeadingsRemainReadable, true);
  assert.equal(release.validation.massLoginCapacityClaimed, false);
  assert.equal(release.validation.nineHundredMillionUserCapacityClaimed, false);
  assert.equal(release.validation.realDeviceRequiredBeforeHundredPercentClaim, true);
});
