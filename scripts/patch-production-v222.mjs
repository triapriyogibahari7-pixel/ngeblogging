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
    const anchors = [
      'import "./studio-production-v221.js";',
      'import "./studio-production-v216.js";',
      'import "./studio-production-v210.js";',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("V222_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
  }
  const tabBridge = 'import "./studio-production-v222-code-tabs.js";';
  if (!source.includes(tabBridge)) source = source.replace(line, `${line}\n${tabBridge}`);
  await write(path, source);
}

async function patchThemeCodeActions() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  if (source.includes('data-v222-code-tab="html"') && source.includes('data-v222-code-tab="css"') && source.includes('data-v222-code-tab="javascript"')) return;

  const generic = '<button onClick={() => setModal("code")}><Code2/> Edit Kode</button>';
  const legacy = '<button onClick={() => setModal("code")}><Code2/> Edit HTML</button>';
  const actions = '<button data-v222-code-tab="html" onClick={() => setModal("code")}><FileCode2/> Edit HTML</button><button data-v222-code-tab="css" onClick={() => setModal("code")}><Palette/> Edit CSS</button><button data-v222-code-tab="javascript" onClick={() => setModal("code")}><Code2/> Edit JavaScript</button>';
  if (source.includes(generic)) source = source.replaceAll(generic, actions);
  else if (source.includes(legacy)) source = source.replaceAll(legacy, actions);
  else throw new Error("V222_THEME_CODE_ACTION_ANCHOR_MISSING");

  await write(path, source);
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
  const [entry, runtime, css, themeStudio, nara, auth, analytics, worker, release, tabBridge] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v222.js"),
    read("src/studio-production-v222.css"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/lib/supabase.js"),
    read("src/studio-analytics-v41.js"),
    read("public/sw.js"),
    read("public/release-v222.json"),
    read("src/studio-production-v222-code-tabs.js"),
  ]);

  const checks = [
    [entry, "studio-production-v222.js", "Studio v222 entry"],
    [entry, "studio-production-v222-code-tabs.js", "Theme tab bridge entry"],
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
    [themeStudio, 'data-v222-code-tab="html"', "explicit HTML action"],
    [themeStudio, 'data-v222-code-tab="css"', "explicit CSS action"],
    [themeStudio, 'data-v222-code-tab="javascript"', "explicit JavaScript action"],
    [tabBridge, "openRequestedThemeCodeTab", "matching Theme code tab bridge"],
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
await patchThemeCodeActions();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
