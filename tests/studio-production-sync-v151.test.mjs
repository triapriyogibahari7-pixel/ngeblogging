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

const menu = ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"];

test("PWA v151 compatibility remains", () => {
  for (const marker of ["ngeblogging-pwa-v151-20260729", "studio-completion-v151", "responsiveFamily", "authSurface"]) assert.ok(pwa.includes(marker));
  for (const marker of ["ngeblogging-app-v151-studio-completion-20260729", "studio-completion-cache-v151", "function isAuthSurface", "refreshStaleWindow"]) assert.ok(worker.includes(marker));
});

test("v184 extends the historical production chain without deleting earlier authorities", () => {
  assert.equal(production.assets.run_worker_first, true);
  assert.equal(production.vars.APP_RELEASE, "2026.07.30-production-custom-domain-v172");
  assert.equal(production.vars.PRODUCTION_ROUTE_AUTHORITY, "cloudflare-custom-domain-authority-v172");

  for (const marker of [
    "Ngeblogging production route cutover v184",
    "Run v183 and v184 regression",
    "PRODUCTION_ROUTE_CUTOVER_V184_VERIFY_FAILED",
    "/release-v183.json",
    "/release-v184.json",
    "Cut over apex and www to authoritative zone routes v184",
    "WHITE-R4-2026.07.12",
  ]) assert.ok(workflow.includes(marker), `workflow missing ${marker}`);

  for (const marker of [
    "2026.07.30-production-route-authority-v163",
    "2026.07.30-production-custom-domain-authority-v164",
    "2026.07.30-production-domain-attach-v165",
    "2026.07.30-production-route-recovery-v168",
    "2026.07.30-production-custom-domain-v172",
    "first-site-onboarding-v169-20260730",
    "mobile-public-v171-20260730",
  ]) assert.ok(entryWorker.includes(marker), `worker chain missing ${marker}`);

  assert.ok(worker.includes("mobile-interaction-v174-20260731"));
});

test("responsive modes, complete menu, Theme Studio and Nara remain", () => {
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop", "laptop", "computer"]) assert.ok(device.includes(`"${mode}"`), `device missing ${mode}`);
  for (const label of menu) assert.ok(studio.includes(`>${label}<`), `menu missing ${label}`);
  for (const marker of ["function LayoutMap", "WIDGET TERPILIH", "tn-code-preview-pane", "PREVIEW LANGSUNG"]) assert.ok(theme.includes(marker));
  for (const marker of ["cameraInput", "imageInput", "fileInput", "startVoice", "SpeakerIcon", "modelOptions", "intelligenceOptions", "small", "medium", "full", "Instan", "Sedang", "Tinggi"]) assert.ok(nara.includes(marker));
});

test("auth surfaces remain excluded from PWA forced navigation", () => {
  for (const route of ["/login", "/signup", "/signin", "/auth/"]) {
    assert.ok(worker.includes(route));
    assert.ok(pwa.includes(route));
  }
});
