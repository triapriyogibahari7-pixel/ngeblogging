import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "./studio-interaction-precision-v183.test.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-mobile-hardening-v181.js");
const css = read("src/studio-mobile-hardening-v181.css");
const sw179 = read("scripts/patch-service-worker-v179.mjs");
const sw181 = read("scripts/patch-service-worker-v181.mjs");
const patch182 = read("scripts/patch-site-limit-summary-v182.mjs");
const domain = read("src/DomainPanelV124.jsx");
const studio = read("src/StudioNext.jsx");
const release182 = JSON.parse(read("public/release-v182.json"));

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
  assert.match(sw179, /patch-site-limit-summary-v182\.mjs/);
  assert.match(sw179, /patch-interaction-precision-v183\.mjs/);
  assert.match(sw179, /patch-release-v183\.mjs/);
  assert.match(sw179, /patch-service-worker-v183\.mjs/);
  assert.match(sw181, /ngeblogging-app-v181-mobile-hardening-20260731/);
  assert.match(sw181, /mobile-hardening-cache-v181/);
  assert.match(sw181, /NGE_BLOGGING_UPDATE_AVAILABLE_V181/);
  assert.match(sw181, /V181_FORCED_NAVIGATION_MUST_REMAIN_DISABLED/);
});

test("Domain and Site Manager use one real twenty-five-site policy", () => {
  assert.match(patch182, /const MAX_SITES = 25/);
  assert.match(domain, /const MAX_SITES_PER_ACCOUNT = 25/);
  assert.match(studio, /const MAX_SITES_PER_ACCOUNT = 25/);
  assert.match(domain, /\{sites\.length\}\/\{MAX_SITES_PER_ACCOUNT\} situs dalam akun/);
  assert.match(domain, /`\$\{sites\.length\}\/\$\{MAX_SITES_PER_ACCOUNT\}`/);
  assert.doesNotMatch(domain, /\/12 situs dalam akun/);
  assert.doesNotMatch(domain, /sites\.length\}\/12/);
  assert.match(studio, /site-limit-v182/);
  assert.match(studio, /sites\.length >= MAX_SITES_PER_ACCOUNT/);
  assert.match(studio, /Batas maksimal \$\{MAX_SITES_PER_ACCOUNT\} situs dalam satu akun sudah tercapai/);
  assert.equal(release182.maxSitesPerAccount, 25);
  assert.equal(release182.repairs.siteManagerPreventsTwentySixthSite, true);
});

test("Domain loading is bounded and Ringkasan keeps both public-site actions", () => {
  assert.match(domain, /Situs aktif belum tersedia\. Pilih Workspace atau muat ulang Studio\./);
  assert.match(domain, /setLoading\(false\)/);
  assert.match(studio, /className="sn-secondary-link"/);
  assert.match(studio, /className="sn-view-site"/);
  assert.ok((studio.match(/Lihat situs/g) || []).length >= 2);
  assert.equal(release182.repairs.domainLoadingStopsWithoutActiveSite, true);
  assert.equal(release182.repairs.summaryViewSiteActionPreserved, true);
  assert.equal(release182.repairs.topbarViewSiteActionPreserved, true);
});