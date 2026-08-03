import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

export const RELEASE = "studio-auth-ui-regression-v248-20260803";
export const GUARD_RELEASE = "studio-regression-guard-v248-20260803";
export const VERSION = "ngeblogging-app-v248-auth-ui-regression-20260803";
export const CACHE = "auth-ui-regression-cache-v248";

const RETIRED_STUDIO_IMPORTS = [
  'import "./studio-stable-shell-v244.js";',
  'import "./studio-stable-shell-v244-final.css";',
  'import "./studio-sidebar-brand-v246.js";',
  'import "./studio-sidebar-brand-v246.css";',
  'import "./studio-screenshot-lock-v247.css";',
];

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  for (const legacy of RETIRED_STUDIO_IMPORTS) source = source.replace(`${legacy}\n`, "").replace(legacy, "");

  const v242 = 'import "./studio-shell-rescue-v242.js";';
  const v248 = 'import "./studio-regression-guard-v248.js";';
  if (!source.includes(v242)) throw new Error("V248_STUDIO_V242_MISSING");
  if (!source.includes(v248)) source = source.replace(v242, `${v242}\n${v248}`);
  if (source.indexOf(v248) < source.indexOf(v242)) throw new Error("V248_STUDIO_ORDER_INVALID");

  for (const marker of [
    'studio-production-v234.js',
    'studio-production-v235-widget-target.js',
    'studio-react-safe-v240.js',
    'studio-visual-stability-v241.js',
    'studio-shell-rescue-v242.js',
    'studio-regression-guard-v248.js',
  ]) if (!source.includes(marker)) throw new Error(`V248_STUDIO_FEATURE_MISSING:${marker}`);
  for (const legacy of RETIRED_STUDIO_IMPORTS) if (source.includes(legacy)) throw new Error(`V248_CONFLICTING_SHELL_ACTIVE:${legacy}`);
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);

  source = source
    .replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`)
    .replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`)
    .replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "auth-ui-v248";')
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${VERSION}-${CACHE_RELEASE}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${VERSION}-${CACHE_RELEASE}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/NGE_BLOGGING_(?:FORCE_RELOAD|UPDATE_AVAILABLE)_V\d+/g, "NGE_BLOGGING_UPDATE_AVAILABLE_V248")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v248 never forces navigation; the user keeps the current session/editor state.");

  source = source.replace(/(\n\s*version:\s*)[^,\n]+,/, "$1VERSION,");
  source = source.replace(/(\n\s*release:\s*)[^,\n]+,/, "$1CACHE_RELEASE,");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V248_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V248_DESTRUCTIVE_SERVICE_WORKER_ACTION");
  for (const marker of [VERSION, CACHE, "NGE_BLOGGING_UPDATE_AVAILABLE_V248", "isAuthSurface", "AUTH_HANDOFF_RELEASE"]) {
    if (!source.includes(marker)) throw new Error(`V248_SERVICE_WORKER_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verifyContracts() {
  const [entry, guard, css, authReadiness, auth, theme, nara, v234, v242] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-regression-guard-v248.js"),
    read("src/studio-regression-guard-v248.css"),
    read("src/auth-readiness-bridge.js"),
    read("src/lib/supabase.js"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/studio-production-v234.js"),
    read("src/studio-shell-rescue-v242.js"),
  ]);

  const checks = [
    [entry, "studio-regression-guard-v248.js"],
    [guard, GUARD_RELEASE],
    [guard, "removeConflictingChrome"],
    [css, 'data-v248-family="small"'],
    [css, 'data-v248-family="large"'],
    [css, "nara-assistant-layer"],
    [authReadiness, "auth-readiness-nondestructive-v248"],
    [authReadiness, "Opsi login tetap aktif"],
    [auth, "persistSession: true"],
    [auth, "autoRefreshToken: true"],
    [auth, "signInWithProvider"],
    [auth, "signInWithPassword"],
    [theme, "THEME_COUNT"],
    [v234, "GRID_PLACEMENT"],
    [v234, "WIDGET_CHOICES"],
    [v234, "HTML / JavaScript"],
    [v242, "v242-nara-attachment-menu"],
    [nara, "Kamera"],
    [nara, "Foto"],
    [nara, "File teks"],
    [nara, "intelligenceOptions"],
    [nara, "modelOptions"],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V248_CONTRACT_MISSING:${marker}`);

  if (/hideUnavailableEmailActions|leaveSignupMode/.test(authReadiness)) throw new Error("V248_DESTRUCTIVE_AUTH_READINESS_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/.test(guard + authReadiness)) throw new Error("V248_DESTRUCTIVE_STORAGE_ACTION");
}

await patchStudioEntry();
await patchServiceWorker();
await verifyContracts();
console.log(`Applied ${RELEASE}; React Studio/v234-v242 remain authoritative, login readiness is non-destructive, cache rotated to v248.`);
