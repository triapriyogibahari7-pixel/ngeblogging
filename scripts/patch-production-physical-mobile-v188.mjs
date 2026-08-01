import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-physical-mobile-v188-20260801";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V188_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-authority-v187.js";')) {
    source = replaceOnce(
      source,
      'import "./studio-mobile-authority-v185.js";',
      'import "./studio-mobile-authority-v185.js";\nimport "./studio-production-authority-v187.js";',
      "V187_ENTRY",
    );
  }
  if (!source.includes('import "./studio-physical-mobile-v188.js";')) {
    source = replaceOnce(
      source,
      'import "./studio-production-authority-v187.js";',
      'import "./studio-production-authority-v187.js";\nimport "./studio-physical-mobile-v188.js";',
      "STUDIO_ENTRY",
    );
  }
  await write(path, source);
}

async function patchDeviceDetection() {
  const path = "src/studio-device-mode-v140.js";
  let source = await read(path);
  source = source.replace(
    "const desktopSitePhone = handheld && view.layoutWidth > Math.max(TABLET_MAX, view.physicalViewportWidth * 1.35);",
    "const desktopSitePhone = handheld && view.layoutWidth > view.physicalViewportWidth * 1.35;",
  );
  if (!source.includes("view.layoutWidth > view.physicalViewportWidth * 1.35")) {
    throw new Error("V188_DESKTOP_SITE_PHONE_DETECTOR_MISSING");
  }
  if (source.includes("Math.max(TABLET_MAX, view.physicalViewportWidth * 1.35)")) {
    throw new Error("V188_LEGACY_DESKTOP_SITE_THRESHOLD_REMAINS");
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v188-physical-mobile-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "physical-mobile-cache-v188";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "physical-mobile-v188";');
  if (!source.includes("PHYSICAL_MOBILE_RELEASE_V188")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      '$1const PHYSICAL_MOBILE_RELEASE_V188 = "studio-physical-mobile-v188-20260801";\n',
    );
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V187", "NGE_BLOGGING_UPDATE_AVAILABLE_V188");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) {
    throw new Error("V188_FORCED_NAVIGATION_REMAINS");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-production-authority-v187.js"],
    ["src/Studio.jsx", "studio-physical-mobile-v188.js"],
    ["src/studio-device-mode-v140.js", "view.layoutWidth > view.physicalViewportWidth * 1.35"],
    ["src/studio-physical-mobile-v188.js", "studio-physical-mobile-v188-20260801"],
    ["src/studio-physical-mobile-v188.js", "studioDesktopSiteCompensationV188"],
    ["src/studio-physical-mobile-v188.css", "data-studio-physical-mobile-v188"],
    ["src/studio-physical-mobile-v188.css", "data-studio-desktop-site-phone"],
    ["public/sw.js", "ngeblogging-app-v188-physical-mobile-20260801"],
    ["public/sw.js", "physical-mobile-cache-v188"],
    ["public/sw.js", "PHYSICAL_MOBILE_RELEASE_V188"],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V188_VERIFY_FAILED:${path}:${marker}`);
  }
  const patchSource = await read("scripts/patch-production-physical-mobile-v188.mjs");
  if (/signOut\s*\(|localStorage\.clear\s*\(/.test(patchSource)) {
    throw new Error("V188_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
}

await patchStudioEntry();
await patchDeviceDetection();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
