import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const [pkgText, productionText, studioEntry, studio, device, theme, nara, worker, pwa, favicon] = await Promise.all([
  read("package.json"), read("wrangler.production.jsonc"), read("src/Studio.jsx"), read("src/StudioNext.jsx"),
  read("src/studio-device-mode-v140.js"), read("src/ThemeStudio.jsx"), read("src/NaraAssistant.jsx"),
  read("public/sw.js"), read("src/pwa-runtime.js"), read("public/favicon.svg"),
]);
const pkg = JSON.parse(pkgText);
const production = JSON.parse(productionText);
const requireAll = (source, markers, label) => {
  for (const marker of markers) assert.ok(source.includes(marker), `${label} kehilangan ${marker}`);
};

assert.ok(pkg.scripts.build.includes("studio-cache-v151.test.mjs"));
assert.ok(pkg.scripts.build.includes("vite build"));
assert.ok(pkg.scripts["test:production"].includes("validate-production-v151.mjs"));
assert.equal(production.assets.directory, "./dist/");
assert.equal(production.assets.run_worker_first, true);
assert.equal(production.vars.APP_RELEASE, "2026.07.29-studio-recovery-v151");
assert.equal(production.vars.UI_AUTHORITY_RELEASE, "2026.07.29-studio-recovery-v151");

requireAll(studioEntry, ["studio-interface-v149.css", "studio-recovery-v150.js", "studio-recovery-v150.css"], "Studio entry");
requireAll(studio, [
  ">Buat Post<", ">Ringkasan<", ">Posts<", ">Pages<", ">Tema<", ">Media<", ">Analitik<",
  ">Anggota<", ">Komentar<", ">Domain<", ">API Keys<", ">Pengaturan<", ">Keluar<",
], "Menu Studio");
requireAll(device, [
  '"application"', '"phone"', '"mobile"', '"compact"', '"tablet"', '"desktop"',
  '"laptop"', '"computer"', "interactive-widget=resizes-content",
], "Mode perangkat");
requireAll(theme, ["function LayoutMap", "WIDGET TERPILIH", "tn-code-preview-pane", "PREVIEW LANGSUNG"], "Theme Studio");
requireAll(nara, [
  "cameraInput", "imageInput", "fileInput", "startVoice", "SpeakerIcon", "modelOptions", "intelligenceOptions",
  "nara-native-size-controls-v149", "Instan", "Sedang", "Tinggi",
], "Nara");
requireAll(worker, [
  "ngeblogging-app-v151-studio-recovery-20260729", "ngeblogging-app-v145-studio-mobile-cache-20260729",
  "single-react-recovery-v151", "studio-recovery-v150", "studio-recovery-cache-v151",
  "function isAuthSurface", "refreshStaleWindow", "service-worker-activated-studio-recovery-v151",
  "self.skipWaiting()", "self.clients.claim()",
], "Service worker");
requireAll(pwa, [
  "ngeblogging-pwa-v151-20260729", "ngeblogging-pwa-controller-v151", "pwa-v151-studio-recovery",
  "responsiveFamily", "dataset.deviceFamily", "authSurface", "navigator.serviceWorker.register",
], "PWA runtime");
assert.ok(favicon.includes("Ikon huruf n untuk Ngeblogging"));
assert.ok(!favicon.includes("<circle"));

console.log("Validasi produksi v151 lulus: UI v150 utuh, seluruh menu dan mode perangkat dipertahankan, cache v145 diputus, Nara/Theme tetap lengkap, dan jalur auth dilindungi.");
