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

function inspect() {
  return checks.map(([file, marker]) => ({ file, marker, present: read(file).includes(marker) }));
}

const before = inspect();
const presentCount = before.filter((entry) => entry.present).length;

if (presentCount === checks.length) {
  console.log("[theme-layout-v170-20260730] patch already complete; preserving existing source");
} else if (presentCount > 0) {
  const missing = before.filter((entry) => !entry.present).map((entry) => `${entry.file}: ${entry.marker}`);
  throw new Error(`Patch v170 berada pada keadaan parsial. Hentikan untuk mencegah duplikasi. Marker hilang:\n- ${missing.join("\n- ")}`);
} else {
  await import("./patch-theme-layout-v170.mjs");
  const after = inspect();
  const missingAfterPatch = after.filter((entry) => !entry.present);
  if (missingAfterPatch.length) {
    throw new Error(`Patch v170 tidak lengkap setelah dijalankan:\n- ${missingAfterPatch.map((entry) => `${entry.file}: ${entry.marker}`).join("\n- ")}`);
  }
  console.log("[theme-layout-v170-20260730] patch applied exactly once and verified");
}

await import("./patch-theme-layout-v210.mjs");

const v210Checks = [
  ["src/widget-system.js", 'WIDGET_LAYOUT_V210 = "theme-layout-v210-20260802"'],
  ["src/widget-system.js", 'id: "sidebar-left-4"'],
  ["src/widget-system.js", 'id: "sidebar-right-4"'],
  ["src/ThemeStudio.jsx", 'data-theme-layout-v210="theme-layout-v210-20260802"'],
  ["src/ThemeStudio.jsx", "tn-widget-code-v210"],
  ["src/ThemeStudio.jsx", "widgetAreaV210"],
];
const missingV210 = v210Checks.filter(([file, marker]) => !read(file).includes(marker));
if (missingV210.length) {
  throw new Error(`Patch v210 tidak lengkap:\n- ${missingV210.map(([file, marker]) => `${file}: ${marker}`).join("\n- ")}`);
}
console.log("[theme-layout-v210-20260802] four-left/four-right layout and custom code widgets verified");
