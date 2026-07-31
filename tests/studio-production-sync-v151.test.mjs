import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const pwa = read("src/pwa-runtime.js");
const worker = read("public/sw.js");
const production = JSON.parse(read("wrangler.production.jsonc"));
const workflow = read(".github/workflows/cloudflare-token-diagnostic.yml");
const device = read("src/studio-device-mode-v140.js");
const studio = read("src/StudioNext.jsx");
const theme = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const entryWorker = read("cloudflare/worker-v69.mjs");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("PWA controller and service worker retain Studio completion v151 compatibility", () => {
  for (const marker of [
    "ngeblogging-pwa-v151-20260729", "ngeblogging-pwa-controller-v151",
    "pwa-v151-studio-completion", "studio-completion-v151",
    "responsiveFamily", "dataset.deviceFamily", "authSurface",
  ]) assert.ok(pwa.includes(marker), `PWA missing ${marker}`);
  for (const marker of [
    "ngeblogging-app-v151-studio-completion-20260729", "studio-completion-cache-v151",
    "studio-completion-v151", "function isAuthSurface", "refreshStaleWindow",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);
});

test("Cloudflare production advances through v175 without losing v151-v174 compatibility", () => {
  assert.equal(production.assets.run_worker_first, true);
  assert.equal(production.vars.APP_RELEASE, "2026.07.30-production-custom-domain-v172");
  assert.match(production.vars.UI_AUTHORITY_RELEASE, /^2026\.07\.(?:29|30)-/);
  assert.equal(production.vars.PRODUCTION_ROUTE_AUTHORITY, "cloudflare-custom-domain-authority-v172");
  assert.ok(production.routes.some((route) => route.pattern === "ngeblogging.com" && route.custom_domain === true));
  assert.ok(production.routes.some((route) => route.pattern === "www.ngeblogging.com" && route.custom_domain === true));
  assert.ok(production.routes.some((route) => route.pattern === "*.ngeblogging.com/*" && route.zone_name === "ngeblogging.com"));
  for (const marker of [
    "Run complete v147-v175 regression and build",
    "PRODUCTION_LOGIN_FINALIZER_V175_VERIFY_FAILED",
    "/release-v174.json",
    "/studio-viewport-audit-v174.html",
    "WHITE-R4-2026.07.12",
  ]) assert.ok(workflow.includes(marker), `v175 workflow missing ${marker}`);
  for (const marker of [
    "2026.07.30-production-route-authority-v163",
    "2026.07.30-production-custom-domain-authority-v164",
    "2026.07.30-production-domain-attach-v165",
    "2026.07.30-production-route-recovery-v168",
    "2026.07.30-production-custom-domain-v172",
    "first-site-onboarding-v169-20260730",
    "mobile-public-v171-20260730",
  ]) assert.ok(entryWorker.includes(marker), `historical release missing ${marker}`);
  assert.ok(worker.includes("mobile-interaction-v174-20260731"));
});

test("all responsive modes, menus, Theme tools and Nara controls remain intact", () => {
  for (const mode of ["application","phone","mobile","compact","tablet","desktop","laptop","computer"]) assert.ok(device.includes(`"${mode}"), `device missing ${mode}`);
  for (const label of menu) assert.ok(studio.includes(`>${label}<`), `menu missing ${label}`);
  for (const marker of ["function LayoutMap","WIDGET TERPILIH","tn-code-preview-pane","PREVIEW LANGSUNG"]) assert.ok(theme.includes(marker), `Theme missing ${marker}`);
  for (const marker of ["cameraInput","imageInput","fileInput","startVoice","SpeakerIcon","modelOptions","intelligenceOptions","nara-native-size-controls-v149","small","medium","full","Instan","Sedang","Tinggi"]) assert.ok(nara.includes(marker), `Nara missing ${marker}`);
});

test("auth surfaces stay protected from forced PWA navigation", () => {
  for (const route of ["/login","/signup","/signin","/auth/"]) {
    assert.ok(worker.includes(route), `worker auth guard missing ${route}`);
    assert.ok(pwa.includes(route), `PWA auth guard missing ${route}`);
  }
  for (const mode of ["signin","signup","callback","recovery","session-expired","callback-error"]) {
    assert.ok(worker.includes(mode));
    assert.ok(pwa.includes(mode));
  }
});
