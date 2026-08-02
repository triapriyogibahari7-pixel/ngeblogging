import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const write = (path, value) => writeFile(new URL(path, root), value);

const RELEASE = "studio-production-v201-20260802";
const SW_VERSION = "ngeblogging-app-v201-production-ui-20260802";
const SW_CACHE = "production-ui-cache-v201";
const PWA_RELEASE = "ngeblogging-pwa-v201-20260802";
const PWA_RECOVERY = "pwa-v201-production-ui";

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${SW_VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${SW_CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "production-ui-v201";');

  if (!source.includes("PRODUCTION_UI_RELEASE_V201")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const PRODUCTION_UI_RELEASE_V201 = "${RELEASE}";\n`);
  }

  source = source.replace(/NGE_BLOGGING_UPDATE_AVAILABLE_V\d+/g, "NGE_BLOGGING_UPDATE_AVAILABLE_V201");
  source = source.replace(/NGE_BLOGGING_FORCE_RELOAD_V\d+/g, "NGE_BLOGGING_UPDATE_AVAILABLE_V201");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v201: tab diberi sinyal update tanpa forced navigation; sesi/editor tidak disentuh.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) {
    throw new Error("V201_FORCED_NAVIGATION_REMAINS");
  }
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V201_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  for (const marker of [SW_VERSION, SW_CACHE, RELEASE]) {
    if (!source.includes(marker)) throw new Error(`V201_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function patchPwaRuntime() {
  const path = "src/pwa-runtime.js";
  let source = await read(path);
  source = source.replace(/^const RELEASE = ".*";$/m, `const RELEASE = "${PWA_RELEASE}";`);
  source = source.replace(/^const RECOVERY_VALUE = ".*";$/m, `const RECOVERY_VALUE = "${PWA_RECOVERY}";`);

  const oldListener = '      if (event.data?.type === "NGE_BLOGGING_FORCE_RELOAD_V77") reloadForNewController(event.data.reason || "service-worker-message");';
  const newListener = '      if (/^NGE_BLOGGING_(?:UPDATE_AVAILABLE|FORCE_RELOAD)_V\\d+$/.test(String(event.data?.type || ""))) reloadForNewController(event.data.reason || "service-worker-message");';
  if (source.includes(oldListener)) source = source.replace(oldListener, newListener);
  else if (!source.includes("UPDATE_AVAILABLE|FORCE_RELOAD")) throw new Error("V201_PWA_MESSAGE_LISTENER_ANCHOR_MISSING");

  if (!source.includes(PWA_RELEASE) || !source.includes(PWA_RECOVERY)) {
    throw new Error("V201_PWA_RELEASE_MARKERS_MISSING");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-production-v201.js"],
    ["src/studio-production-v201.js", RELEASE],
    ["src/studio-production-v201.css", ".sn-api-page"],
    ["src/studio-production-v201.css", ".nara-assistant-shell[data-nara-size=\"small\"]"],
    ["src/studio-production-v201.css", ".sn-mobile-menu-mark strong"],
    ["public/release-v201.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V201_VERIFY_FAILED:${path}:${marker}`);
  }

  const auth = await read("src/lib/supabase.js");
  for (const marker of ["persistSession: true", "autoRefreshToken: true"]) {
    if (!auth.includes(marker)) throw new Error(`V201_AUTH_CONTINUITY_MISSING:${marker}`);
  }
}

await patchServiceWorker();
await patchPwaRuntime();
await verify();
console.log(`Applied ${RELEASE}`);
