import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v225-20260803";
const VERSION = "ngeblogging-app-v225-theme-layout-nara-20260803";
const CACHE = "theme-layout-nara-cache-v225";
const FORCE = "studio-v225";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V225_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const runtime = 'import "./studio-production-v225.js";';
  const isolation = 'import "./studio-production-v225-action-isolation.js";';
  if (!source.includes(runtime)) {
    const anchor = 'import "./studio-production-v223.js";';
    if (!source.includes(anchor)) throw new Error("V225_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${runtime}`);
  }
  if (!source.includes(isolation)) source = source.replace(runtime, `${runtime}\n${isolation}`);
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  source = insertAfterVersion(source, `const STUDIO_PRODUCTION_RELEASE_V225 = "${RELEASE}";`);
  source = insertAfterVersion(source, 'const DATA_REAUTH_COMPAT_VERSION_V224 = "ngeblogging-app-v224-data-reauth-20260803";');
  source = insertAfterVersion(source, 'const DATA_REAUTH_COMPAT_CACHE_V224 = "data-reauth-cache-v224";');
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V224", "NGE_BLOGGING_UPDATE_AVAILABLE_V225");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v225 announces updates only; authenticated tabs, callbacks and drafts stay intact.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V225_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V225_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, isolation, css, isolationCss, worker, release, auth, dataReauth, themeStudio, nara, analytics, v222] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v225.js"),
    read("src/studio-production-v225-action-isolation.js"),
    read("src/studio-production-v225.css"),
    read("src/studio-production-v225-action-isolation.css"),
    read("public/sw.js"),
    read("public/release-v225.json"),
    read("src/lib/supabase.js"),
    read("scripts/patch-data-reauth-v224.mjs"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/studio-analytics-v41.js"),
    read("src/studio-production-v222.js"),
  ]);
  const nativeV245 = themeStudio.includes('data-theme-interface="v245-native"')
    && themeStudio.includes("function CodeSurface")
    && themeStudio.includes('id: "left-4"')
    && themeStudio.includes('id: "right-4"')
    && themeStudio.includes('id: "content-main"');
  const checks = [
    [entry,"studio-production-v225.js","entry runtime"],
    [entry,"studio-production-v225-action-isolation.js","entry action isolation"],
    [runtime,RELEASE,"runtime release"],
    [runtime,"compact-green-map","compact green map"],
    [runtime,"1-to-10000-actual","actual code gutter"],
    [runtime,"camera-photo-file","Nara plus"],
    [runtime,"transparent-click-close","sidebar backdrop"],
    [runtime,"large-detail","analytics authority"],
    [isolation,"outside-v209-direct-button-sweep","v209 action isolation"],
    [isolationCss,"v225-theme-code-actions","isolated action CSS"],
    [css,'data-v225-layout-canvas="compact-green-map"',"small map CSS"],
    [css,'data-v225-workspace="preview-above-code"',"small code layout"],
    [css,'data-v225-workspace="code-left-preview-right"',"large code layout"],
    [css,'data-v225-nara-mode="nonmodal"',"Nara nonmodal"],
    [css,'data-v225-attachment-menu="viewport-fixed"',"Nara fixed menu"],
    [css,'data-v225-domain-action="full-horizontal"',"Domain actions"],
    [css,'data-v225-analytics="large-detail"',"Analytics chart"],
    [worker,VERSION,"service worker version"],
    [worker,CACHE,"service worker cache"],
    [worker,RELEASE,"service worker release"],
    [worker,"DATA_REAUTH_COMPAT_VERSION_V224","v224 auth compatibility"],
    [release,RELEASE,"release metadata"],
    [auth,"persistSession: true","persist session"],
    [auth,"autoRefreshToken: true","refresh token"],
    [auth,"DATA_REAUTH_RELEASE_V224","v224 data reauth installed"],
    [dataReauth,"retryDataAfterReauthV224","data reauth patch preserved"],
    [themeStudio,nativeV245 ? "function CodeSurface" : 'data-v222-code-tab="html"',"HTML action"],
    [themeStudio,nativeV245 ? 'id:"css",label:"CSS"' : 'data-v222-code-tab="css"',"CSS action"],
    [themeStudio,nativeV245 ? 'id:"javascript",label:"JavaScript"' : 'data-v222-code-tab="javascript"',"JavaScript action"],
    [themeStudio,nativeV245 ? "LAYOUT_SLOTS" : "preferredArea={widgetArea}","area-aware widget studio"],
    [themeStudio,nativeV245 ? "BUILT_IN_WIDGETS.map" : "tn-widget-custom-code-v209","custom HTML JavaScript widget"],
    [themeStudio,nativeV245 ? "THEME_COUNT" : "Tema Custom","custom theme/catalog"],
    [nara,"Kamera","Nara Camera"],[nara,"Foto","Nara Photo"],[nara,"File teks","Nara File"],[nara,"Nara Mini","Nara model"],[nara,"Instan","Nara intelligence"],
    [analytics,"get_site_analytics_dashboard","real analytics source"],
    [v222,"MAX_CODE_LINES = 10000","v222 line limit"],[v222,"v222-code-line-gutter","v222 real gutter"],[v222,"v222-format-code","v222 formatter"],
  ];
  for (const [source, marker, label] of checks) if (!source.includes(marker)) throw new Error(`V225_VERIFY_FAILED:${label}:${marker}`);
  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size !== 100) throw new Error("V225_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || !BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html")) throw new Error("V225_WIDGET_COUNT_REGRESSION");
  for (const source of [runtime,isolation]) if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V225_DESTRUCTIVE_SESSION_ACTION");
  if (/900\s*(juta|miliar|million|billion)/i.test(release)) throw new Error("V225_UNSUPPORTED_CAPACITY_CLAIM");
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);

// v226 changes only the Theme Studio source map after the established v225
// runtime has been verified. v245 is a native React successor and v226 will
// detect it and leave its source intact.
await import("./patch-production-v226.mjs");
