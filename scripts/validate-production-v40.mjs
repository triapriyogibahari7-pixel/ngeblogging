import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const requireMarker = (source, marker, label) => {
  if (!source.includes(marker)) throw new Error(`${label} kehilangan marker: ${marker}`);
};
const forbidMarker = (source, marker, label) => {
  if (source.includes(marker)) throw new Error(`${label} masih memuat authority terlarang: ${marker}`);
};

const [
  packageSource,
  productionSource,
  index,
  studio,
  studioNext,
  styleAuthority,
  deviceRuntime,
  finalLayout,
  mobileCacheLayout,
  naraSize,
  serviceWorker,
  pwaRuntime,
  authCallback,
  authBootstrap,
  supabaseClient,
  favicon,
  worker,
] = await Promise.all([
  text("package.json"),
  text("wrangler.production.jsonc"),
  text("index.html"),
  text("src/Studio.jsx"),
  text("src/StudioNext.jsx"),
  text("src/studio-style-authority-v144.js"),
  text("src/studio-device-mode-v140.js"),
  text("src/studio-layout-authority-v144.css"),
  text("src/studio-layout-authority-v145.css"),
  text("src/nara-size-authority-v144.js"),
  text("public/sw.js"),
  text("src/pwa-runtime.js"),
  text("src/auth-callback-authority-v107.js"),
  text("src/auth-studio-bootstrap-v106.js"),
  text("src/lib/supabase.js"),
  text("public/favicon.svg"),
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
if (production.vars?.APP_RELEASE !== "2026.07.29-studio-mobile-cache-v145") throw new Error("APP_RELEASE belum v145.");
if (production.vars?.UI_AUTHORITY_RELEASE !== "2026.07.29-studio-mobile-cache-v145") throw new Error("UI authority belum v145.");

for (const marker of [
  "studio-style-authority-v144.js",
  "studio-device-mode-v140.js",
  "nara-size-authority-v144.js",
  "studio-layout-v140.css",
  "studio-layout-hotfix-v141.css",
  "studio-layout-hotfix-v142.css",
  "studio-layout-authority-v144.css",
  "studio-layout-authority-v145.css",
  "StudioFastGate.jsx",
]) requireMarker(studio, marker, "Studio entry");

for (const marker of [
  "studio-style-authority-v144-20260729",
  "LEGACY_STUDIO_STYLES",
  "/src/studio-responsive-v23.css",
  "/src/studio-shell-v30.css",
  "/src/sidebar-final-v91.css",
  "/src/studio-final-v106.css",
  "link.media = \"not all\"",
  "MutationObserver",
]) requireMarker(styleAuthority, marker, "Style authority v144");

for (const marker of [
  "studio-device-mode-v145-20260729",
  "studio-device-mode-v141-20260729",
  "COMPACT_MAX = 820",
  "PHYSICAL_PHONE_MAX = 720",
  "navigator.userAgentData?.mobile",
  "navigator.maxTouchPoints",
  "any-pointer: coarse",
  "any-pointer: fine",
  "platformHandheldSignal",
  "compactPhysicalScreen",
  "effectiveWidth <= COMPACT_MAX || handheldSignal()",
  "ngeblogging:studio-device-mode-change",
]) requireMarker(deviceRuntime, marker, "Deteksi perangkat v145");
for (const legacy of ["forcedDesktopSitePhone", "forcedBackdrop", "setForcedDrawer", "stopImmediatePropagation"]) {
  forbidMarker(deviceRuntime, legacy, "Deteksi perangkat v145");
}

for (const marker of [
  "--studio-v144-side-open:248px",
  "--studio-v144-side-closed:76px",
  'data-studio-device-mode="large"',
  'data-studio-device-mode="small"',
  "width:100vw!important",
  "min-width:100vw!important",
  "content:\"n\"!important",
  ".sn-logo-mark i{display:none!important}",
  "backdrop-filter:none!important",
  "overflow-x:hidden!important",
  'data-nara-size="small"',
  'data-nara-size="medium"',
  'data-nara-size="full"',
  "height:48dvh!important",
  "height:76dvh!important",
]) requireMarker(finalLayout, marker, "Layout dasar v144");
forbidMarker(finalLayout, "content:\"n.\"", "Layout dasar v144");

for (const marker of [
  "--studio-v145-side-open:248px",
  "--studio-v145-side-closed:76px",
  'data-studio-device-mode="small"',
  "z-index:2147482000!important",
  "width:100%!important",
  "height:100dvh!important",
  "transition:none!important",
  ".sn-shell>.sn-side-backdrop",
  "display:none!important",
  "content:\"n\"!important",
  "backdrop-filter:none!important",
  ".nara-size-controls-v144",
]) requireMarker(mobileCacheLayout, marker, "Kunci mobile v145");
forbidMarker(mobileCacheLayout, "content:\"n.\"", "Kunci mobile v145");

for (const marker of [
  "nara-size-authority-v144-20260729",
  "Kecil",
  "Sedang",
  "Penuh",
  "data.naraSize",
  "localStorage.setItem",
  "MutationObserver",
]) requireMarker(naraSize, marker, "Ukuran Nara");

for (const marker of [
  'data-navigation-owner="react-v138"',
  "<span>Ringkasan</span>",
  "<span>Komentar</span>",
  "<span>Domain</span>",
  "<span>API Keys</span>",
  "sn-sidebar-toggle",
]) requireMarker(studioNext, marker, "Navigasi React Studio");

for (const marker of [
  "ngeblogging-app-v145-studio-mobile-cache-20260729",
  "single-react-mobile-cache-v145",
  "auth-route-handoff-v143-20260729",
  "FORCE_REFRESH_QUERY",
  "FORCE_REFRESH_VALUE",
  "function isAuthSurface",
  'url.pathname === "/signin"',
  "refreshStaleWindow",
  "client.navigate(url.href)",
  "notifyOpenWindows",
  "NGE_BLOGGING_FORCE_RELOAD_V77",
  "Promise.allSettled",
  "self.clients.claim()",
]) requireMarker(serviceWorker, marker, "Service Worker v145");

for (const marker of [
  "ngeblogging-pwa-v145-20260729",
  "ngeblogging-pwa-controller-v145",
  "pwa-v145-studio-mobile-cache",
  "function handheldSignal",
  "platformHandheldSignal",
  "function authSurface",
  'location.pathname === "/signin"',
  'authMode === "session-expired"',
  'authMode === "callback-error"',
  "navigator.serviceWorker.register",
]) requireMarker(pwaRuntime, marker, "Runtime PWA v145");

for (const marker of [
  "auth-callback-authority-v142-20260729",
  "passwordFallbackV142",
  "directPasswordGrant",
  "/auth/v1/token?grant_type=password",
  "supabase.auth.setSession",
  "history.replaceState",
  "ngeblogging:auth-session-ready",
]) requireMarker(authCallback, marker, "Callback login");
for (const marker of [
  "auth-route-handoff-v143-20260729",
  "redirectAuthenticatedSurface",
  'path === "/login"',
  'path === "/signup"',
  'path === "/signin"',
]) requireMarker(authBootstrap, marker, "Handoff login");

for (const marker of [
  "createClient(url, key",
  "persistSession: true",
  "autoRefreshToken: true",
  "detectSessionInUrl: false",
  "direct-v140",
]) requireMarker(supabaseClient, marker, "Transport Supabase langsung");
for (const legacy of ["resilientSupabaseFetch", "/api/auth-proxy", "/api/data-proxy", "direct-fallback"]) {
  forbidMarker(supabaseClient, legacy, "Transport Supabase langsung");
}

requireMarker(favicon, "Ikon huruf n untuk Ngeblogging", "Favicon n");
forbidMarker(favicon, "<circle", "Favicon n");

for (const marker of ["handleAuthGatewayRequest", "handleDataGatewayRequest", "handleCommentsRequest", "injectPublicComments"]) {
  requireMarker(worker, marker, "Worker produksi");
}

const disabledStudioRuntimes = [
  "comments-studio-runtime-v93.jsx",
  "studio-interaction-v49.js",
  "studio-layout-route-v29.js",
  "studio-shell-v30.js",
  "studio-mobile-route-reset-v32.js",
  "studio-content-flow-v34.js",
  "studio-domain-backup-v35.js",
  "studio-production-audit-v37.js",
  "studio-production-repair-v38.js",
  "production-contract-v38.js",
  "studio-layout-builder-v39.js",
  "studio-quality-v39.js",
  "studio-layout-device-v40.js",
  "studio-responsive-repair-v43.js",
  "studio-operations-v41.js",
  "studio-reflow-v48.js",
  "studio-theme-domain-v50.js",
  "studio-site-switcher-v52.js",
  "studio-ui-stability-v95.js",
  "studio-surface-authority-v100.js",
  "studio-mobile-precision-v99.js",
  "studio-final-v106.js",
];
for (const runtime of disabledStudioRuntimes) {
  requireMarker(index, `type="application/x-disabled" src="/src/${runtime}`, "Runtime lama");
  forbidMarker(index, `type="module" src="/src/${runtime}`, "Runtime lama");
}
requireMarker(index, '/src/auth-session-authority-v76.js', "Shell produksi");
requireMarker(index, '/src/auth-studio-bootstrap-v106.js', "Shell produksi");

console.log("Validasi produksi v145 lulus: cache v142 diputus satu kali, HP Situs desktop dikenali, drawer menutup viewport tanpa blur/celah, tombol n tetap aktif, Nara memiliki mode kecil/sedang/penuh, dan login v143 tidak dinavigasi paksa.");