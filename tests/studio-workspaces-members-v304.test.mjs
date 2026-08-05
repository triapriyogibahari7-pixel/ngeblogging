import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v304 authority chain loads after add-site without removing earlier Studio authorities", async () => {
  const source = await read("src/studio-native-controls-v290.js");
  assert.match(source, /studio-add-site-free-subdomain-v303-20260805/);
  assert.match(source, /studio-real-site-switcher-v304-20260805/);
  assert.match(source, /studio-members-real-invite-v304-20260805/);
  assert.match(source, /import\("\.\/studio-add-site-v303\.js"\)[\s\S]*import\("\.\/studio-site-switcher-v304\.js"\)[\s\S]*import\("\.\/studio-members-v304\.js"\)/);
});

test("Ganti situs v304 reloads real memberships instead of reusing stale content state", async () => {
  const source = await read("src/studio-site-switcher-v304.js");
  for (const marker of [
    "listUserSitesStartupV292",
    "Ganti situs",
    "data-site-switcher-list",
    "Muat ulang",
    "Kelola",
    "Sedang dikelola",
    "setActiveSiteId",
    "ngeblogging:active-site-change",
    "Tambah situs gratis",
    "Buat situs pertama",
  ]) assert.ok(source.includes(marker), `missing switch-site marker: ${marker}`);
  assert.match(source, /\.sn-workspace/);
  assert.match(source, /data-profile-action='switch-site'/);
  assert.doesNotMatch(source, /fallback\s*=\s*["']konten["']|placeholder=["']konten["']/i);
});

test("v304 first-site recovery clears only active-site pointers and never auth/session storage", async () => {
  const source = await read("src/studio-site-switcher-v304.js");
  assert.match(source, /clearStaleActiveSitePointers/);
  assert.match(source, /first_site/);
  assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v304 member manager uses production RPCs for list invite role and removal", async () => {
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

test("v304 switcher and member manager stay contained on mobile", async () => {
  const switcherCss = await read("src/studio-site-switcher-v304.css");
  const membersCss = await read("src/studio-members-v304.css");
  assert.match(switcherCss, /width:min\(780px,calc\(100vw - 28px\)\)/);
  assert.match(switcherCss, /@media\(max-width:680px\)/);
  assert.match(switcherCss, /safe-area-inset-bottom/);
  assert.doesNotMatch(switcherCss, /backdrop-filter:blur/);
  assert.match(membersCss, /width:min\(820px,calc\(100vw - 28px\)\)/);
  assert.match(membersCss, /@media\(max-width:760px\)/);
  assert.match(membersCss, /grid-template-columns:1fr/);
  assert.match(membersCss, /safe-area-inset-bottom/);
});
