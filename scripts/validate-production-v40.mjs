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
  layoutHotfix,
  serviceWorker,
  pwaRuntime,
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
  text("src/studio-layout-hotfix-v141.css"),
  text("public/sw.js"),
  text("src/pwa-runtime.js"),
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
if (production.vars?.APP_RELEASE !== "2026.07.29-studio-handheld-auth-v141") throw new Error("APP_RELEASE belum v141.");
if (production.vars?.UI_AUTHORITY_RELEASE !== "2026.07.29-studio-handheld-auth-v141") throw new Error("UI authority belum v141.");

for (const marker of [
  "studio-device-mode-v140.js",
  "studio-layout-v140.css",
  "studio-layout-hotfix-v141.css",
  "StudioFastGate.jsx",
]) requireMarker(studio, marker, "Studio entry");
forbidMarker(studio, "studio-device-mode-v139.js", "Studio entry");
forbidMarker(studio, "studio-device-modes-v138.css", "Studio entry");
requireMarker(compatibilityRuntime, "studio-device-mode-v140.js", "Compatibility runtime v138");
forbidMarker(compatibilityRuntime, "studio-device-mode-v139.js", "Compatibility runtime v138");

for (const marker of [
  "studio-device-mode-v141-20260729",
  "COMPACT_MAX = 820",
  "navigator.userAgentData?.mobile",
  "navigator.maxTouchPoints",
  "any-pointer: coarse",
  "any-pointer: fine",
  "effectiveWidth <= COMPACT_MAX || handheldSignal()",
  'REACT_NAVIGATION_OWNER = "react-v138"',
  "LAYOUT_NODES",
  "LEGACY_INLINE_PROPERTIES",
  "clearLegacyInlineLayout",
  "MutationObserver",
  "ngeblogging:studio-device-mode-change",
]) requireMarker(deviceRuntime, marker, "Device authority v141");
for (const legacy of ["forcedDesktopSitePhone", "forcedBackdrop", "setForcedDrawer", "stopImmediatePropagation"]) {
  forbidMarker(deviceRuntime, legacy, "Device authority v141");
}

for (const marker of [
  "--studio-side-open:232px",
  "--studio-side-closed:76px",
  "--studio-drawer:min(88vw,340px)",
  'data-studio-device-mode="small"',
  'data-studio-device-mode="large"',
  "sn-mobile-menu-mark",
  "sn-desktop-sidebar-icon",
  "width:calc(100% - var(--studio-side-open))!important",
  "width:calc(100% - var(--studio-side-closed))!important",
  "overflow-x:hidden!important",
  "backdrop-filter:none!important",
]) requireMarker(layout, marker, "Layout authority v140");
forbidMarker(layout, "studio-final-recovery-v136.css", "Layout authority v140");
forbidMarker(layout, "data-v139-forced-mobile-open", "Layout authority v140");

for (const marker of [
  'data-studio-device-mode="small"',
  ".sn-side.collapsed+.sn-main",
  "width:100%!important",
  "background:rgba(10,24,43,.22)!important",
  "backdrop-filter:none!important",
  ".sn-mobile-menu-mark",
  ".sn-desktop-sidebar-icon",
  ".sn-v139-forced-backdrop",
]) requireMarker(layoutHotfix, marker, "Layout hotfix v141");

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
  "ngeblogging-app-v141-studio-mobile-auth-20260729",
  "single-react-layout-handheld-direct-auth-v141",
  "pwa-v141-studio-mobile-auth",
  "function isAuthSurface",
  'url.pathname === "/login"',
  'url.pathname === "/signup"',
  "Promise.allSettled",
  "self.clients.claim()",
  "client.navigate(url.href)",
]) requireMarker(serviceWorker, marker, "Service Worker v141");

for (const marker of [
  "ngeblogging-pwa-v141-20260729",
  "function handheldSignal",
  "navigator.userAgentData?.mobile",
  "navigator.maxTouchPoints",
  'if (handheld || effectiveWidth <= 820) mode = "mobile"',
  "function authSurface",
  "ngeblogging-pwa-controller-v141",
  "pwa-v141-studio-mobile-auth",
  "navigator.serviceWorker.register",
]) requireMarker(pwaRuntime, marker, "Runtime PWA v141");

for (const marker of [
  "auth-callback-authority-v139-20260729",
  "passwordFallbackV139",
  "directPasswordGrant",
  "/auth/v1/token?grant_type=password",
  "supabase.auth.setSession",
  "installPasswordFallback()",
]) requireMarker(authCallback, marker, "Pemulihan login");

for (const marker of [
  "createClient(url, key",
  "persistSession: true",
  "autoRefreshToken: true",
  "detectSessionInUrl: false",
  "ngeblogging-web-v140",
  'supabaseTransport = supabaseConfigured ? "direct-v140"',
  "signInWithPassword",
]) requireMarker(supabaseClient, marker, "Transport Supabase langsung");
for (const legacy of ["resilientSupabaseFetch", "/api/auth-proxy", "/api/data-proxy", "direct-fallback"]) {
  forbidMarker(supabaseClient, legacy, "Transport Supabase langsung");
}

for (const marker of [
  "handleAuthGatewayRequest",
  "handleDataGatewayRequest",
  "handleCommentsRequest",
  "injectPublicComments",
]) requireMarker(worker, marker, "Worker produksi");

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
  requireMarker(index, `type="application/x-disabled" src="/src/${runtime}`, "Shell runtime tunggal v141");
  forbidMarker(index, `type="module" src="/src/${runtime}`, "Shell runtime tunggal v141");
}

requireMarker(index, 'ngeblogging-studio-runtime-authority" content="react-v141"', "Shell produksi");
requireMarker(index, 'type="application/x-disabled" src="/src/sidebar-final-v91.js', "Shell produksi");
requireMarker(index, '/src/auth-session-authority-v76.js', "Shell produksi");
requireMarker(index, '/src/auth-studio-bootstrap-v106.js', "Shell produksi");

console.log("Validasi produksi v141 lulus: satu runtime React, mode handphone terkunci, tombol n. aktif, tanpa blur/overflow putih, cache baru, dan login langsung terlindungi.");
