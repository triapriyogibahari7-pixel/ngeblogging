import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtime = await readFile(new URL("../src/studio-sidebar-hard-lock-v301.js", import.meta.url), "utf8");
const css = await readFile(new URL("../src/studio-sidebar-hard-lock-v301.css", import.meta.url), "utf8");
const v300 = await readFile(new URL("../src/studio-sidebar-direct-v300.js", import.meta.url), "utf8");
const release = await readFile(new URL("../public/release-v301.json", import.meta.url), "utf8");
const addSiteV303 = await readFile(new URL("../src/studio-add-site-v303.js", import.meta.url), "utf8");
const addSiteCssV303 = await readFile(new URL("../src/studio-add-site-v303.css", import.meta.url), "utf8");
const nativeV290 = await readFile(new URL("../src/studio-native-controls-v290.js", import.meta.url), "utf8");

const requiredMenus = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v301 hard-locks the physical mobile shell with no desktop rail", () => {
  assert.match(runtime, /studio-sidebar-hard-lock-v301-20260805/);
  assert.match(runtime, /physicalShortSide\(\) <= 760/);
  assert.match(runtime, /margin-left", "0"/);
  assert.match(runtime, /width", "100%"/);
  assert.match(runtime, /min\(78vw, 336px\)/);
  assert.match(runtime, /inline-geometry-owner-v301/);
  assert.match(css, /data-studio-responsive-mode="phone"/);
  assert.match(css, /data-studio-responsive-mode="mobile"/);
  assert.match(css, /data-studio-responsive-mode="compact"/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open/);
});

test("v301 preserves one direct n owner and only adds geometry authority", () => {
  assert.match(v300, /mark\.addEventListener\("click", directToggle/);
  assert.match(v300, /import\("\.\/studio-sidebar-hard-lock-v301\.js"\)/);
  assert.doesNotMatch(runtime, /addEventListener\("click",\s*directToggle/);
  assert.doesNotMatch(runtime, /new MutationObserver/);
  assert.doesNotMatch(runtime, /setInterval\s*\(/);
  assert.doesNotMatch(runtime, /stopImmediatePropagation/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /location\.(?:reload|replace)\s*\(/);
});

test("v301 keeps desktop 220/70 geometry, profile and Nara fixed", () => {
  assert.match(runtime, /collapsed \? "70px" : "220px"/);
  assert.match(runtime, /\.sn-top \.sn-avatar/);
  assert.match(runtime, /\.nara-floating-button/);
  assert.match(runtime, /position", "fixed"/);
  assert.match(css, /--v301-open:220px/);
  assert.match(css, /--v301-rail:70px/);
});

test("release preserves the complete sidebar contract and does not claim unrun scale tests", () => {
  const parsed = JSON.parse(release);
  assert.equal(parsed.release, "studio-sidebar-hard-lock-v301-20260805");
  assert.deepEqual(parsed.preserved.sidebarMenus, requiredMenus);
  assert.equal(parsed.preserved.themeCatalogCount, 100);
  assert.equal(parsed.preserved.themeLayoutAreas, 26);
  assert.equal(parsed.preserved.postPageWordLimit, 5000);
  assert.equal(parsed.validation.capacity900MillionClaimed, false);
  assert.equal(parsed.validation.productionDeploymentClaimed, false);
});

test("v303 loads a dedicated free-site creation authority after the active shell", () => {
  assert.match(nativeV290, /studio-add-site-free-subdomain-v303-20260805/);
  assert.match(nativeV290, /import\("\.\/studio-shell-authority-v298\.js"\)[\s\S]*import\("\.\/studio-add-site-v303\.js"\)/);
  assert.match(addSiteV303, /createUserSiteWithPolicy/);
  assert.match(addSiteV303, /getSiteQuota/);
  assert.match(addSiteV303, /is_site_slug_available/);
  assert.match(addSiteV303, /setActiveSiteId/);
  assert.match(addSiteV303, /ngeblogging:site-created-v303/);
  assert.doesNotMatch(addSiteV303, /\.sn-workspace[^\n]*click\(/);
});

test("v303 Add site clearly creates a free ngeblogging.com subdomain without a content fallback", () => {
  for (const marker of ["Tambah situs gratis","Subdomain gratis","ALAMAT SITUS GRATIS","Buat situs gratis","free_subdomain: true"]) {
    assert.ok(addSiteV303.includes(marker), `missing v303 marker: ${marker}`);
  }
  assert.match(addSiteV303, /\.sn-add-site-v298/);
  assert.match(addSiteV303, /data-profile-action='add-site'/);
  assert.doesNotMatch(addSiteV303, /Maksimal\s+25|25\s+situs|slot tersisa/i);
  assert.doesNotMatch(addSiteV303, /fallback\s*=\s*"konten"|placeholder="konten"/i);
  assert.doesNotMatch(addSiteV303, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.doesNotMatch(addSiteV303, /MutationObserver|setInterval|stopImmediatePropagation/);
});

test("v303 Add site dialog stays contained across desktop and mobile", () => {
  assert.match(addSiteCssV303, /place-items:center/);
  assert.match(addSiteCssV303, /width:min\(760px,calc\(100vw - 28px\)\)/);
  assert.match(addSiteCssV303, /max-height:min\(88dvh,820px\)/);
  assert.match(addSiteCssV303, /@media\(max-width:760px\)/);
  assert.match(addSiteCssV303, /grid-template-columns:1fr/);
  assert.match(addSiteCssV303, /safe-area-inset-bottom/);
});
