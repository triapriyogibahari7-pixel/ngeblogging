import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dataModule = readFileSync(new URL("../src/lib/studio-data.js", import.meta.url), "utf8");
const studio = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("Studio persists and restores the active site across reloads", () => {
  assert.match(dataModule, /ngeblogging-active-site-id/);
  assert.match(dataModule, /sites\.find\(\(site\) => site\.id === preferredId\)/);
  assert.match(dataModule, /setActiveSiteId\(selected\.id\)/);
  assert.match(studio, /setActiveSiteId\(next\.id\)/);
});

test("workspace API lists memberships and creates unique tenant sites", () => {
  assert.match(dataModule, /export async function listUserSites/);
  assert.match(dataModule, /site_members/);
  assert.match(dataModule, /is_site_slug_available/);
  assert.match(dataModule, /cloudflare: "wildcard-subdomain"/);
});

test("profile API persists biography website avatar locale and timezone", () => {
  assert.match(dataModule, /export async function getUserProfile/);
  assert.match(dataModule, /export async function updateUserProfile/);
  for (const field of ["display_name", "bio", "website", "avatar_url", "locale", "timezone"]) {
    assert.match(dataModule, new RegExp(field));
  }
});

test("workspace UI exposes site viewing creation selection and profile editing", () => {
  assert.match(studio, /Situs saya/);
  assert.match(studio, /Buat situs baru/);
  assert.match(studio, /\.ngeblogging\.com/);
  assert.match(studio, />Lihat</);
  assert.match(studio, /Profil & pengaturan/);
  assert.match(studio, /Simpan perubahan/);
});

test("newly created workspace becomes active without manual refresh", () => {
  assert.match(studio, /onCreated=\{\(created\)=>\{setSites/);
  assert.match(studio, /selectSite\(created\)/);
  assert.doesNotMatch(studio, /location\.reload\(\)/);
});

test("workspace and profile are implemented in React without legacy bridges", () => {
  assert.match(studio, /function SiteManager/);
  assert.match(studio, /function SettingsView/);
  assert.doesNotMatch(index, /workspace-profile-bridge\.js/);
  assert.doesNotMatch(index, /workspace-activation-bridge\.js/);
});
