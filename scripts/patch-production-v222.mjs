import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v222-20260803";
const VERSION = "ngeblogging-app-v222-layout-code-nara-lock-20260803";
const CACHE = "layout-code-nara-lock-cache-v222";
const FORCE = "studio-v222";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V222_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const line = 'import "./studio-production-v222.js";';
  if (!source.includes(line)) {
    const anchor = 'import "./studio-production-v221.js";';
    if (!source.includes(anchor)) throw new Error("V222_V221_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
    await write(path, source);
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  source = insertAfterVersion(source, `const STUDIO_PRODUCTION_RELEASE_V222 = "${RELEASE}";`);
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_VERSION_V221 = "ngeblogging-app-v221-green-layout-live-authority-20260802";');
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_CACHE_V221 = "green-layout-live-authority-cache-v221";');
  for (const eventName of ["NGE_BLOGGING_UPDATE_AVAILABLE_V221", "NGE_BLOGGING_UPDATE_AVAILABLE_V220", "NGE_BLOGGING_UPDATE_AVAILABLE_V219"]) {
    source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V222");
  }
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v222 announces updates only; authenticated tabs and drafts remain intact.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V222_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V222_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, themeStudio, nara, auth, analytics, worker, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v222.js"),
    read("src/studio-production-v222.css"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/lib/supabase.js"),
    read("src/studio-analytics-v41.js"),
    read("public/sw.js"),
    read("public/release-v222.json"),
  ]);

  const checks = [
    [entry, "studio-production-v222.js", "Studio v222 entry"],
    [runtime, RELEASE, "runtime release"],
    [runtime, "green-reference-full-width", "green full-width layout"],
    [runtime, "semantic-four-left-four-right", "semantic four/four map"],
    [runtime, "MAX_CODE_LINES = 10000", "ten-thousand code lines"],
    [runtime, "v222-code-line-gutter", "actual line gutter"],
    [runtime, "Rapikan kode", "manual code formatter"],
    [runtime, "position\", \"fixed", "fixed Nara attachment menu"],
    [runtime, "camera-photo-file", "Nara plus contract"],
    [css, 'data-v222-layout="green-reference-full-width"', "green map CSS"],
    [css, ".sidebar-left-4", "fourth left slot"],
    [css, ".sidebar-right-4", "fourth right slot"],
    [css, 'data-v222-workspace="preview-above-code"', "small code layout"],
    [css, 'data-v222-workspace="code-left-preview-right"', "large code layout"],
    [css, ".v222-code-line-gutter", "line gutter CSS"],
    [css, 'data-v222-attachment-menu="fixed-visible"', "fixed Nara menu CSS"],
    [css, 'data-v222-domain-action="full-horizontal"', "domain small action CSS"],
    [themeStudio, "preferredArea={widgetArea}", "clicked layout area reaches Widget Studio"],
    [themeStudio, "tn-widget-custom-code-v209", "custom HTML JavaScript widget retained"],
    [themeStudio, "Tema Custom", "custom theme retained"],
    [nara, "Kamera", "Nara Camera"],
    [nara, "Foto", "Nara Photo"],
    [nara, "File teks", "Nara File"],
    [nara, "Nara Vision", "Nara models"],
    [nara, "Maksimal", "Nara intelligence"],
    [auth, "persistSession: true", "persistent auth session"],
    [auth, "autoRefreshToken: true", "automatic token refresh"],
    [analytics, "get_site_analytics_dashboard", "real analytics source"],
    [worker, VERSION, "v222 service worker version"],
    [worker, CACHE, "v222 cache"],
    [worker, RELEASE, "v222 service worker marker"],
    [release, RELEASE, "v222 release metadata"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V222_VERIFY_FAILED:${label}:${marker}`);
  }

  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((item) => item.id)).size !== 100) {
    throw new Error("V222_THEME_COUNT_REGRESSION");
  }
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V222_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V222_DESTRUCTIVE_SESSION_ACTION");
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
