import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v212-20260802";
const VERSION = "ngeblogging-app-v212-layout-code-nara-analytics-20260802";
const CACHE = "layout-code-nara-analytics-cache-v212";
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

async function normalizeCss() {
  const path = "src/studio-production-v212.css";
  let source = await read(path);
  const broken = `html[data-studio-v212-device="handheld"] .tn-code-workspace-v212,\nhtml[data-studio-v212-device="handheld"] .tn-code-workspace.tn-code-workspace-v212,\n@media (max-width:760px) {`;
  if (source.includes(broken)) {
    source = source.replace(broken, `html[data-studio-v212-device="handheld"] .tn-code-workspace-v212,\nhtml[data-studio-v212-device="handheld"] .tn-code-workspace.tn-code-workspace-v212 {\n  grid-template-columns:1fr !important;\n  gap:10px !important;\n  overflow:visible !important;\n}\n\n@media (max-width:760px) {`);
    await write(path, source);
  }
  if (source.includes(',\n@media (max-width:760px)')) throw new Error("V212_CSS_INVALID_MEDIA_SELECTOR");
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V212")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_PRODUCTION_RELEASE_V212 = "${RELEASE}";\nconst STUDIO_PRODUCTION_COMPAT_VERSION_V211 = "ngeblogging-app-v211-mobile-theme-nara-domain-20260802";\nconst STUDIO_PRODUCTION_COMPAT_CACHE_V211 = "mobile-theme-nara-domain-cache-v211";\n`);
  }
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v212 runtime authority: no forced navigation or session destruction.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V212_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, sw, release] = await Promise.all([
    read("src/Studio.jsx"), read("src/studio-production-v212.js"), read("src/studio-production-v212.css"), read("public/sw.js"), read("public/release-v212.json"),
  ]);
  for (const [source, marker, label] of [
    [entry, "studio-production-v212.js", "Studio v212 import"],
    [runtime, RELEASE, "v212 runtime"],
    [runtime, "camera-photo-file", "Nara attachment authority"],
    [css, ".tn-layout-content-main-v212", "layout CSS"],
    [css, ".tn-code-workspace-v212", "code CSS"],
    [sw, VERSION, "v212 service worker"],
    [sw, CACHE, "v212 cache"],
    [sw, RELEASE, "v212 release marker"],
    [release, RELEASE, "v212 metadata"],
  ]) {
    if (!source.includes(marker)) throw new Error(`V212_VERIFY_FAILED:${label}:${marker}`);
  }
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V212_DESTRUCTIVE_SESSION_ACTION");
}

await patchStudioEntry();
await normalizeCss();
await patchServiceWorker();
await verify();
await import("./patch-production-v212-theme.mjs");
console.log(`Applied ${RELEASE} runtime/CSS + Theme Studio`);
