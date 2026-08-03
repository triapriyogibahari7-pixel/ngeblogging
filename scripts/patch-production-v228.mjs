import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v228-green-editor-nara-20260803";
const VERSION = "ngeblogging-app-v228-green-editor-nara-20260803";
const CACHE = "green-editor-nara-cache-v228";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V228_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchDeviceModeSource() {
  const path = "src/studio-device-mode-v140.js";
  let source = await read(path);
  const marker = "V228_DESKTOP_SITE_PHYSICAL_PHONE_LOCK";
  if (!source.includes(marker)) {
    source = source.replace(
      "function classifyResponsiveMode(view, handheld) {\n  if (standaloneSurface()) return \"application\";",
      `function classifyResponsiveMode(view, handheld, desktopSitePhone = false) {\n  // ${marker}: browser Desktop Site on a physical phone is a deliberate\n  // large-layout choice. It must be evaluated before phone/mobile classification.\n  if (standaloneSurface()) return \"application\";\n  if (desktopSitePhone) return \"desktop\";`,
    );
    if (!source.includes(marker)) throw new Error("V228_DEVICE_CLASSIFIER_ANCHOR_MISSING");
    const detectOld = `export function detectStudioResponsiveMode() {\n  const view = viewportMetrics();\n  return classifyResponsiveMode(view, handheldSignal(view));\n}`;
    const detectNext = `export function detectStudioResponsiveMode() {\n  const view = viewportMetrics();\n  const handheld = handheldSignal(view);\n  const desktopSitePhone = handheld && view.layoutWidth > view.physicalViewportWidth * 1.35;\n  return classifyResponsiveMode(view, handheld, desktopSitePhone);\n}`;
    if (!source.includes(detectOld)) throw new Error("V228_DEVICE_DETECT_ANCHOR_MISSING");
    source = source.replace(detectOld, detectNext);
    const applyOld = `  const handheld = handheldSignal(view);\n  const responsiveMode = classifyResponsiveMode(view, handheld);\n  const nextLayoutMode = layoutMode(responsiveMode);\n  const variant = desktopVariant(view, responsiveMode);\n  const desktopSitePhone = handheld && view.layoutWidth > view.physicalViewportWidth * 1.35;`;
    const applyNext = `  const handheld = handheldSignal(view);\n  const desktopSitePhone = handheld && view.layoutWidth > view.physicalViewportWidth * 1.35;\n  const responsiveMode = classifyResponsiveMode(view, handheld, desktopSitePhone);\n  const nextLayoutMode = layoutMode(responsiveMode);\n  const variant = desktopSitePhone ? \"desktop\" : desktopVariant(view, responsiveMode);`;
    if (!source.includes(applyOld)) throw new Error("V228_DEVICE_APPLY_ANCHOR_MISSING");
    source = source.replace(applyOld, applyNext);
  }
  if (!source.includes('if (desktopSitePhone) return "desktop";')) throw new Error("V228_DESKTOP_SITE_PRIORITY_MISSING");
  await write(path, source);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const runtime = 'import "./studio-production-v228.js";';
  if (!source.includes(runtime)) {
    const anchors = ['import "./studio-production-v225-action-isolation.js";','import "./studio-production-v225.js";','import "./studio-production-v223.js";','import "./studio-production-v222-code-tabs.js";'];
    const anchor = anchors.find((value) => source.includes(value));
    if (!anchor) throw new Error("V228_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${runtime}`);
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  const compat = [
    'const STUDIO_PRODUCTION_COMPAT_VERSION_V226_V228 = "ngeblogging-app-v226-native-green-layout-20260803";',
    'const STUDIO_PRODUCTION_COMPAT_CACHE_V226_V228 = "native-green-layout-cache-v226";',
    'const STUDIO_PRODUCTION_COMPAT_VERSION_V225_V228 = "ngeblogging-app-v225-theme-layout-nara-20260803";',
    'const STUDIO_PRODUCTION_COMPAT_CACHE_V225_V228 = "theme-layout-nara-cache-v225";',
    'const DATA_REAUTH_COMPAT_VERSION_V224_V228 = "ngeblogging-app-v224-data-reauth-20260803";',
    'const DATA_REAUTH_COMPAT_CACHE_V224_V228 = "data-reauth-cache-v224";',
    'const NARA_FALLBACK_COMPAT_RELEASE_V227_V228 = "nara-fallback-model-contract-v227-20260803";',
  ];
  for (const line of compat) source = insertAfterVersion(source, line);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "studio-v228";');
  source = insertAfterVersion(source, `const STUDIO_PRODUCTION_RELEASE_V228 = "${RELEASE}";`);
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V227", "NGE_BLOGGING_UPDATE_AVAILABLE_V228");
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V226", "NGE_BLOGGING_UPDATE_AVAILABLE_V228");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v228 announces a new shell without force-navigating authenticated tabs.");
  for (const marker of [VERSION,CACHE,RELEASE,...compat]) if (!source.includes(marker.replace(/^const [^=]+=\s*"|";$/g,"")) && !source.includes(marker)) throw new Error(`V228_SW_COMPAT_MISSING:${marker}`);
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V228_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, device, runtime, css, worker, release] = await Promise.all([
    read("src/Studio.jsx"),read("src/studio-device-mode-v140.js"),read("src/studio-production-v228.js"),read("src/studio-production-v228.css"),read("public/sw.js"),read("public/release-v228.json"),
  ]);
  for (const [source, marker] of [
    [entry,"studio-production-v228.js"],[device,"V228_DESKTOP_SITE_PHYSICAL_PHONE_LOCK"],[device,'if (desktopSitePhone) return "desktop";'],[runtime,RELEASE],[runtime,"semantic-green-blueprint"],[runtime,"actual-1-to-10000"],[runtime,"camera-photo-file"],[css,'data-v228-layout-canvas="semantic-small"'],[css,'data-v228-layout-canvas="semantic-large"'],[css,'data-v228-workspace="preview-above-code"'],[css,'data-v228-workspace="code-left-preview-right"'],[css,'data-v228-attachment-menu="viewport-fixed"'],[worker,VERSION],[worker,CACHE],[worker,"native-green-layout-cache-v226"],[worker,"theme-layout-nara-cache-v225"],[worker,"data-reauth-cache-v224"],[worker,RELEASE],[release,RELEASE],
  ]) if (!source.includes(marker)) throw new Error(`V228_VERIFY_FAILED:${marker}`);
  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((item) => item.id)).size !== 100) throw new Error("V228_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || !BUILT_IN_WIDGETS.some((item) => item.id === "custom-html")) throw new Error("V228_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V228_DESTRUCTIVE_SESSION_ACTION");
}

await patchDeviceModeSource();
await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);