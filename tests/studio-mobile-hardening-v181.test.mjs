import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-mobile-hardening-v181.js");
const css = read("src/studio-mobile-hardening-v181.css");
const runtime183 = read("src/studio-screenshot-authority-v183.js");
const css183 = read("src/studio-screenshot-authority-v183.css");
const release183 = JSON.parse(read("public/release-v183.json"));
const sw179 = read("scripts/patch-service-worker-v179.mjs");
const sw181 = read("scripts/patch-service-worker-v181.mjs");
const sw183 = read("scripts/patch-service-worker-v183.mjs");
const patch182 = read("scripts/patch-site-limit-summary-v182.mjs");
const domain = read("src/DomainPanelV124.jsx");
const studio = read("src/StudioNext.jsx");
const release182 = JSON.parse(read("public/release-v182.json"));

test("v180 v181 and v183 are loaded after v179 without replacing the Studio entry", () => {
  const v179 = entry.indexOf('import "./studio-mobile-runtime-v179.js"');
  const v180 = entry.indexOf('import "./studio-production-recovery-v180.js"');
  const v181 = entry.indexOf('import "./studio-mobile-hardening-v181.js"');
  const v183 = entry.indexOf('import "./studio-screenshot-authority-v183.js"');
  assert.ok(v179 >= 0);
  assert.ok(v180 > v179);
  assert.ok(v181 > v180);
  assert.ok(v183 > v181);
  assert.match(runtime, /studio-mobile-hardening-v181-20260731/);
  assert.match(runtime183, /studio-screenshot-authority-v183-20260731/);
});

test("mobile operational pages stay in normal flow and within the viewport", () => {
  for (const selector of [".sn-view-pad", ".sv124-page", ".sn-api-page", ".mv176-page"]) {
    assert.ok(css.includes(selector), `missing page guard ${selector}`);
    assert.ok(css183.includes(selector), `missing final page guard ${selector}`);
  }
  assert.match(css, /position:\s*relative\s*!important/);
  assert.match(css, /transform:\s*none\s*!important/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css183, /overflow-wrap:\s*break-word\s*!important/);
  assert.match(css183, /word-break:\s*normal\s*!important/);
  assert.match(css183, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("Post and Page editor mobile structure cannot inherit clipped desktop geometry", () => {
  for (const selector of [".ce-titlebar", ".ce-tabs", ".ce-ribbon", ".ce-workspace", ".ce-paper-shell", ".ce-paper", ".ce-sidebar"]) {
    assert.ok(css.includes(selector), `missing editor guard ${selector}`);
    assert.ok(css183.includes(selector), `missing final editor guard ${selector}`);
  }
  assert.match(css183, /grid-template-areas:\s*"back file"\s*"actions actions"/);
  assert.match(css183, /\.ce-tabs[\s\S]*overflow-x:\s*auto\s*!important/);
  assert.match(css183, /\.ce-ribbon[\s\S]*overflow-x:\s*auto\s*!important/);
  assert.match(css183, /\.ce-workspace[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*!important/);
  assert.match(css183, /\.ce-paper[\s\S]*min-height:\s*62dvh\s*!important/);
  assert.match(css183, /\.ce-sidebar[\s\S]*position:\s*static\s*!important/);
});

test("drawer remains interactive and its backdrop is physically outside the drawer", () => {
  assert.match(runtime183, /syncDrawer/);
  assert.match(runtime183, /sidebar\.removeAttribute\("inert"\)/);
  assert.match(runtime183, /main\?\.removeAttribute\("inert"\)/);
  assert.match(runtime183, /drawerBackdropV183 = "outside-only"/);
  assert.match(css183, /--v183-drawer-width/);
  assert.match(css183, /clip-path:\s*inset\(0 0 0 var\(--v183-drawer-width\)\)\s*!important/);
  assert.match(css183, /z-index:\s*2147483100\s*!important/);
  assert.match(css183, /z-index:\s*2147483000\s*!important/);
  assert.match(css183, /backdrop-filter:\s*none\s*!important/);
});

test("the mobile n logo and account menu stay bounded after rerenders", () => {
  assert.match(css183, /place-items:\s*center\s*!important/);
  assert.match(css183, /font:\s*900 31px\/40px Arial/);
  assert.match(css183, /color:\s*#2564d8\s*!important/);
  assert.match(runtime183, /syncProfile/);
  assert.match(runtime183, /document\.body\.append\(menu\)/);
  assert.match(css183, /width:\s*min\(296px,\s*calc\(100vw - 20px\)\)\s*!important/);
  assert.match(css183, /width:\s*42px\s*!important/);
});

test("Nara small and medium are nonmodal while full remains a closable modal", () => {
  assert.match(runtime, /recoverNara/);
  assert.match(runtime183, /syncNara/);
  assert.match(runtime183, /full \? "modal" : "nonmodal"/);
  assert.match(runtime183, /layer\.setAttribute\("aria-modal", String\(full\)\)/);
  assert.match(runtime183, /backdrop\.hidden = !full/);
  assert.match(runtime183, /close\.dataset\.v183Close = "true"/);
  assert.match(css183, /data-v183-nara-mode="nonmodal"/);
  assert.match(css183, /data-v183-nara-mode="modal"/);
  assert.match(css183, /pointer-events:\s*none\s*!important/);
  assert.match(css183, /pointer-events:\s*auto\s*!important/);
  assert.match(css183, /grid-template-columns:\s*36px minmax\(0,\s*1fr\) 34px 34px 34px\s*!important/);
  assert.match(css183, /button\[data-v183-close="true"\]/);
});

test("six responsive families and desktop variants are classified without deleting features", () => {
  for (const family of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.ok(runtime183.includes(`return "${family}"`) || runtime183.includes(`family === "${family}"`), `missing responsive family ${family}`);
  }
  for (const variant of ["laptop", "desktop", "computer"]) {
    assert.ok(runtime183.includes(`return "${variant}"`), `missing desktop variant ${variant}`);
  }
  assert.equal(release183.responsiveFamilies.application, true);
  assert.equal(release183.responsiveFamilies.phone, true);
  assert.equal(release183.responsiveFamilies.mobile, true);
  assert.equal(release183.responsiveFamilies.compact, true);
  assert.equal(release183.responsiveFamilies.tablet, true);
  assert.equal(release183.responsiveFamilies.desktopFamily.laptop, true);
  assert.equal(release183.responsiveFamilies.desktopFamily.desktop, true);
  assert.equal(release183.responsiveFamilies.desktopFamily.computer, true);
});

test("drawer Nara and page recovery never remove sessions or drafts", () => {
  for (const source of [runtime, runtime183]) {
    assert.doesNotMatch(source, /signOut\s*\(/);
    assert.doesNotMatch(source, /localStorage\.clear\s*\(/);
    assert.doesNotMatch(source, /sessionStorage\.clear\s*\(/);
  }
  assert.equal(release183.repairs.sessionIsNotClearedByUiRecovery, true);
  assert.equal(release183.preserved.explicitLogoutOnly, true);
});

test("loading states become bounded retry states without logging the user out", () => {
  assert.match(runtime, /markLoadingStalled/);
  assert.match(runtime, /15000/);
  assert.match(runtime, /Sesi login dan draf perangkat tetap dipertahankan/);
  assert.match(runtime, /v181-loading-retry/);
  assert.match(css, /\.v181-loading-stalled/);
  assert.match(css, /animation-play-state:\s*paused\s*!important/);
  assert.match(runtime183, /Koneksi data belum stabil\. Sesi dan draf tetap disimpan/);
});

test("service worker rotates through v181 to v183 and keeps forced navigation disabled", () => {
  assert.match(sw179, /patch-service-worker-v181\.mjs/);
  assert.match(sw179, /patch-site-limit-summary-v182\.mjs/);
  assert.match(sw181, /patch-service-worker-v183\.mjs/);
  assert.match(sw183, /ngeblogging-app-v183-screenshot-authority-20260731/);
  assert.match(sw183, /screenshot-authority-cache-v183/);
  assert.match(sw183, /NGE_BLOGGING_UPDATE_AVAILABLE_V183/);
  assert.match(sw183, /V183_FORCED_NAVIGATION_MUST_REMAIN_DISABLED/);
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

test("v183 release remains factual and rejects unsupported capacity claims", () => {
  assert.equal(release183.release, "studio-screenshot-authority-v183-20260731");
  assert.equal(release183.status, "candidate");
  assert.equal(release183.repairs.drawerMenuRemainsInteractive, true);
  assert.equal(release183.repairs.naraSmallMediumRemainNonmodal, true);
  assert.equal(release183.verification.providerLoginEndToEndStillRequiresRealProviderInteraction, true);
  assert.equal(release183.verification.massLoginCapacityClaimed, false);
  assert.equal(release183.verification.fakeStatisticsAdded, false);
  assert.doesNotMatch(JSON.stringify(release183), /900\s*(juta|miliar)/i);
});
