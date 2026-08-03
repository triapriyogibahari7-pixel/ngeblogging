import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v223-20260803";
const VERSION = "ngeblogging-app-v223-physical-ui-route-20260803";
const CACHE = "physical-ui-route-cache-v223";
const FORCE = "studio-v223";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V223_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const line = 'import "./studio-production-v223.js";';
  if (!source.includes(line)) {
    const anchor = 'import "./studio-production-v222-code-tabs.js";';
    if (!source.includes(anchor)) throw new Error("V223_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  source = insertAfterVersion(source, `const STUDIO_PRODUCTION_RELEASE_V223 = "${RELEASE}";`);
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_VERSION_V222 = "ngeblogging-app-v222-layout-code-nara-lock-20260803";');
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_CACHE_V222 = "layout-code-nara-lock-cache-v222";');
  for (const eventName of ["NGE_BLOGGING_UPDATE_AVAILABLE_V222", "NGE_BLOGGING_UPDATE_AVAILABLE_V221", "NGE_BLOGGING_UPDATE_AVAILABLE_V220"]) {
    source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V223");
  }
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v223 announces updates only; authenticated tabs and drafts stay intact.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V223_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V223_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, worker, release, auth, themeStudio, nara] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v223.js"),
    read("src/studio-production-v223.css"),
    read("public/sw.js"),
    read("public/release-v223.json"),
    read("src/lib/supabase.js"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
  ]);
  for (const [source, marker, label] of [
    [entry, "studio-production-v223.js", "entry"],
    [runtime, RELEASE, "runtime release"],
    [runtime, "v223PreviewModeLock", "independent preview lock"],
    [runtime, "preview-above-code", "physical small code stack"],
    [runtime, "camera-photo-file", "Nara plus"],
    [css, 'data-v223-layout="green-reference"', "green map"],
    [css, 'data-v223-workspace="preview-above-code"', "small code workspace"],
    [css, 'data-v223-workspace="code-left-preview-right"', "large code workspace"],
    [css, 'data-v223-attachment-menu="viewport-visible"', "Nara menu"],
    [worker, VERSION, "service worker version"],
    [worker, CACHE, "service worker cache"],
    [worker, RELEASE, "service worker release"],
    [release, RELEASE, "release metadata"],
    [auth, "persistSession: true", "persist session"],
    [auth, "autoRefreshToken: true", "refresh token"],
    [themeStudio, "PREVIEW LANGSUNG", "Theme preview"],
    [nara, "Kamera", "Nara Camera"],
    [nara, "Foto", "Nara Photo"],
    [nara, "File teks", "Nara File"],
  ]) if (!source.includes(marker)) throw new Error(`V223_VERIFY_FAILED:${label}:${marker}`);

  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size !== 100) throw new Error("V223_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V223_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V223_DESTRUCTIVE_SESSION_ACTION");
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
