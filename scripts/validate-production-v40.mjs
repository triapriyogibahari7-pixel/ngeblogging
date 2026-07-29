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
  pwaRuntime,
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
  text("src/studio-device-mode-v140.js"),
  text("src/studio-device-mode-v138.js"),
  text("src/studio-layout-v140.css"),
  text("src/pwa-runtime-v140.js"),
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
if (production.vars?.APP_RELEASE !== "2026.07.29-studio-sidebar-auth-v140") throw new Error("APP_RELEASE belum v140.");
if (production.vars?.UI_AUTHORITY_RELEASE !== "2026.07.29-studio-sidebar-auth-v140") throw new Error("UI authority belum v140.");

for (const marker of ["studio-device-mode-v140.js", "studio-layout-v140.css", "StudioFastGate.jsx"]) {
  requireMarker(studio, marker, "Studio entry");
}
forbidMarker(studio, "studio-device-mode-v139.js", "Studio entry");
forbidMarker(studio, "studio-device-modes-v138.css", "Studio entry");
requireMarker(compatibilityRuntime, "studio-device-mode-v140.js", "Compatibility runtime v138");

for (const marker of [
  "HANDHELD_MAX = 820",
  "COMPACT_MAX = 760",
  "physicalHandheld",
  "navigator.maxTouchPoints > 1",
  "pointer: coarse",
  "MutationObserver",
  "ngeblogging:studio-device-mode-change",
  "react-only-v140",
]) requireMarker(deviceRuntime, marker, "Device authority v140");
forbidMarker(deviceRuntime, "forcedDesktopSitePhone", "Device authority v140");
forbidMarker(deviceRuntime, "stopImmediatePropagation", "Device authority v140");

for (const marker of [
  '@import "./studio-layout-v139.css"',
  'data-studio-device-mode="small"',
  'data-studio-device-mode="large"',
  ".sn-sidebar-toggle::before",
  'content:"n."!important',
  "overflow-x:hidden!important",
  "backdrop-filter:none!important",
  ".sn-v139-forced-backdrop",
]) requireMarker(layout, marker, "Layout authority v140");

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
  "ngeblogging-pwa-v140-20260729",
  "pwa-v140-sidebar-auth",
  "navigator.serviceWorker.register",
  "controllerchange",
  "sensitiveAuthCallback",
]) requireMarker(pwaRuntime, marker, "Runtime PWA v140");

for (const marker of [
  "ngeblogging-app-v140-sidebar-auth-20260729",
  "single-react-layout-and-auth-v140",
  "Promise.allSettled",
  "self.clients.claim()",
  "notifyOpenWindows",
]) requireMarker(serviceWorker, marker, "Service Worker v140");
forbidMarker(serviceWorker, "client.navigate(url.href)", "Service Worker v140");

for (const marker of [
  "auth-callback-authority-v140-20260729",
  "passwordFallbackV140",
  "directPasswordGrant",
  "/auth/v1/token?grant_type=password",
  "supabase.auth.setSession",
  "history.replaceState",
  "ngeblogging:auth-session-ready",
]) requireMarker(authCallback, marker, "Pemulihan login v140");

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

for (const marker of [
  '/src/pwa-runtime-v140.js',
  '/src/auth-session-authority-v76.js',
  '/src/auth-studio-bootstrap-v106.js',
  '/src/main.jsx',
]) requireMarker(index, marker, "Shell produksi");
for (const legacy of [
  "studio-interaction-v49.js",
  "studio-shell-v30.js",
  "studio-mobile-route-reset-v32.js",
  "studio-content-flow-v34.js",
  "studio-production-repair-v38.js",
  "studio-layout-builder-v39.js",
  "studio-responsive-repair-v43.js",
  "studio-reflow-v48.js",
  "studio-ui-stability-v95.js",
  "studio-surface-authority-v100.js",
  "studio-mobile-precision-v99.js",
  "studio-final-v106.js",
]) forbidMarker(index, `type="module" src="/src/${legacy}`, "Shell produksi");

console.log("Validasi produksi v140 lulus: satu authority React, ikon n. stabil, tanpa overflow/blur, cache baru, dan login tanpa callback ganda.");
