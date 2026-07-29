import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const pwa = read("src/pwa-runtime.js");
const worker = read("public/sw.js");
const device = read("src/studio-device-mode-v140.js");
const studio = read("src/StudioNext.jsx");
const nara = read("src/nara-size-authority-v144.js");
const production = JSON.parse(read("wrangler.production.jsonc"));

const menu = ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"];
const families = ["application", "phone", "mobile", "compact", "tablet", "desktop"];

test("PWA controller and service worker share the Studio v151 release", () => {
  assert.match(pwa, /ngeblogging-pwa-v151-20260729/);
  assert.match(pwa, /ngeblogging-pwa-controller-v151/);
  assert.match(pwa, /pwa-v151-studio-completion/);
  assert.match(worker, /ngeblogging-app-v151-studio-completion-20260729/);
  assert.match(worker, /studio-completion-cache-v151/);
  assert.match(worker, /studio-completion-v151/);
  assert.match(pwa, /function authSurface/);
  assert.match(worker, /function isAuthSurface/);
});

test("all responsive families and desktop variants remain deterministic", () => {
  for (const family of families) {
    assert.ok(device.includes(`"${family}"`), `device runtime missing ${family}`);
    assert.ok(pwa.includes(`"${family}"`), `PWA runtime missing ${family}`);
  }
  for (const variant of ["laptop", "computer"]) {
    assert.ok(device.includes(`"${variant}"`), `device runtime missing ${variant}`);
    assert.ok(pwa.includes(`"${variant}"`), `PWA runtime missing ${variant}`);
  }
  assert.match(device, /interactive-widget=resizes-content/);
  assert.match(pwa, /desktopSitePhone/);
  assert.match(pwa, /dataset\.deviceFamily/);
});

test("complete Studio navigation remains present", () => {
  for (const label of menu) assert.ok(studio.includes(label), `menu missing ${label}`);
  assert.match(studio, /sn-sidebar-toggle/);
  assert.match(studio, /sn-mobile-menu-mark/);
  assert.match(studio, /sn-account-footer/);
});

test("Nara keeps small medium full speech and intelligence controls", () => {
  for (const label of ["Kecil", "Medium", "Penuh", "Instan", "Sedang", "Tinggi"]) {
    assert.ok(nara.includes(label), `Nara missing ${label}`);
  }
  assert.match(nara, /speechSynthesis/);
  assert.match(nara, /nara-speech-action-v147/);
});

test("Cloudflare metadata points to the active v151 interface", () => {
  assert.equal(production.vars.APP_RELEASE, "2026.07.29-studio-completion-v151");
  assert.equal(production.vars.UI_AUTHORITY_RELEASE, "2026.07.29-studio-completion-v151");
  assert.equal(production.assets.directory, "./dist/");
  assert.equal(production.assets.run_worker_first, true);
});
