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

test("Ganti situs v305 shows every real site and an explicit manage action", async () => {
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
  ]) assert.ok(source.includes(marker), `missing switch-site marker: ${marker}`);
  assert.match(source, /\.sn-workspace/);
  assert.match(source, /data-profile-action='switch-site'/);
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

test("v304 member manager still uses production RPCs for list invite role and removal", async () => {
  const source = await read("src/studio-members-v304.js");
  for (const marker of [
    "get_site_members_v176",
    "get_site_member_quota",
    "invite_site_member_v176",
    "update_site_member_role_v176",
    "remove_site_member_v176",
    "+ Tambah anggota",
    "Tambah & kelola anggota",
    "Admin",
    "Editor",
    "Author",
    "Viewer",
    "Menunggu",
  ]) assert.ok(source.includes(marker), `missing member marker: ${marker}`);
  assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v305 switcher and v304 member manager stay contained on mobile", async () => {
  const switcherCss = await read("src/studio-site-switcher-v305.css");
  const membersCss = await read("src/studio-members-v304.css");
  assert.match(switcherCss, /width:min\(800px,calc\(100vw - 28px\)\)/);
  assert.match(switcherCss, /@media\(max-width:680px\)/);
  assert.match(switcherCss, /safe-area-inset-bottom/);
  assert.doesNotMatch(switcherCss, /backdrop-filter:blur/);
  assert.match(membersCss, /width:min\(820px,calc\(100vw - 28px\)\)/);
  assert.match(membersCss, /@media\(max-width:760px\)/);
  assert.match(membersCss, /grid-template-columns:1fr/);
  assert.match(membersCss, /safe-area-inset-bottom/);
});

test("Cloudflare build gate accepts the generated v305 worker instead of requiring stale v303 cache markers", async () => {
  const worker = await read("public/sw.js");
  assert.match(worker, /ngeblogging-app-v305-site-switch-first-site-20260805/);
  assert.match(worker, /studio-site-switch-first-site-cache-v305/);
  assert.match(worker, /STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305/);
  assert.match(worker, /studio-site-switch-first-site-v305-20260805/);
  assert.match(worker, /studio-add-site-free-subdomain-v303-20260805/);
  assert.match(worker, /NGE_BLOGGING_UPDATE_AVAILABLE_V305/);
  assert.doesNotMatch(worker, /localStorage\.clear|sessionStorage\.clear|location\.(?:reload|replace)/);
});
