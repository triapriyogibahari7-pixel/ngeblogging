import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v305 authority chain loads after add-site without removing earlier Studio authorities", async () => {
  const source = await read("src/studio-native-controls-v290.js");
  assert.match(source, /studio-add-site-free-subdomain-v303-20260805/);
  assert.match(source, /studio-real-site-switcher-v305-20260805/);
  assert.match(source, /studio-first-site-required-v305-20260805/);
  assert.match(source, /studio-members-real-invite-v304-20260805/);
  assert.match(source, /import\("\.\/studio-add-site-v303\.js"\)[\s\S]*import\("\.\/studio-site-switcher-v305\.js"\)[\s\S]*import\("\.\/studio-members-v304\.js"\)/);
  assert.doesNotMatch(source, /import\("\.\/studio-site-switcher-v304\.js"\)/);
});

test("Ganti situs v305 shows every real site and explicit manage/delete actions", async () => {
  const source = await read("src/studio-site-switcher-v305.js");
  for (const marker of [
    "listUserSitesStartupV292",
    "Ganti situs",
    "data-site-switcher-list",
    "Muat ulang",
    "Kelola situs ini",
    "Sedang dikelola",
    "setActiveSiteId",
    "ngeblogging:active-site-change",
    "Tambah situs",
    "Buat situs pertama",
    "ngeblogging:first-site-required-v305",
    "studio-site-manager-actions-v306-20260805",
    "Hapus situs",
    "siteDeleteV306",
  ]) assert.ok(source.includes(marker), `missing switch-site marker: ${marker}`);
  assert.match(source, /\.sn-workspace/);
  assert.match(source, /data-profile-action='switch-site'/);
  assert.match(source, /supabase\.from\("sites"\)\.delete\(\)/);
  assert.doesNotMatch(source, /fallback\s*=\s*["']konten["']|placeholder=["']konten["']/i);
});

test("startup v305 unions site_members with sites owned by the logged-in user", async () => {
  const source = await read("src/studio-startup-v292.js");
  for (const marker of [
    "STARTUP_SITE_UNION_RELEASE_V305",
    "startup-membership-plus-owned-sites-v305-20260805",
    "/rest/v1/site_members",
    "/rest/v1/sites",
    "owner_id",
    "mergeSiteCollections",
    "role: \"owner\"",
  ]) assert.ok(source.includes(marker), `missing startup union marker: ${marker}`);
  assert.match(source, /Promise\.all\(\[\s*fetch\(membershipEndpoint[\s\S]*fetch\(ownedEndpoint/);
});

test("first login without a real site is forced through the complete first-site onboarding", async () => {
  const source = await read("src/StudioOnboardingGate.jsx");
  for (const marker of [
    "FIRST_SITE_GUARD_RELEASE_V305",
    "ngeblogging:first-site-required-v305",
    "Buat situs pertama",
    "Nama situs",
    "Subdomain gratis",
    "Tema awal",
    "Bahasa",
    "Zona waktu",
    "Blog",
    "Website",
    "Portal berita",
    "Forum",
    "Komunitas",
    "Landing page",
    "Diary / jurnal",
    "Portofolio",
    "Profil",
    "Knowledge base",
    "Pengetahuan umum",
  ]) assert.ok(source.includes(marker), `missing first-site marker: ${marker}`);
  assert.match(source, /userId && snapshot\.__userId !== userId/);
  assert.match(source, /window\.__ngebloggingActiveSite = snapshot/);
  assert.match(source, /clearActiveSiteRecoveryV305\(\)[\s\S]*setPhase\("onboarding"\)/);
  assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v305 first-site recovery clears only active-site pointers and never auth/session storage", async () => {
  const source = await read("src/studio-site-switcher-v305.js");
  assert.match(source, /clearStaleActiveSitePointers/);
  assert.match(source, /first-site-required-v305/);
  assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("member manager exposes real add and remove-member controls through production RPCs", async () => {
  const source = await read("src/studio-members-v304.js");
  for (const marker of [
    "get_site_members_v176",
    "get_site_member_quota",
    "invite_site_member_v176",
    "update_site_member_role_v176",
    "remove_site_member_v176",
    "studio-members-actions-v306-20260805",
    "+ Tambah anggota",
    "Tambah anggota",
    "Tambah & kelola anggota",
    "Hapus anggota",
    "memberRemoveV306",
    "Admin",
    "Editor",
    "Author",
    "Viewer",
    "Menunggu",
  ]) assert.ok(source.includes(marker), `missing member marker: ${marker}`);
  assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v305 switcher and member manager stay contained on mobile with readable actions", async () => {
  const switcherCss = await read("src/studio-site-switcher-v305.css");
  const membersCss = await read("src/studio-members-v304.css");
  assert.match(switcherCss, /width:min\(800px,calc\(100vw - 28px\)\)/);
  assert.match(switcherCss, /@media\(max-width:680px\)/);
  assert.match(switcherCss, /safe-area-inset-bottom/);
  assert.match(switcherCss, /grid-template-columns:minmax\(0,1fr\) 44px/);
  assert.match(switcherCss, /\.site-actions \.danger/);
  assert.doesNotMatch(switcherCss, /backdrop-filter:blur/);
  assert.match(membersCss, /width:min\(820px,calc\(100vw - 28px\)\)/);
  assert.match(membersCss, /@media\(max-width:760px\)/);
  assert.match(membersCss, /@media\(max-width:900px\)/);
  assert.match(membersCss, /minmax\(230px,auto\)/);
  assert.match(membersCss, /safe-area-inset-bottom/);
});

test("Cloudflare build gate accepts checked-in v303 source and generated v305 worker", async () => {
  const worker = await read("public/sw.js");
  const generatedV305 = worker.includes("ngeblogging-app-v305-site-switch-first-site-20260805")
    || worker.includes("STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305");

  assert.match(worker, /studio-add-site-free-subdomain-v303-20260805/);
  assert.doesNotMatch(worker, /localStorage\.clear|sessionStorage\.clear|location\.(?:reload|replace)/);

  if (generatedV305) {
    assert.match(worker, /ngeblogging-app-v305-site-switch-first-site-20260805/);
    assert.match(worker, /studio-site-switch-first-site-cache-v305/);
    assert.match(worker, /STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305/);
    assert.match(worker, /studio-site-switch-first-site-v305-20260805/);
    assert.match(worker, /NGE_BLOGGING_UPDATE_AVAILABLE_V305/);
  } else {
    assert.match(worker, /ngeblogging-app-v303-add-site-20260805/);
    assert.match(worker, /studio-add-site-cache-v303/);
    assert.match(worker, /NGE_BLOGGING_UPDATE_AVAILABLE_V303/);
  }
});

test("v306 loads after v305 actions and protects the switch-site interaction layout", async () => {
  const native = await read("src/studio-native-controls-v290.js");
  const runtime = await read("src/studio-site-switcher-v306-fix.js");
  const css = await read("src/studio-site-switcher-v306-fix.css");

  assert.match(native, /studio-site-switcher-layout-delete-v306-20260805/);
  assert.match(native, /import\("\.\/studio-site-switcher-v305-actions\.js"\)[\s\S]*import\("\.\/studio-site-switcher-v306-fix\.js"\)/);
  assert.match(runtime, /STUDIO_SITE_SWITCHER_FIX_RELEASE_V306/);
  assert.match(css, /data-site-switcher-close/);
  assert.match(css, /position:absolute!important/);
  assert.match(css, /right:18px!important/);
  assert.match(css, /grid-template-columns:50px minmax\(0,1fr\) minmax\(250px,auto\)/);
  assert.match(css, /\.sn-modal-layer \.sn-site-manager/);
  assert.match(css, /white-space:normal!important/);
  assert.match(css, /overflow-wrap:anywhere!important/);
});

test("v306 adds owner-only site deletion without clearing auth/session storage", async () => {
  const runtime = await read("src/studio-site-switcher-v306-fix.js");
  for (const marker of [
    ".from(\"sites\")",
    ".delete()",
    ".eq(\"owner_id\", userId)",
    ".select(\"id\")",
    "Hanya pemilik situs yang dapat menghapus situs ini.",
    "Hapus situs",
    "window.confirm",
    "ngeblogging:site-deleted-v306",
    "ngeblogging:first-site-required-v305",
    "site-delete-v306",
  ]) assert.ok(runtime.includes(marker), `missing v306 deletion marker: ${marker}`);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.doesNotMatch(runtime, /MutationObserver|setInterval\s*\(|stopImmediatePropagation/);
});

test("v306 keeps actions usable on small screens without horizontal action spill", async () => {
  const css = await read("src/studio-site-switcher-v306-fix.css");
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /\.site-delete-v306\{\s*grid-column:1\/-1!important/);
  assert.match(css, /max-height:calc\(100dvh - 16px\)!important/);
  assert.match(css, /pointer-events:auto!important/);
});
