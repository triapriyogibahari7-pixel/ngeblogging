import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v212-20260802";
const VERSION = "ngeblogging-app-v212-large-mode-layout-nara-domain-20260802";
const CACHE = "large-mode-layout-nara-domain-cache-v212";
const FORCE = "studio-v212";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V212_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v212.js";')) {
    source = replaceRequired(
      source,
      'import "./studio-production-v211.js";',
      'import "./studio-production-v211.js";\nimport "./studio-production-v212.js";',
      "studio-v211-import",
    );
    await write(path, source);
  }
}

async function patchFourthRightArea() {
  const widgetPath = "src/widget-system.js";
  let widgets = await read(widgetPath);
  if (!widgets.includes('id: "sidebar-left-4"')) throw new Error("V212_LEFT4_PRECONDITION_MISSING");
  if (!widgets.includes('id: "sidebar-right-4"')) {
    widgets = replaceRequired(
      widgets,
      '  { id: "sidebar-right-3", label: "Sidebar kanan 3", group: "content" },\n  { id: "after-content", label: "Tepat di bawah postingan", group: "content" },',
      '  { id: "sidebar-right-3", label: "Sidebar kanan 3", group: "content" },\n  { id: "sidebar-right-4", label: "Sidebar kanan 4", group: "content" },\n  { id: "after-content", label: "Tepat di bawah postingan", group: "content" },',
      "widget-right4",
    );
    widgets += '\n/* sidebar-right-4-v212: empat area kiri dan empat area kanan adalah area widget nyata. */\n';
    await write(widgetPath, widgets);
  }

  const runtimePath = "src/theme-layout-runtime-v170.js";
  let runtime = await read(runtimePath);
  if (!runtime.includes('"sidebar-right-4"')) {
    runtime = replaceRequired(
      runtime,
      'const RIGHT_AREAS = ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3"];',
      'const RIGHT_AREAS = ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"];',
      "runtime-right4",
    );
    runtime = runtime.replaceAll('"Tiga area widget kanan postingan"', '"Empat area widget kanan postingan"');
    await write(runtimePath, runtime);
  }

  const cssPath = "src/theme-layout-v170.css";
  let css = await read(cssPath);
  if (!css.includes(".tn-layout-slot-v170.sidebar-right-4{grid-area:sidebar-right-4}")) {
    css = replaceRequired(
      css,
      '    "sidebar-left-4 content-main content-main content-main content-main ."\n    "after-content after-content after-content after-content after-content after-content";',
      '    "sidebar-left-4 content-main content-main content-main content-main sidebar-right-4"\n    "after-content after-content after-content after-content after-content after-content";',
      "layout-desktop-right4",
    );
    css = replaceRequired(
      css,
      '.tn-layout-slot-v170.sidebar-right-1{grid-area:sidebar-right-1}.tn-layout-slot-v170.sidebar-right-2{grid-area:sidebar-right-2}.tn-layout-slot-v170.sidebar-right-3{grid-area:sidebar-right-3}',
      '.tn-layout-slot-v170.sidebar-right-1{grid-area:sidebar-right-1}.tn-layout-slot-v170.sidebar-right-2{grid-area:sidebar-right-2}.tn-layout-slot-v170.sidebar-right-3{grid-area:sidebar-right-3}.tn-layout-slot-v170.sidebar-right-4{grid-area:sidebar-right-4}',
      "layout-right4-grid-area",
    );
    css = replaceRequired(
      css,
      '      "sidebar-left-4 sidebar-left-4"\n      "content-main content-main"',
      '      "sidebar-left-4 sidebar-right-4"\n      "content-main content-main"',
      "layout-tablet-right4",
    );
    css = replaceRequired(
      css,
      '      "sidebar-right-1" "sidebar-right-2" "sidebar-right-3" "after-content"',
      '      "sidebar-right-1" "sidebar-right-2" "sidebar-right-3" "sidebar-right-4" "after-content"',
      "layout-phone-right4",
    );
    await write(cssPath, css);
  }

  const studioPath = "src/ThemeStudio.jsx";
  let studio = await read(studioPath);
  const oldLabel = "Peta tata letak 20 area widget + 1 area kiri tambahan, total 21 area";
  const nextLabel = "Peta tata letak 22 area widget, termasuk 4 kiri + 4 kanan postingan";
  if (!studio.includes(nextLabel)) {
    studio = replaceRequired(studio, oldLabel, nextLabel, "theme-layout-area-label");
    await write(studioPath, studio);
  }
}

async function patchThemeCodeDeviceMarker() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  if (!source.includes('data-code-preview-device={device}')) {
    source = replaceRequired(
      source,
      'return <div className="tn-code-workspace">',
      'return <div className="tn-code-workspace" data-code-preview-device={device}>',
      "code-preview-device-marker",
    );
    await write(path, source);
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V212")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_PRODUCTION_RELEASE_V212 = "${RELEASE}";\nconst STUDIO_PRODUCTION_COMPAT_VERSION_V211 = "ngeblogging-app-v211-mobile-theme-nara-domain-20260802";\nconst STUDIO_PRODUCTION_COMPAT_CACHE_V211 = "mobile-theme-nara-domain-cache-v211";\n`,
    );
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V211", "NGE_BLOGGING_UPDATE_AVAILABLE_V212");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v212 announces the update without forced navigation; login/editor state remain intact.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V212_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, studio, widgets, layoutRuntime, layoutCss, runtime, css, nara, sw, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/ThemeStudio.jsx"),
    read("src/widget-system.js"),
    read("src/theme-layout-runtime-v170.js"),
    read("src/theme-layout-v170.css"),
    read("src/studio-production-v212.js"),
    read("src/studio-production-v212.css"),
    read("src/NaraAssistant.jsx"),
    read("public/sw.js"),
    read("public/release-v212.json"),
  ]);

  const checks = [
    [entry, "studio-production-v212.js", "Studio v212 import"],
    [studio, 'data-code-preview-device={device}', "Theme code selected-device marker"],
    [studio, "Peta tata letak 22 area widget", "22-area Theme map"],
    [widgets, 'id: "sidebar-left-4"', "real fourth left area"],
    [widgets, 'id: "sidebar-right-4"', "real fourth right area"],
    [widgets, 'id: "custom-html"', "custom HTML/JavaScript widget"],
    [layoutRuntime, '"sidebar-left-4"', "published fourth left area"],
    [layoutRuntime, '"sidebar-right-4"', "published fourth right area"],
    [layoutRuntime, "Empat area widget kanan postingan", "published four-right label"],
    [layoutCss, ".tn-layout-slot-v170.sidebar-right-4{grid-area:sidebar-right-4}", "right4 map grid area"],
    [runtime, RELEASE, "v212 runtime"],
    [runtime, 'studioDesktopSitePhone === "true"', "explicit desktop-site large mode"],
    [runtime, "camera-photo-file", "Nara attachment authority"],
    [css, 'data-studio-v212-family="large"', "large family CSS"],
    [css, 'data-v212-workspace="preview-above-code"', "small editor preview-first layout"],
    [css, 'sidebar-left-4 content-main sidebar-right-4', "four-left/four-right compact map"],
    [css, 'data-v212-menu="camera-photo-file"', "Nara Camera Photo File menu CSS"],
    [css, 'data-v212-domain-action="horizontal"', "Domain horizontal/full-width actions"],
    [nara, 'aria-controls="nara-attachment-menu-v211"', "v211 real attachment trigger retained"],
    [sw, VERSION, "v212 service worker"],
    [sw, CACHE, "v212 cache"],
    [sw, RELEASE, "v212 SW release marker"],
    [sw, "ngeblogging-app-v211-mobile-theme-nara-domain-20260802", "v211 compatibility marker"],
    [release, RELEASE, "v212 release metadata"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V212_VERIFY_FAILED:${label}:${marker}`);
  }
  for (const source of [runtime, studio, nara]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V212_DESTRUCTIVE_SESSION_ACTION");
  }
}

await patchStudioEntry();
await patchFourthRightArea();
await patchThemeCodeDeviceMarker();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
