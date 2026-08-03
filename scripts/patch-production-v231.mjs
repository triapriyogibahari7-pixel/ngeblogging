import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v231-sidebar-theme-nara-final-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v231-sidebar-theme-nara-final-20260803";
const ACTIVE_CACHE = "sidebar-theme-nara-final-cache-v231";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V231_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const line = 'import "./studio-production-v231.js";';
  if (!source.includes(line)) {
    const anchor = 'import "./studio-production-v230.js";';
    if (!source.includes(anchor)) throw new Error("V231_STUDIO_ENTRY_V230_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
  }
  if (source.indexOf("studio-production-v231.js") < source.indexOf("studio-production-v230.js")) throw new Error("V231_ENTRY_ORDER_INVALID");
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  const lines = [
    `const ACTIVE_VERSION_V231 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V231 = "${ACTIVE_CACHE}";`,
    `const STUDIO_PRODUCTION_RELEASE_V231 = "${RELEASE}";`,
  ];
  for (const line of lines) source = insertAfterVersion(source, line);

  const shell230 = 'const SHELL_CACHE = `${ACTIVE_VERSION_V230}-${ACTIVE_CACHE_RELEASE_V230}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const shell231 = 'const SHELL_CACHE = `${ACTIVE_VERSION_V231}-${ACTIVE_CACHE_RELEASE_V231}-${AUTH_HANDOFF_RELEASE}-shell`;';
  if (!source.includes(shell231)) {
    if (!source.includes(shell230)) throw new Error("V231_SHELL_CACHE_V230_ANCHOR_MISSING");
    source = source.replace(shell230, shell231);
  }
  const asset230 = 'const ASSET_CACHE = `${ACTIVE_VERSION_V230}-${ACTIVE_CACHE_RELEASE_V230}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const asset231 = 'const ASSET_CACHE = `${ACTIVE_VERSION_V231}-${ACTIVE_CACHE_RELEASE_V231}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(asset231)) {
    if (!source.includes(asset230)) throw new Error("V231_ASSET_CACHE_V230_ANCHOR_MISSING");
    source = source.replace(asset230, asset231);
  }

  source = source
    .replace("    version: ACTIVE_VERSION_V230,", "    version: ACTIVE_VERSION_V231,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V230,", "    release: ACTIVE_CACHE_RELEASE_V231,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V230", "NGE_BLOGGING_UPDATE_AVAILABLE_V231")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v231 announces the fresh shell without forced navigation or logout.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V231_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V231_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  for (const marker of [ACTIVE_VERSION, ACTIVE_CACHE, RELEASE, shell231, asset231]) {
    if (!source.includes(marker)) throw new Error(`V231_ACTIVE_CACHE_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const [entry,runtime,css,auth,nara,theme,analytics,release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v231.js"),
    read("src/studio-production-v231.css"),
    read("src/lib/supabase.js"),
    read("src/NaraAssistant.jsx"),
    read("src/ThemeStudio.jsx"),
    read("src/studio-analytics-v41.js"),
    read("public/release-v231.json"),
  ]);
  const checks = [
    [entry, "studio-production-v231.js"],
    [runtime, RELEASE],
    [runtime, "single-internal-n"],
    [runtime, "tight-under-create"],
    [runtime, "green-reference-interactive"],
    [runtime, "real-lines-up-to-10000"],
    [runtime, "camera-photo-file-visible"],
    [css, 'data-v231-family="large"'],
    [css, 'data-v231-family="small"'],
    [css, "sidebar-left-4"],
    [css, "sidebar-right-4"],
    [css, "code-left-preview-right"],
    [css, "preview-top-code-bottom"],
    [css, "nara-attachment-menu"],
    [auth, "persistSession: true"],
    [auth, "autoRefreshToken: true"],
    [nara, "Kamera"],
    [nara, "Foto"],
    [nara, "File teks"],
    [nara, "Tingkat kecerdasan"],
    [nara, "Model Nara"],
    [theme, "ThemeStudio"],
    [analytics, "get_site_analytics_dashboard"],
    [release, RELEASE],
  ];
  for (const [source,marker] of checks) if (!source.includes(marker)) throw new Error(`V231_VERIFY_FAILED:${marker}`);
  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((item) => item.id)).size !== 100) throw new Error("V231_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.length !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V231_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V231_DESTRUCTIVE_SESSION_ACTION");
  if (/justify-content:\s*center!important/.test(css.match(/#ngeblogging-studio-sidebar>nav[^}]*\}/)?.[0] || "")) throw new Error("V231_SIDEBAR_CENTER_GAP_REINTRODUCED");
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}; v230 remains compatibility authority and v231 owns final responsive geometry.`);
