import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v230-preview-bootstrap-live-gate-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v230-preview-bootstrap-live-gate-20260803";
const ACTIVE_CACHE = "preview-bootstrap-live-gate-cache-v230";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V230_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const line = 'import "./studio-production-v230.js";';
  if (!source.includes(line)) {
    const anchor = 'import "./studio-production-v229.js";';
    if (!source.includes(anchor)) throw new Error("V230_STUDIO_ENTRY_V229_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
  }
  if (source.indexOf("studio-production-v230.js") < source.indexOf("studio-production-v229.js")) throw new Error("V230_ENTRY_ORDER_INVALID");
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  const lines = [
    `const ACTIVE_VERSION_V230 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V230 = "${ACTIVE_CACHE}";`,
    `const STUDIO_PRODUCTION_RELEASE_V230 = "${RELEASE}";`,
  ];
  for (const line of lines) source = insertAfterVersion(source, line);

  const oldShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V229}-${ACTIVE_CACHE_RELEASE_V229}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const nextShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V230}-${ACTIVE_CACHE_RELEASE_V230}-${AUTH_HANDOFF_RELEASE}-shell`;';
  if (!source.includes(nextShell)) {
    if (!source.includes(oldShell)) throw new Error("V230_SHELL_CACHE_V229_ANCHOR_MISSING");
    source = source.replace(oldShell, nextShell);
  }
  const oldAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V229}-${ACTIVE_CACHE_RELEASE_V229}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const nextAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V230}-${ACTIVE_CACHE_RELEASE_V230}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(nextAsset)) {
    if (!source.includes(oldAsset)) throw new Error("V230_ASSET_CACHE_V229_ANCHOR_MISSING");
    source = source.replace(oldAsset, nextAsset);
  }

  source = source
    .replace("    version: ACTIVE_VERSION_V229,", "    version: ACTIVE_VERSION_V230,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V229,", "    release: ACTIVE_CACHE_RELEASE_V230,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V229", "NGE_BLOGGING_UPDATE_AVAILABLE_V230")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v230 announces a fresh shell without force-navigation or session destruction.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V230_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V230_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  for (const marker of [ACTIVE_VERSION, ACTIVE_CACHE, RELEASE, nextShell, nextAsset]) {
    if (!source.includes(marker)) throw new Error(`V230_ACTIVE_CACHE_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const [entry,runtime,css,auth,gate,theme,nara,analytics,worker,release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v230.js"),
    read("src/studio-production-v230.css"),
    read("src/lib/supabase.js"),
    read("src/StudioOnboardingGate.jsx"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/studio-analytics-v41.js"),
    read("public/sw.js"),
    read("public/release-v230.json"),
  ]);

  const checks = [
    [entry, "studio-production-v230.js"],
    [runtime, RELEASE],
    [runtime, "DEVICE_WIDTHS"],
    [runtime, "v230PreviewScale"],
    [runtime, "probeHealthyStudioData"],
    [runtime, "STARTUP_RETRY_LIMIT = 3"],
    [runtime, "listUserSites(userId)"],
    [runtime, "getSession()"],
    [runtime, "v230-avatar-preview"],
    [css, ".tn-frame-shell[data-v230-preview-scale]"],
    [css, "--v230-preview-target-width"],
    [css, 'data-v230-startup="bounded-recoverable"'],
    [auth, "persistSession: true"],
    [auth, "autoRefreshToken: true"],
    [gate, "recoverStudioMembershipV196"],
    [gate, "tidak ada logout otomatis"],
    [theme, 'data-v226-layout-source="native-green-reference"'],
    [nara, "Kamera"], [nara, "Foto"], [nara, "File teks"],
    [analytics, "get_site_analytics_dashboard"],
    [worker, ACTIVE_VERSION], [worker, ACTIVE_CACHE], [worker, RELEASE],
    [release, RELEASE],
  ];
  for (const [source,marker] of checks) if (!source.includes(marker)) throw new Error(`V230_VERIFY_FAILED:${marker}`);

  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((item) => item.id)).size !== 100) throw new Error("V230_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V230_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V230_DESTRUCTIVE_SESSION_ACTION");
  if (/getVerifiedSession\(\{ force: true \}\)/.test(runtime)) throw new Error("V230_FORCE_AUTH_PROBE_FORBIDDEN");
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}; active cache rotated to v230 and v229 remains compatibility authority.`);
