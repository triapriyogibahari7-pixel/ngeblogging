import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-screenshot-recovery-v191-20260801";
const V190_COMPAT_VERSION = "ngeblogging-app-v190-real-device-20260801";
const V190_COMPAT_CACHE = "real-device-cache-v190";

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-screenshot-recovery-v191.js";')) {
    const anchor = 'import "./studio-real-device-v190.js";';
    if (!source.includes(anchor)) throw new Error("V191_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\nimport "./studio-screenshot-recovery-v191.js";`);
    await write(path, source);
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v191-screenshot-recovery-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "screenshot-recovery-cache-v191";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "screenshot-recovery-v191";');
  const compatibility = [
    'const REAL_DEVICE_COMPAT_VERSION_V190 = "ngeblogging-app-v190-real-device-20260801";',
    'const REAL_DEVICE_COMPAT_CACHE_V190 = "real-device-cache-v190";',
  ];
  for (const line of compatibility) {
    if (!source.includes(line)) source = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  }
  if (!source.includes("SCREENSHOT_RECOVERY_RELEASE_V191")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      '$1const SCREENSHOT_RECOVERY_RELEASE_V191 = "studio-screenshot-recovery-v191-20260801";\n',
    );
  }
  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V190", "NGE_BLOGGING_UPDATE_AVAILABLE_V191")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V189", "NGE_BLOGGING_UPDATE_AVAILABLE_V191");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V191_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V191_SESSION_DESTRUCTIVE_ACTION_FOUND");
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-screenshot-recovery-v191.js"],
    ["src/studio-screenshot-recovery-v191.js", RELEASE],
    ["src/studio-screenshot-recovery-v191.js", "full-synthetic-width-no-root-scale"],
    ["src/studio-screenshot-recovery-v191.js", "profile-only"],
    ["src/studio-screenshot-recovery-v191.css", 'data-studio-physical-mobile-v191="true"'],
    ["src/studio-screenshot-recovery-v191.css", ".mv176-title-actions"],
    ["src/studio-screenshot-recovery-v191.css", 'data-v191-nara-mode="nonmodal"'],
    ["src/studio-screenshot-recovery-v191.css", "transition: none !important"],
    ["src/lib/supabase.js", "persistSession: true"],
    ["src/lib/supabase.js", "autoRefreshToken: true"],
    ["src/lib/supabase.js", "direct-supabase-oauth"],
    ["scripts/patch-auth-callback-v162.mjs", "finishAuth = (nextSession = null)"],
    ["scripts/patch-auth-callback-v162.mjs", "onAuthenticated(data.session)"],
    ["public/release-v191.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V191_VERIFY_FAILED:${path}:${marker}`);
  }

  const worker = await read("public/sw.js");
  if (!worker.includes(V190_COMPAT_VERSION) || !worker.includes(V190_COMPAT_CACHE)) {
    throw new Error("V191_V190_CACHE_COMPATIBILITY_MARKERS_MISSING");
  }

  const runtime = await read("src/studio-screenshot-recovery-v191.js");
  if (/setImportant\(appRoot,\s*"zoom",\s*String\(/.test(runtime)) {
    throw new Error("V191_ROOT_ZOOM_REINTRODUCED");
  }
  if (/setImportant\(appRoot,\s*"transform",\s*`scale\(/.test(runtime)) {
    throw new Error("V191_ROOT_TRANSFORM_SCALE_REINTRODUCED");
  }

  const css = await read("src/studio-screenshot-recovery-v191.css");
  if (!css.includes("justify-content: flex-start !important") || !css.includes("place-items: center !important")) {
    throw new Error("V191_DRAWER_OR_LOGO_GEOMETRY_INCOMPLETE");
  }
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
if (String(process.env.V192_DIAGNOSTIC_SKIP || "") !== "1") {
  await import("./patch-production-v192.mjs");
}
console.log(`Applied ${RELEASE}${String(process.env.V192_DIAGNOSTIC_SKIP || "") === "1" ? " diagnostic:skip-v192" : " + Studio data bootstrap v192"}`);
