import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v214-20260802";
const VERSION = "ngeblogging-app-v214-screenshot-final-20260802";
const CACHE = "studio-screenshot-final-cache-v214";
const FORCE = "studio-v214";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V214_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v214.js";')) {
    source = replaceRequired(
      source,
      'import "./studio-production-v213.js";',
      'import "./studio-production-v213.js";\nimport "./studio-production-v214.js";',
      "Studio v213 import",
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
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V214")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_PRODUCTION_RELEASE_V214 = "${RELEASE}";\nconst STUDIO_PRODUCTION_COMPAT_VERSION_V213 = "ngeblogging-app-v213-analytics-layout-20260802";\nconst STUDIO_PRODUCTION_COMPAT_CACHE_V213 = "analytics-layout-cache-v213";\n`,
    );
  }
  for (const eventName of [
    "NGE_BLOGGING_UPDATE_AVAILABLE_V213",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V212",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V211",
  ]) source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V214");
  source = source.replace(
    /\n\s*await refreshStaleWindow\(client, url\);/g,
    "\n      // v214 announces update availability without forced navigation or session destruction.",
  );
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V214_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, auth, sw, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v214.js"),
    read("src/studio-production-v214.css"),
    read("src/lib/supabase.js"),
    read("public/sw.js"),
    read("public/release-v214.json"),
  ]);
  for (const [source, marker, label] of [
    [entry, "studio-production-v214.js", "Studio v214 import"],
    [runtime, RELEASE, "v214 runtime"],
    [runtime, "small-paired-four-plus-four", "small Theme layout"],
    [runtime, "camera-photo-file", "Nara attachments"],
    [css, 'data-v214-workspace="split-50-50"', "large Theme code split"],
    [css, 'data-v214-workspace="preview-above-code"', "small Theme preview/code"],
    [auth, "persistSession: true", "persistent session"],
    [auth, "autoRefreshToken: true", "refresh token"],
    [sw, VERSION, "v214 service worker"],
    [sw, CACHE, "v214 cache"],
    [release, RELEASE, "v214 release"],
  ]) {
    if (!source.includes(marker)) throw new Error(`V214_VERIFY_FAILED:${label}:${marker}`);
  }
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) {
    throw new Error("V214_RUNTIME_SESSION_DESTRUCTION");
  }
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE} runtime diagnostic authority`);
