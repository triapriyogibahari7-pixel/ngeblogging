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

async function verifyAreaAwareThemeAuthority() {
  // v207/v209 already own the persistent layout data model. v212 must not
  // rewrite that historical CSS/data structure; it only supplies the final
  // presentation authority so the build remains idempotent and non-destructive.
  const [widgets, runtime] = await Promise.all([
    read("src/widget-system.js"),
    read("src/theme-layout-runtime-v170.js"),
  ]);
  for (const marker of [
    'id: "sidebar-left-4"',
    'id: "sidebar-right-4"',
    'id: "custom-html"',
  ]) {
    if (!widgets.includes(marker)) throw new Error(`V212_THEME_AREA_PRECONDITION:${marker}`);
  }
  for (const marker of ['"sidebar-left-4"', '"sidebar-right-4"', "Empat area widget kanan postingan"]) {
    if (!runtime.includes(marker)) throw new Error(`V212_THEME_RUNTIME_PRECONDITION:${marker}`);
  }

  const studioPath = "src/ThemeStudio.jsx";
  let studio = await read(studioPath);
  if (!studio.includes('data-v212-layout-areas="22"')) {
    const v209Map = '<section id="ngeblogging-layout-map" className="tn-layout-studio" aria-label="Peta tata letak situs dengan empat widget kiri dan empat widget kanan">';
    studio = replaceRequired(
      studio,
      v209Map,
      '<section id="ngeblogging-layout-map" className="tn-layout-studio" data-v212-layout-areas="22" aria-label="Peta tata letak situs dengan empat widget kiri dan empat widget kanan">',
      "theme-v209-layout-map",
    );
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
  const [entry, studio, widgets, layoutRuntime, runtime, css, nara, sw, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/ThemeStudio.jsx"),
    read("src/widget-system.js"),
    read("src/theme-layout-runtime-v170.js"),
    read("src/studio-production-v212.js"),
    read("src/studio-production-v212.css"),
    read("src/NaraAssistant.jsx"),
    read("public/sw.js"),
    read("public/release-v212.json"),
  ]);

  const checks = [
    [entry, "studio-production-v212.js", "Studio v212 import"],
    [studio, 'data-code-preview-device={device}', "Theme code selected-device marker"],
    [studio, 'data-v212-layout-areas="22"', "22-area Theme map marker"],
    [studio, "empat widget kiri dan empat widget kanan", "v209 area-aware Theme map retained"],
    [studio, "preferredArea={widgetArea}", "area-aware widget picker retained"],
    [studio, "tn-widget-custom-code-v209", "custom HTML/JavaScript controls retained"],
    [widgets, 'id: "sidebar-left-4"', "real fourth left area"],
    [widgets, 'id: "sidebar-right-4"', "real fourth right area"],
    [widgets, 'id: "custom-html"', "custom HTML/JavaScript widget"],
    [layoutRuntime, '"sidebar-left-4"', "published fourth left area"],
    [layoutRuntime, '"sidebar-right-4"', "published fourth right area"],
    [layoutRuntime, "Empat area widget kanan postingan", "published four-right label"],
    [runtime, RELEASE, "v212 runtime"],
    [runtime, 'studioDesktopSitePhone === "true"', "explicit desktop-site large mode"],
    [runtime, "PHYSICAL_TABLET_MIN", "physical tablet large-mode threshold"],
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
await verifyAreaAwareThemeAuthority();
await patchThemeCodeDeviceMarker();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
