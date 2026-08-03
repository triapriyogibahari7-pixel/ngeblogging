import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const RELEASE = "studio-source-stability-v237-20260803";

const [entry, runtime, ui, css, studio, operations, analytics, themes, widgets, nara, auth, vite, swLib, release] = await Promise.all([
  read("src/Studio.jsx"),
  read("src/studio-source-stability-v237.js"),
  read("src/studio-source-stability-v237-ui.js"),
  read("src/studio-source-stability-v237.css"),
  read("src/StudioNext.jsx"),
  read("src/studio-operations-v41.js"),
  read("src/studio-analytics-v41.js"),
  read("src/theme-catalog.js"),
  read("src/widget-system.js"),
  read("src/NaraAssistant.jsx"),
  read("src/lib/supabase.js"),
  read("vite.config.js"),
  read("scripts/service-worker-v237-lib.mjs"),
  read("public/release-v237.json"),
]);

const required = [
  [entry, 'import "./studio-real-device-v236.js"'],
  [entry, 'import "./studio-source-stability-v237.js"'],
  [entry, 'import "./studio-source-stability-v237-ui.js"'],
  [runtime, RELEASE],
  [runtime, 'import "./studio-operations-v41.js"'],
  [runtime, "physicalMetrics"],
  [runtime, "camera-photo-file"],
  [runtime, "v235-nara-attachment-portal"],
  [ui, "v237RenderedSettings"],
  [ui, "moved-to-profile-menu"],
  [ui, "+ Tambahkan situs"],
  [ui, "internal-limit"],
  [css, 'data-v237-family="small"'],
  [css, "data-v237-domain-action"],
  [css, ".bc-center[data-v237-backup]"],
  [css, ".tn-widget-summary"],
  [css, "code-left-preview-right"],
  [css, "preview-top-code-bottom"],
  [operations, "Tambah situs"],
  [operations, "loadAnalytics"],
  [analytics, "get_site_analytics_dashboard"],
  [analytics, "SIMULASI TAMPILAN — BUKAN DATA PRODUKSI"],
  [analytics, "op41-line-v213"],
  [themes, "FAMILIES.flatMap"],
  [widgets, 'id: "custom-html"'],
  [nara, "<Camera />"],
  [nara, "<ImageIcon />"],
  [nara, "intelligenceOptions"],
  [nara, "modelOptions"],
  [auth, "persistSession: true"],
  [auth, "autoRefreshToken: true"],
  [vite, "finalizeServiceWorkerV237"],
  [swLib, "source-stability-cache-v237"],
  [swLib, "V237_FINALIZE_AUTH_SURFACE_GUARD_MISSING"],
  [release, RELEASE],
];
for (const [source, marker] of required) {
  if (!source.includes(marker)) throw new Error(`V237_CONTRACT_MISSING:${marker}`);
}

const v236Index = entry.indexOf('import "./studio-real-device-v236.js"');
const v237Index = entry.indexOf('import "./studio-source-stability-v237.js"');
const uiIndex = entry.indexOf('import "./studio-source-stability-v237-ui.js"');
if (!(v236Index >= 0 && v237Index > v236Index && uiIndex > v237Index)) throw new Error("V237_AUTHORITY_ORDER_INVALID");

const familyCount = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
const compositionCount = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
const widgetCount = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
if (familyCount !== 20 || compositionCount !== 5 || widgetCount !== 26) {
  throw new Error(`V237_THEME_WIDGET_COUNT_INVALID:${familyCount}x${compositionCount}:${widgetCount}`);
}

for (const label of ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"]) {
  if (!studio.includes(label)) throw new Error(`V237_MENU_MISSING:${label}`);
}

for (const source of [runtime, ui, swLib]) {
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V237_DESTRUCTIVE_SESSION_ACTION");
}

console.log(`Verified ${RELEASE} without mutating historical React or service-worker sources before tests.`);
