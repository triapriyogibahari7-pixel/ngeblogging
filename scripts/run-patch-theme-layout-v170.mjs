import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

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

const v256 = inspect(supersedingV256Checks);
if (v256.every((entry) => entry.present)) {
  console.log("[theme-layout-v170-20260730] superseded safely by theme-layout-v256; historical patch skipped to preserve the newer real 4+4 widget model");
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