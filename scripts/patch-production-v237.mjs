import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const RELEASE = "studio-source-stability-v237-20260803";
const HOTFIX_RELEASE = "studio-desktop-sidebar-v238-20260803";

const [entry, runtime, ui, css, css238, device, studio, operations, analytics, themes, widgets, nara, auth, vite, swLib, swLib238, release, release238] = await Promise.all([
  read("src/Studio.jsx"),
  read("src/studio-source-stability-v237.js"),
  read("src/studio-source-stability-v237-ui.js"),
  read("src/studio-source-stability-v237.css"),
  read("src/studio-desktop-sidebar-v238.css"),
  read("src/studio-device-mode-v140.js"),
  read("src/StudioNext.jsx"),
  read("src/studio-operations-v41.js"),
  read("src/studio-analytics-v41.js"),
  read("src/theme-catalog.js"),
  read("src/widget-system.js"),
  read("src/NaraAssistant.jsx"),
  read("src/lib/supabase.js"),
  read("vite.config.js"),
  read("scripts/service-worker-v237-lib.mjs"),
  read("scripts/service-worker-v238-lib.mjs"),
  read("public/release-v237.json"),
  read("public/release-v238.json"),
]);

const required = [
  [entry, 'import "./studio-real-device-v236.js"'],
  [entry, 'import "./studio-source-stability-v237.js"'],
  [entry, 'import "./studio-source-stability-v237-ui.js"'],
  [entry, 'import "./studio-desktop-sidebar-v238.css"'],
  [runtime, RELEASE],
  [runtime, HOTFIX_RELEASE],
  [runtime, 'import "./studio-operations-v41.js"'],
  [runtime, "physicalMetrics"],
  [runtime, "desktopSitePhone"],
  [runtime, "single-internal-n-toggle"],
  [runtime, "camera-photo-file"],
  [runtime, "v235-nara-attachment-portal"],
  [runtime, "code-left-preview-right"],
  [runtime, "preview-top-code-bottom"],
  [ui, "v237RenderedSettings"],
  [ui, "moved-to-profile-menu"],
  [ui, "+ Tambahkan situs"],
  [ui, "internal-limit"],
  [css, 'data-v237-family="small"'],
  [css, "data-v237-domain-action"],
  [css, ".bc-center[data-v237-backup]"],
  [css, ".tn-widget-summary"],
  [css, ".tn-code-workspace"],
  [css238, 'data-v238-family="large"'],
  [css238, 'data-v238-family="small"'],
  [css238, "v238-internal-n"],
  [css238, ".sv124-free-domain>aside"],
  [css238, "#ngeblogging-layout-map"],
  [css238, ".tn-code-workspace"],
  [device, "desktopSitePhoneSignal"],
  [device, 'if (desktopSitePhone) return "desktop"'],
  [device, 'if (handheld) return "tablet"'],
  [operations, "Tambah situs"],
  [operations, "loadAnalytics"],
  [analytics, "get_site_analytics_dashboard"],
  [analytics, "SIMULASI TAMPILAN — BUKAN DATA PRODUKSI"],
  [analytics, "op41-line-v213"],
  [themes, "FAMILIES.flatMap"],
  [widgets, 'id: "custom-html"'],
  [nara, "Camera"],
  [nara, "Image as ImageIcon"],
  [nara, "intelligenceOptions"],
  [nara, "modelOptions"],
  [auth, "persistSession: true"],
  [auth, "autoRefreshToken: true"],
  [vite, "finalizeServiceWorkerV237"],
  [vite, "finalizeServiceWorkerV238"],
  [swLib, "source-stability-cache-v237"],
  [swLib, "V237_FINALIZE_AUTH_SURFACE_GUARD_MISSING"],
  [swLib238, "desktop-sidebar-cache-v238"],
  [swLib238, "V238_FINALIZE_AUTH_SURFACE_GUARD_MISSING"],
  [release, RELEASE],
  [release238, HOTFIX_RELEASE],
];
for (const [source, marker] of required) {
  if (!source.includes(marker)) throw new Error(`V237_V238_CONTRACT_MISSING:${marker}`);
}

const v236Index = entry.indexOf('import "./studio-real-device-v236.js"');
const v237Index = entry.indexOf('import "./studio-source-stability-v237.js"');
const uiIndex = entry.indexOf('import "./studio-source-stability-v237-ui.js"');
const v238CssIndex = entry.indexOf('import "./studio-desktop-sidebar-v238.css"');
if (!(v236Index >= 0 && v237Index > v236Index && uiIndex > v237Index && v238CssIndex > uiIndex)) throw new Error("V237_V238_AUTHORITY_ORDER_INVALID");

const familyCount = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
const compositionCount = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
const widgetCount = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
if (familyCount !== 20 || compositionCount !== 5 || widgetCount !== 26) {
  throw new Error(`V237_THEME_WIDGET_COUNT_INVALID:${familyCount}x${compositionCount}:${widgetCount}`);
}

for (const label of ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"]) {
  if (!studio.includes(label)) throw new Error(`V237_MENU_MISSING:${label}`);
}

for (const source of [runtime, ui, swLib, swLib238, device, css238]) {
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V237_V238_DESTRUCTIVE_SESSION_ACTION");
}

console.log(`Verified ${RELEASE} without mutating historical React or service-worker sources before tests.`);
console.log(`Verified ${HOTFIX_RELEASE}: desktop-site large family, single internal n, bounded Domain/Theme/Settings and non-destructive session behavior.`);