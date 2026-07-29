import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const requireMarker = (source, marker, label) => {
  if (!source.includes(marker)) throw new Error(`${label} kehilangan marker: ${marker}`);
};
const forbidMarker = (source, marker, label) => {
  if (source.includes(marker)) throw new Error(`${label} masih memuat authority lama: ${marker}`);
};

const [
  packageSource,
  productionSource,
  index,
  studio,
  studioNext,
  deviceRuntime,
  compatibilityRuntime,
  layout,
  serviceWorker,
  authCallback,
  supabaseClient,
  worker,
] = await Promise.all([
  text("package.json"),
  text("wrangler.production.jsonc"),
  text("index.html"),
  text("src/Studio.jsx"),
  text("src/StudioNext.jsx"),
  text("src/studio-device-mode-v139.js"),
  text("src/studio-device-mode-v138.js"),
  text("src/studio-layout-v139.css"),
  text("public/sw.js"),
  text("src/auth-callback-authority-v107.js"),
  text("src/lib/supabase.js"),
  text("cloudflare/worker-v67.mjs"),
]);

const pkg = JSON.parse(packageSource);
const production = JSON.parse(productionSource);

if (pkg.scripts?.test !== "node --test tests/*.test.mjs") throw new Error("Test runner produksi berubah tanpa validasi.");
requireMarker(pkg.scripts?.build || "", "vite build", "Build produksi");
requireMarker(pkg.scripts?.["deploy:cloudflare"] || "", "wrangler deploy", "Deploy Cloudflare");

if (production.main !== "./cloudflare/worker-v67.mjs") throw new Error("Worker produksi bukan worker-v67.");
if (production.assets?.directory !== "./dist/" || production.assets?.run_worker_first !== true) {
  throw new Error("Binding aset produksi tidak menggunakan dist dan worker-first.");
}
const routes = new Set((production.routes || []).map((route) => route.pattern));
for (const route of ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"]) {
  if (!routes.has(route)) throw new Error(`Route produksi hilang: ${route}`);
}
if (production.vars?.APP_RELEASE !== "2026.07.29-studio-sidebar-auth-v139") throw new Error("APP_RELEASE belum v139.");
if (production.vars?.UI_AUTHORITY_RELEASE !== "2026.07.29-studio-sidebar-auth-v139") throw new Error("UI authority belum v139.");

for (const marker of ["studio-device-mode-v139.js", "studio-layout-v139.css", "StudioFastGate.jsx"]) {
  requireMarker(studio, marker, "Studio entry");
}
forbidMarker(studio, "studio-device-modes-v138.css", "Studio entry");
requireMarker(compatibilityRuntime, "studio-device-mode-v139.js", "Compatibility runtime v138");

for (const marker of [
  "HANDHELD_MAX = 820",
  "COMPACT_MAX = 760",
  "forcedDesktopSitePhone",
  "sn-sidebar-toggle",
  "sn-side-close",
  "sn-v139-forced-backdrop",
  "MutationObserver",
  "ngeblogging:studio-device-mode-change",
]) requireMarker(deviceRuntime, marker, "Device authority v139");

for (const marker of [
  "--studio-side-open:232px",
  "--studio-side-closed:76px",
  "--studio-drawer:min(88vw,340px)",
  'data-studio-device-mode="small"',
  'data-studio-device-mode="large"',
  'data-v139-forced-mobile-open="true"',
  "overflow-x:hidden!important",
  "backdrop-filter:none!important",
  ".sn-mobile-nav,.sn-mobile-sheet-layer{display:none!important}",
]) requireMarker(layout, marker, "Layout authority v139");

for (const marker of [
  'data-navigation-owner="react-v138"',
  "<span>Ringkasan</span>",
  "<span>Komentar</span>",
  "<span>Domain</span>",
  "<span>API Keys</span>",
  "sn-mobile-menu-mark",
  "<strong>n</strong><i>.</i>",
]) requireMarker(studioNext, marker, "Navigasi React Studio");

for (const marker of [
  "ngeblogging-app-v139-sidebar-auth-20260729",
  "locked-device-layout-and-auth-v139",
  "pwa-v139-sidebar-auth",
  "Promise.allSettled",
  "self.clients.claim()",
  "client.navigate(url.href)",
]) requireMarker(serviceWorker, marker, "Service Worker v139");

for (const marker of [
  "auth-callback-authority-v139-20260729",
  "passwordFallbackV139",
  "directPasswordGrant",
  "/auth/v1/token?grant_type=password",
  "supabase.auth.setSession",
  "installPasswordFallback()",
]) requireMarker(authCallback, marker, "Pemulihan login v139");

for (const marker of [
  "resilientSupabaseFetch",
  "/api/auth-proxy",
  "/api/data-proxy",
  "direct-fallback",
  "persistSession: true",
  "autoRefreshToken: true",
]) requireMarker(supabaseClient, marker, "Transport Supabase");

for (const marker of [
  "handleAuthGatewayRequest",
  "handleDataGatewayRequest",
  "handleCommentsRequest",
  "injectPublicComments",
]) requireMarker(worker, marker, "Worker produksi");

requireMarker(index, 'type="application/x-disabled" src="/src/sidebar-final-v91.js', "Shell produksi");
requireMarker(index, '/src/auth-session-authority-v76.js', "Shell produksi");
requireMarker(index, '/src/auth-studio-bootstrap-v106.js', "Shell produksi");

console.log("Validasi produksi v139 lulus: sidebar lintas perangkat, layout tanpa overflow, cache baru, dan fallback login aktif.");
