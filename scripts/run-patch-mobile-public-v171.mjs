import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTHORITY = "mobile-public-v171-20260730";
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch v171 gagal: ${label} tidak ditemukan.`);
  return source.replace(search, replacement);
}

function v256WidgetModelActive() {
  const widgets = read("src/widget-system.js");
  return widgets.includes("SIDEBAR_LEFT_SLOTS")
    && widgets.includes('"sidebar-left-4"')
    && widgets.includes('"sidebar-right-4"')
    && read("src/theme-system.js").includes("composeMainWidgetLayout")
    && read("src/Studio.jsx").includes('import "./studio-theme-layout-v256.css"');
}

function patchWidgets() {
  if (v256WidgetModelActive()) return;
  const file = "src/widget-system.js";
  let source = read(file);
  if (source.includes(`WIDGET_LAYOUT_EXTENSION_V171 = "${AUTHORITY}"`)) return;
  source = replaceRequired(
    source,
    'export const WIDGET_LAYOUT_AUTHORITY = "theme-layout-v170-20260730";',
    'export const WIDGET_LAYOUT_AUTHORITY = "theme-layout-v170-20260730";\nexport const WIDGET_LAYOUT_EXTENSION_V171 = "mobile-public-v171-20260730";',
    "authority widget v170",
  );
  source = replaceRequired(
    source,
    "export const LAYOUT_AREAS = [\n",
    `export const LAYOUT_AREAS = [
  { id: "header-primary-left", label: "Header utama kiri", group: "header" },
  { id: "header-primary-right", label: "Header utama kanan", group: "header" },
  { id: "footer-copyright-left", label: "Footer dan copyright kiri", group: "copyright" },
  { id: "footer-copyright-right", label: "Footer dan copyright kanan", group: "copyright" },
`,
    "daftar area v170",
  );
  write(file, source);
}

function patchGlobalStyles() {
  const file = "src/main.jsx";
  let source = read(file);
  if (source.includes('import "./mobile-public-v171.css";')) return;
  source = replaceRequired(
    source,
    'import "./styles.css";',
    'import "./styles.css";\nimport "./mobile-public-v171.css";\nimport "./theme-map-extension-v171.css";',
    "import styles utama",
  );
  write(file, source);
}

function patchStudioAuthority() {
  const file = "src/StudioNext.jsx";
  let source = read(file);
  if (source.includes(`data-mobile-layout-authority="${AUTHORITY}"`)) return;
  source = replaceRequired(
    source,
    '<div className="sn-shell"',
    `<div className="sn-shell" data-mobile-layout-authority="${AUTHORITY}"`,
    "root Studio",
  );
  write(file, source);
}

function patchNaraNonModal() {
  const file = "src/NaraAssistant.jsx";
  let source = read(file);
  if (source.includes("data-nara-layer-size={size}")) return;
  source = replaceRequired(
    source,
    '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">',
    '<div className="nara-assistant-layer" data-nara-layer-size={size} role="dialog" aria-modal={size === "full"} aria-label="Nara AI Assistant">',
    "layer Nara",
  );
  write(file, source);
}

function patchRuntimeContentOnly() {
  const file = "src/theme-layout-runtime-v170.js";
  let source = read(file);
  if (source.includes(".ng-content-grid-v170.content-only{")) return;
  source = replaceRequired(
    source,
    ".ng-content-grid-v170{display:grid;grid-template-columns:minmax(0,1fr);align-items:start;gap:20px;width:100%;min-width:0}",
    ".ng-content-grid-v170{display:grid;grid-template-columns:minmax(0,1fr);align-items:start;gap:20px;width:100%;min-width:0}\n.ng-content-grid-v170.content-only{grid-template-columns:minmax(0,1fr)}",
    "selector grid content-only",
  );
  write(file, source);
}

function patchServiceWorker() {
  const file = "public/sw.js";
  let source = read(file);
  if (source.includes('const VERSION = "ngeblogging-app-v171-mobile-public-20260730";')) return;
  source = replaceRequired(
    source,
    'const VERSION = "ngeblogging-app-v170-theme-layout-20260730";',
    'const VERSION = "ngeblogging-app-v171-mobile-public-20260730";\nconst THEME_LAYOUT_COMPAT_VERSION = "ngeblogging-app-v170-theme-layout-20260730";',
    "versi service worker v170",
  );
  source = replaceRequired(
    source,
    'const CACHE_RELEASE = "theme-layout-cache-v170";',
    'const CACHE_RELEASE = "mobile-public-cache-v171";\nconst THEME_LAYOUT_COMPAT_RELEASE = "theme-layout-cache-v170";',
    "cache v170",
  );
  source = replaceRequired(
    source,
    'const FORCE_REFRESH_VALUE = "theme-layout-v170";',
    'const FORCE_REFRESH_VALUE = "mobile-public-v171";\nconst THEME_LAYOUT_COMPAT_FORCE_REFRESH = "theme-layout-v170";',
    "force refresh v170",
  );
  source = source.replaceAll("NGE_BLOGGING_FORCE_RELOAD_V170", "NGE_BLOGGING_FORCE_RELOAD_V171");
  source = source.replaceAll("service-worker-stale-shell-v170", "service-worker-stale-shell-v171");
  source = source.replaceAll("service-worker-activated-theme-layout-v170", "service-worker-activated-mobile-public-v171");
  source = replaceRequired(
    source,
    '    themeLayoutRelease: "theme-layout-v170-20260730",',
    '    themeLayoutRelease: "theme-layout-v170-20260730",\n    mobilePublicRelease: "mobile-public-v171-20260730",\n    themeLayoutCompatVersion: THEME_LAYOUT_COMPAT_VERSION,\n    themeLayoutCompatRelease: THEME_LAYOUT_COMPAT_RELEASE,\n    themeLayoutCompatForceRefresh: THEME_LAYOUT_COMPAT_FORCE_REFRESH,\n    compatibilityMarkers: ["NGE_BLOGGING_FORCE_RELOAD_V170", "service-worker-stale-shell-v170", "service-worker-activated-theme-layout-v170"],',
    "metadata release v170",
  );
  write(file, source);
}

function verifyComplete() {
  const checks = [
    ["src/main.jsx", 'import "./mobile-public-v171.css";'],
    ["src/main.jsx", 'import "./theme-map-extension-v171.css";'],
    ["src/StudioNext.jsx", `data-mobile-layout-authority="${AUTHORITY}"`],
    ["src/NaraAssistant.jsx", "data-nara-layer-size={size}"],
    ["src/theme-layout-runtime-v170.js", ".ng-content-grid-v170.content-only{"],
    ["public/sw.js", 'ngeblogging-app-v171-mobile-public-20260730'],
    ["public/sw.js", 'mobile-public-cache-v171'],
  ];
  if (v256WidgetModelActive()) {
    checks.push(
      ["src/widget-system.js", '"sidebar-left-4"'],
      ["src/widget-system.js", '"sidebar-right-4"'],
      ["src/theme-system.js", "composeMainWidgetLayout"],
    );
  } else {
    checks.push(
      ["src/widget-system.js", `WIDGET_LAYOUT_EXTENSION_V171 = "${AUTHORITY}"`],
      ["src/widget-system.js", 'id: "header-primary-left"'],
      ["src/widget-system.js", 'id: "header-primary-right"'],
      ["src/widget-system.js", 'id: "footer-copyright-left"'],
      ["src/widget-system.js", 'id: "footer-copyright-right"'],
    );
  }
  const missing = checks.filter(([file, marker]) => !read(file).includes(marker));
  if (missing.length) throw new Error(`Patch v171 tidak lengkap: ${missing.map(([file, marker]) => `${file}:${marker}`).join(", ")}`);
}

patchWidgets();
patchGlobalStyles();
patchStudioAuthority();
patchNaraNonModal();
patchRuntimeContentOnly();
patchServiceWorker();
verifyComplete();
console.log(`[${AUTHORITY}] patch applied exactly once and verified${v256WidgetModelActive() ? " with v256 widget-layout compatibility" : ""}`);