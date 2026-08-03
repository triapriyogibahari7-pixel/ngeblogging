import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const themeStudioSource = read("src/ThemeStudio.jsx");
const nativeV245 = themeStudioSource.includes('data-theme-interface="v245-native"')
  && themeStudioSource.includes('import "./theme-native-v245.css"')
  && themeStudioSource.includes('id: "left-4"')
  && themeStudioSource.includes('id: "right-4"')
  && themeStudioSource.includes('id: "content-main"');

const checks = [
  ["src/widget-system.js", 'WIDGET_LAYOUT_AUTHORITY = "theme-layout-v170-20260730"'],
  ["src/theme-system.js", "composeThemeLayoutV170"],
  ["src/theme-system.js", 'data-theme-layout-authority="theme-layout-v170-20260730"'],
  ["src/ThemeStudio.jsx", nativeV245 ? 'data-theme-interface="v245-native"' : 'data-theme-layout-authority="theme-layout-v170-20260730"'],
  ["src/ThemeStudio.jsx", nativeV245 ? 'import "./theme-native-v245.css"' : 'import "./theme-layout-v170.css"'],
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
  console.log(nativeV245
    ? "[theme-layout-v170-20260730] native Theme Studio v245 supersedes the legacy visual map; no source mutation required"
    : "[theme-layout-v170-20260730] patch already complete; no source mutation required");
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
