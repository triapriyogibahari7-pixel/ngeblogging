import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-source-stability-v237-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v237-source-stability-20260803";
const ACTIVE_CACHE = "source-stability-cache-v237";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V237_SAFE_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  for (const line of [
    `const ACTIVE_VERSION_V237 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V237 = "${ACTIVE_CACHE}";`,
    `const STUDIO_SOURCE_STABILITY_RELEASE_V237 = "${RELEASE}";`,
  ]) source = insertAfterVersion(source, line);

  source = source
    .replace('const SHELL_CACHE = `${ACTIVE_VERSION_V236}-${ACTIVE_CACHE_RELEASE_V236}-${AUTH_HANDOFF_RELEASE}-shell`;', 'const SHELL_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace('const ASSET_CACHE = `${ACTIVE_VERSION_V236}-${ACTIVE_CACHE_RELEASE_V236}-${AUTH_HANDOFF_RELEASE}-assets`;', 'const ASSET_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace("    version: ACTIVE_VERSION_V236,", "    version: ACTIVE_VERSION_V237,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V236,", "    release: ACTIVE_CACHE_RELEASE_V237,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V236", "NGE_BLOGGING_UPDATE_AVAILABLE_V237")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v237 announces a fresh shell without forced navigation, logout, or storage clearing.");

  for (const marker of [
    ACTIVE_VERSION,
    ACTIVE_CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-assets`;',
  ]) if (!source.includes(marker)) throw new Error(`V237_SAFE_SW_MARKER_MISSING:${marker}`);
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V237_SAFE_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, studio, operations, analytics, themes, widgets, auth, release] = await Promise.all([
    read("src/Studio.jsx"), read("src/studio-source-stability-v237.js"), read("src/studio-source-stability-v237.css"),
    read("src/StudioNext.jsx"), read("src/studio-operations-v41.js"), read("src/studio-analytics-v41.js"),
    read("src/theme-catalog.js"), read("src/widget-system.js"), read("src/lib/supabase.js"), read("public/release-v237.json"),
  ]);
  const checks = [
    [entry, "studio-source-stability-v237.js"], [runtime, RELEASE], [runtime, "studio-operations-v41.js"],
    [runtime, "camera-photo-file"], [css, 'data-v237-family="small"'], [css, "data-v237-domain-action"],
    [css, "tn-widget-summary"], [css, "code-left-preview-right"], [studio, "MAX_SITES_PER_ACCOUNT = 25"],
    [operations, "Tambah situs"], [operations, "loadAnalytics"], [analytics, "get_site_analytics_dashboard"],
    [analytics, "op41-line-v213"], [themes, "FAMILIES.flatMap"], [widgets, 'id: "custom-html"'],
    [auth, "persistSession: true"], [auth, "autoRefreshToken: true"], [release, RELEASE],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V237_SAFE_VERIFY_FAILED:${marker}`);
  if (entry.indexOf("studio-source-stability-v237.js") < entry.indexOf("studio-real-device-v236.js")) throw new Error("V237_SAFE_ENTRY_NOT_FINAL");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V237_SAFE_DESTRUCTIVE_RUNTIME_ACTION");
}

await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE} without rewriting historical React components; final UI separation is runtime-owned.`);
