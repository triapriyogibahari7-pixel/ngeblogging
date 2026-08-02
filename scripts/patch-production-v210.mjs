import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v210-20260802";
const VERSION = "ngeblogging-app-v210-theme-nara-domain-mobile-20260802";
const CACHE = "theme-nara-domain-mobile-cache-v210";
const FORCE = "studio-v210";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V210_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

async function patchThemeAuthority() {
  await import("./patch-theme-layout-v210.mjs");
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v210.js";')) {
    source = replaceRequired(
      source,
      'import "./studio-production-v209.js";',
      'import "./studio-production-v209.js";\nimport "./studio-production-v210.js";',
      "studio-entry",
    );
    await write(path, source);
  }
}

async function patchFastGate() {
  const path = "src/StudioFastGate.jsx";
  let source = await read(path);
  if (!source.includes("studio-fast-entry-v210-20260802")) {
    source = source.replace(/const RELEASE = ".*?";/, 'const RELEASE = "studio-fast-entry-v210-20260802";');
  }
  const anchor = 'const SNAPSHOT_KEYS = [\n';
  if (!source.includes(anchor)) throw new Error("V210_FAST_GATE_SNAPSHOT_ANCHOR_MISSING");
  for (const key of [
    "ngeblogging-active-site-snapshot-v209",
    "ngeblogging-active-site-snapshot-v208",
    "ngeblogging-active-site-snapshot-v205",
    "ngeblogging-active-site-snapshot-v198",
    "ngeblogging-active-site-snapshot-v195",
    "ngeblogging-active-site-snapshot-v192",
    "ngeblogging-active-site-snapshot-v191",
  ]) {
    if (!source.includes(`  "${key}",`)) source = source.replace(anchor, `${anchor}  "${key}",\n`);
  }
  if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/.test(source)) {
    throw new Error("V210_FAST_GATE_DESTRUCTIVE_SESSION_ACTION");
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V210")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_PRODUCTION_RELEASE_V210 = "${RELEASE}";\nconst STUDIO_PRODUCTION_COMPAT_VERSION_V209 = "ngeblogging-app-v209-theme-domain-nara-20260802";\nconst STUDIO_PRODUCTION_COMPAT_CACHE_V209 = "theme-domain-nara-cache-v209";\n`,
    );
  }
  for (const eventName of [
    "NGE_BLOGGING_UPDATE_AVAILABLE_V209",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V208",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V207",
  ]) source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V210");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v210 announces the update without forcing navigation; login/editor state is retained.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V210_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, fastGate, themeStudio, widgets, runtime, css, sw, publicSite, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/StudioFastGate.jsx"),
    read("src/ThemeStudio.jsx"),
    read("src/widget-system.js"),
    read("src/studio-production-v210.js"),
    read("src/studio-production-v210.css"),
    read("public/sw.js"),
    read("src/PublicSiteNext.jsx"),
    read("public/release-v210.json"),
  ]);
  const checks = [
    [entry, 'studio-production-v210.js', "Studio v210 import"],
    [fastGate, "studio-fast-entry-v210-20260802", "current fast gate"],
    [fastGate, "ngeblogging-active-site-snapshot-v195", "current cached-site resume"],
    [themeStudio, 'data-theme-layout-v210="theme-layout-v210-20260802"', "Theme v210 marker"],
    [themeStudio, "tn-widget-custom-code-v209", "custom HTML JavaScript editor preserved"],
    [themeStudio, "preferredArea={widgetArea}", "area-aware Widget Studio preserved"],
    [widgets, 'id: "sidebar-left-4"', "left4"],
    [widgets, 'id: "sidebar-right-4"', "right4"],
    [widgets, 'WIDGET_LAYOUT_V210 = "theme-layout-v210-20260802"', "layout v210 marker"],
    [runtime, "camera-photo-file", "Nara Camera Photo File"],
    [css, 'data-v210-mode="nonmodal"', "Nara nonmodal CSS"],
    [css, ".tn-modal.fullscreen .tn-code-workspace", "code editor visible"],
    [css, 'data-v210-domain-action="horizontal"', "Domain horizontal action"],
    [sw, VERSION, "v210 service worker"],
    [sw, CACHE, "v210 cache"],
    [sw, RELEASE, "v210 release marker"],
    [sw, "ngeblogging-app-v209-theme-domain-nara-20260802", "v209 compatibility marker"],
    [publicSite, "PUBLIC_SITE_SINGLE_RENDER_V209", "single public-site initial render"],
    [release, RELEASE, "release metadata"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V210_VERIFY_FAILED:${label}:${marker}`);
  }
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) {
    throw new Error("V210_RUNTIME_DESTRUCTIVE_SESSION_ACTION");
  }
  if (/await refreshStaleWindow\(client, url\);/.test(sw)) throw new Error("V210_SW_FORCED_NAVIGATION_REMAINS");
}

await patchThemeAuthority();
await patchStudioEntry();
await patchFastGate();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
