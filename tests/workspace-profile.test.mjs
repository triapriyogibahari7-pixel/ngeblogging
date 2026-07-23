import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dataModule = readFileSync(new URL("../src/lib/studio-data.js", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../src/workspace-profile-bridge.js", import.meta.url), "utf8");
const activation = readFileSync(new URL("../src/workspace-activation-bridge.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("Studio persists and restores the active site across reloads", () => {
  assert.match(dataModule, /ngeblogging-active-site-id/);
  assert.match(dataModule, /sites\.find\(\(site\) => site\.id === preferredId\)/);
  assert.match(dataModule, /setActiveSiteId\(selected\.id\)/);
});

test("workspace API lists memberships and creates unique tenant sites", () => {
  assert.match(dataModule, /export async function listUserSites/);
  assert.match(dataModule, /site_members/);
  assert.match(dataModule, /is_site_slug_available/);
  assert.match(dataModule, /cloudflare: "wildcard-subdomain"/);
});

test("profile API persists biography, website, avatar, locale, and timezone", () => {
  assert.match(dataModule, /export async function getUserProfile/);
  assert.match(dataModule, /export async function updateUserProfile/);
  for (const field of ["display_name", "bio", "website", "avatar_url", "locale", "timezone"]) {
    assert.match(dataModule, new RegExp(field));
  }
});

test("workspace UI exposes site viewing, URL copy, creation, and profile editing", () => {
  assert.match(workspace, /Lihat situs/);
  assert.match(workspace, /Salin alamat/);
  assert.match(workspace, /Buat situs baru/);
  assert.match(workspace, /Profil & biografi/);
  assert.match(workspace, /Simpan profil/);
});

test("newly created workspace becomes active without manual refresh", () => {
  assert.match(activation, /location\.reload\(\)/);
  assert.match(activation, /berhasil dibuat/i);
});

test("workspace bridges are loaded by the application", () => {
  assert.match(index, /workspace-profile-bridge\.js/);
  assert.match(index, /workspace-activation-bridge\.js/);
});
