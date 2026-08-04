import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const write = (file, content) => writeFileSync(path.join(root, file), content);

const checks = [
  ["src/widget-system.js", 'WIDGET_LAYOUT_AUTHORITY = "theme-layout-v170-20260730"'],
  ["src/theme-system.js", "composeThemeLayoutV170"],
  ["src/theme-system.js", 'data-theme-layout-authority="theme-layout-v170-20260730"'],
  ["src/ThemeStudio.jsx", 'data-theme-layout-authority="theme-layout-v170-20260730"'],
  ["src/ThemeStudio.jsx", 'import "./theme-layout-v170.css"'],
  ["src/StudioNext.jsx", 'data-page-audit="studio-page-audit-v170-20260730"'],
  ["src/StudioNext.jsx", "ngeblogging:request-install-app"],
  ["src/main.jsx", "logout-landing-v170-20260730"],
  ["src/pwa-runtime.js", "ngeblogging:request-install-app"],
  ["public/sw.js", "ngeblogging-app-v170-theme-layout-20260730"],
];

const supersedingV256Checks = [
  ["src/widget-system.js", "SIDEBAR_LEFT_SLOTS"],
  ["src/widget-system.js", "sidebar-left-4"],
  ["src/widget-system.js", "sidebar-right-4"],
  ["src/theme-system.js", "composeMainWidgetLayout"],
  ["src/theme-system.js", 'widgetsMarkup(widgets, "sidebar-left")'],
  ["src/theme-system.js", 'widgetsMarkup(widgets, "sidebar-right")'],
  ["src/Studio.jsx", 'import "./studio-theme-layout-v256.css"'],
  ["src/studio-theme-layout-v256.css", 'content:"Post / Page\\A Konten utama"'],
];

function inspect(list = checks) {
  return list.map(([file, marker]) => ({ file, marker, present: read(file).includes(marker) }));
}

function prepareV170ServiceWorkerCompatibility() {
  const file = "public/sw.js";
  let source = read(file);
  if (source.includes("ngeblogging-app-v170-theme-layout-20260730")) return;
  if (!source.includes('const VERSION = "ngeblogging-app-v169-first-site-20260730";')) {
    throw new Error("V256_V170_COMPAT_SERVICE_WORKER_BASELINE_MISSING");
  }
  source = source
    .replace('const VERSION = "ngeblogging-app-v169-first-site-20260730";', 'const VERSION = "ngeblogging-app-v170-theme-layout-20260730";\nconst FIRST_SITE_COMPAT_VERSION = "ngeblogging-app-v169-first-site-20260730";')
    .replace('const CACHE_RELEASE = "first-site-cache-v169";', 'const CACHE_RELEASE = "theme-layout-cache-v170";\nconst FIRST_SITE_COMPAT_RELEASE = "first-site-cache-v169";')
    .replace('const FORCE_REFRESH_VALUE = "first-site-v169";', 'const FORCE_REFRESH_VALUE = "theme-layout-v170";')
    .replace('service-worker-stale-shell-v169', 'service-worker-stale-shell-v170')
    .replace('version: VERSION,', 'version: VERSION,\n    firstSiteCompatVersion: FIRST_SITE_COMPAT_VERSION,')
    .replace('release: CACHE_RELEASE,', 'release: CACHE_RELEASE,\n    firstSiteCompatRelease: FIRST_SITE_COMPAT_RELEASE,')
    .replace('sitePolicyRelease: SITE_POLICY_RELEASE,', 'sitePolicyRelease: SITE_POLICY_RELEASE,\n    themeLayoutRelease: "theme-layout-v170-20260730",')
    .replace('NGE_BLOGGING_FORCE_RELOAD_V169', 'NGE_BLOGGING_FORCE_RELOAD_V170')
    .replace('service-worker-activated-first-site-v169', 'service-worker-activated-theme-layout-v170');
  for (const marker of [
    "ngeblogging-app-v170-theme-layout-20260730",
    "theme-layout-cache-v170",
    "theme-layout-v170",
    "theme-layout-v170-20260730",
  ]) {
    if (!source.includes(marker)) throw new Error(`V256_V170_COMPAT_SERVICE_WORKER_MARKER_MISSING:${marker}`);
  }
  write(file, source);
}

const v256 = inspect(supersedingV256Checks);
if (v256.every((entry) => entry.present)) {
  prepareV170ServiceWorkerCompatibility();
  console.log("[theme-layout-v170-20260730] UI/widget source superseded by theme-layout-v256; v170 service-worker baseline preserved for later compatibility patches");
  process.exit(0);
}

const before = inspect();
const presentCount = before.filter((entry) => entry.present).length;

if (presentCount === checks.length) {
  console.log("[theme-layout-v170-20260730] patch already complete; no source mutation required");
  process.exit(0);
}

if (presentCount > 0) {
  const missing = before.filter((entry) => !entry.present).map((entry) => `${entry.file}: ${entry.marker}`);
  throw new Error(`Patch v170 berada pada keadaan parsial. Hentikan untuk mencegah duplikasi. Marker hilang:\n- ${missing.join("\n- ")}`);
}

await import("./patch-theme-layout-v170.mjs");

const after = inspect();
const missingAfterPatch = after.filter((entry) => !entry.present);
if (missingAfterPatch.length) {
  throw new Error(`Patch v170 tidak lengkap setelah dijalankan:\n- ${missingAfterPatch.map((entry) => `${entry.file}: ${entry.marker}`).join("\n- ")}`);
}

console.log("[theme-layout-v170-20260730] patch applied exactly once and verified");