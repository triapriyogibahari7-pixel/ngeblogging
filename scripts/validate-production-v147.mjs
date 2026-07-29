import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const containsAll = (source, markers, label) => {
  for (const marker of markers) assert.ok(source.includes(marker), `${label} kehilangan marker: ${marker}`);
};

const [
  pkgSource,
  productionSource,
  studioEntry,
  studioNext,
  deviceRuntime,
  interfaceCss,
  shellController,
  naraRuntime,
  serviceWorker,
  pwaRuntime,
  authCallback,
  authBootstrap,
  favicon,
] = await Promise.all([
  read("package.json"),
  read("wrangler.production.jsonc"),
  read("src/Studio.jsx"),
  read("src/StudioNext.jsx"),
  read("src/studio-device-mode-v140.js"),
  read("src/studio-interface-authority-v147.css"),
  read("src/studio-shell-controller-v147.js"),
  read("src/nara-size-authority-v144.js"),
  read("public/sw.js"),
  read("src/pwa-runtime.js"),
  read("src/auth-callback-authority-v107.js"),
  read("src/auth-studio-bootstrap-v106.js"),
  read("public/favicon.svg"),
]);

const pkg = JSON.parse(pkgSource);
const production = JSON.parse(productionSource);
assert.ok(pkg.scripts.build.includes("npm run test:production"));
assert.ok(pkg.scripts.build.includes("vite build"));
assert.equal(production.vars.APP_RELEASE, "2026.07.29-studio-interface-v147");
assert.equal(production.vars.UI_AUTHORITY_RELEASE, "2026.07.29-studio-interface-v147");
assert.equal(production.assets.directory, "./dist/");
assert.equal(production.assets.run_worker_first, true);

containsAll(studioEntry, [
  "studio-device-mode-v140.js",
  "nara-size-authority-v144.js",
  "studio-shell-controller-v147.js",
  "studio-interface-authority-v147.css",
], "Studio entry");
assert.ok(studioEntry.lastIndexOf("studio-interface-authority-v147.css") > studioEntry.lastIndexOf("studio-layout-authority-v145.css"));

containsAll(studioNext, [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
], "Menu Studio");

containsAll(deviceRuntime, [
  "studio-device-mode-v147-20260729",
  "COMPACT_MAX = 760",
  "TABLET_MAX = 1180",
  "PHONE_MAX = 430",
  "HANDHELD_MAX = 600",
  '"application"', '"phone"', '"mobile"', '"compact"', '"tablet"', '"desktop"',
  '"laptop"', '"computer"',
  "interactive-widget=resizes-content",
], "Mode perangkat v147");
for (const forbidden of ["clearLegacyInlineLayout", "setForcedDrawer", "forcedBackdrop"]) assert.ok(!deviceRuntime.includes(forbidden));

containsAll(interfaceCss, [
  "--sn-v147-sidebar-open:268px",
  "--sn-v147-sidebar-closed:80px",
  "width:min(82vw,360px)!important",
  "sn-sidebar-edge-toggle-v147",
  "sn-profile-menu-v147",
  "grid-template-columns:380px 380px!important",
  ".nara-size-controls-v147",
  ".nara-speech-action-v147",
  "overflow-x:clip!important",
], "CSS interface v147");
assert.equal((interfaceCss.match(/{/g) || []).length, (interfaceCss.match(/}/g) || []).length);

containsAll(shellController, [
  "studio-shell-controller-v147-20260729",
  "sn-sidebar-edge-toggle-v147",
  "sn-profile-menu-v147",
  "Profil", "Pengaturan", "Keluar",
], "Controller Studio v147");

containsAll(naraRuntime, [
  "nara-interface-authority-v147-20260729",
  "Kecil", "Medium", "Penuh",
  "Instan", "Sedang", "Tinggi",
  "speechSynthesis",
  "nara-speech-action-v147",
], "Nara v147");

containsAll(serviceWorker, [
  "ngeblogging-app-v147-studio-interface-20260729",
  "ngeblogging-app-v145-studio-mobile-cache-20260729",
  "single-react-interface-v147",
  "single-react-mobile-cache-v145",
  "studio-interface-v147",
  "service-worker-stale-shell-v147",
  "service-worker-activated-studio-interface-v147",
  "self.skipWaiting()",
  "self.clients.claim()",
], "Service worker v147");

containsAll(pwaRuntime, [
  "ngeblogging-pwa-v147-20260729",
  "ngeblogging-pwa-v145-20260729",
  "ngeblogging-pwa-controller-v147",
  "pwa-v147-studio-interface",
  "responsiveFamily",
  "dataset.deviceFamily",
  "navigator.serviceWorker.register",
], "PWA v147");

containsAll(authCallback, [
  "directPasswordGrant",
  "/auth/v1/token?grant_type=password",
  "supabase.auth.setSession",
], "Login langsung");
containsAll(authBootstrap, [
  "auth-route-handoff-v143-20260729",
  'path === "/login"',
  'path === "/signup"',
  'path === "/signin"',
], "Handoff login");

assert.ok(favicon.includes("Ikon huruf n untuk Ngeblogging"));
assert.ok(!favicon.includes("<circle"));

console.log("Studio v147 siap diproduksi: cache v145 diputus, mode perangkat selaras, menu lengkap dipertahankan, Nara dan login tervalidasi.");
