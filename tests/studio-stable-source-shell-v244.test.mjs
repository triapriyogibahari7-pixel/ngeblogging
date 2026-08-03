import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-stable-shell-v244.js");
const css = read("src/studio-stable-shell-v244-final.css");
const studio = read("src/StudioNext.jsx");
const auth = read("src/lib/supabase.js");
const nara = read("src/NaraAssistant.jsx");
const release = read("public/release-v244.json");
const vite = read("vite.config.js");
const native248 = read("src/studio-native-stability-v248.js");

const RELEASE = "studio-stable-source-shell-v244-20260803";

test("v244 source remains available but v248 supersedes its duplicate chrome", () => {
  assert.doesNotMatch(entry, /import "\.\/studio-stable-shell-v244\.js"/);
  assert.ok(entry.indexOf('import "./studio-stable-shell-v244-final.css"') >= 0);
  assert.ok(entry.indexOf('import "./studio-native-stability-v248.js"') > entry.indexOf('import "./studio-stable-shell-v244-final.css"'));
  assert.match(native248, /restoreReactChrome/);
  assert.doesNotMatch(vite, /finalizeServiceWorkerV244\(\)/);
  assert.match(vite, /finalizeServiceWorkerV248/);
});

test("v244 historical implementation remains recoverable without losing actions", () => {
  for (const marker of [
    RELEASE,
    "ngeblogging-studio-chrome-v244",
    "ngeblogging-sidebar-state-v244",
    "v244-mobile-n",
    "v244-internal-n",
    "v244-profile-menu",
    "v244-legacy-sidebar",
    'data-account="profile"',
    'data-account="settings"',
    'data-account="add-site"',
    'data-account="view-site"',
    'data-account="logout"',
  ]) assert.ok(runtime.includes(marker), `missing v244 historical marker: ${marker}`);

  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    assert.ok(studio.includes(label), `React action must remain mounted: ${label}`);
  }
});

test("v244 responsive and Nara contracts remain as fallback source only", () => {
  for (const marker of [
    'new Set(["application", "phone", "mobile", "compact"])',
    'return "large"',
    'data-studio-v244-family="large"',
    'data-studio-v244-family="small"',
    "--v244-open:248px",
    "--v244-rail:70px",
    "zoom:1!important",
    "background:transparent",
  ]) assert.ok(runtime.includes(marker) || css.includes(marker), `missing compatibility contract: ${marker}`);
  for (const marker of ["cameraInput", "imageInput", "fileInput", "capture=\"environment\"", "nara-select intelligence", "nara-select model"])
    assert.ok(nara.includes(marker), `real Nara React control missing: ${marker}`);
});

test("auth/session remains persistent and historical v244 adds no destructive session action", () => {
  for (const marker of ['flowType: "pkce"', "persistSession: true", "autoRefreshToken: true"])
    assert.ok(auth.includes(marker), `auth contract missing: ${marker}`);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/);
  assert.match(release, new RegExp(RELEASE));
  assert.match(release, /oauthEndToEndRequiresRealProviderSession/);
});
