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
const FORCE = "studio-v228";

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

  const classifierStart = source.indexOf("function classifyResponsiveMode");
  const classifierEnd = source.indexOf("function desktopVariant", classifierStart);
  const classifier = source.slice(classifierStart, classifierEnd);
  if (!classifier.includes('if (desktopSitePhone) return "desktop";')) throw new Error("V228_DESKTOP_SITE_PRIORITY_MISSING");
  await write(path, source);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const runtime = 'import "./studio-production-v228.js";';
  if (!source.includes(runtime)) {
    const anchors = [
      'import "./studio-production-v225-action-isolation.js";',
      'import "./studio-production-v225.js";',
      'import "./studio-production-v223.js";',
      'import "./studio-production-v222-code-tabs.js";',
    ];
    const anchor = anchors.find((value) => source.includes(value));
    if (!anchor) throw new Error("V228_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${runtime}`);
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  source = insertAfterVersion(source, `const STUDIO_PRODUCTION_RELEASE_V228 = "${RELEASE}";`);
  source = insertAfterVersion(source, 'const NARA_FALLBACK_COMPAT_VERSION_V227 = "nara-fallback-model-contract-v227-20260803";');
  source = insertAfterVersion(source, 'const NATIVE_GREEN_LAYOUT_COMPAT_VERSION_V226 = "ngeblogging-app-v226-native-green-layout-20260803";');
  source = insertAfterVersion(source, 'const DATA_REAUTH_COMPAT_VERSION_V224_V228 = "ngeblogging-app-v224-data-reauth-20260803";');
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V227", "NGE_BLOGGING_UPDATE_AVAILABLE_V228");
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V226", "NGE_BLOGGING_UPDATE_AVAILABLE_V228");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v228 only announces a newer shell; authenticated tabs and drafts are not force-navigated.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V228_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V228_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  await write(path, source);
}

async function verify() {
  const [entry, device, runtime, css, worker, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-device-mode-v140.js"),
    read("src/studio-production-v228.js"),
    read("src/studio-production-v228.css"),
    read("public/sw.js"),
    read("public/release-v228.json"),
  ]);

  const checks = [
    [entry, "studio-production-v228.js", "final Studio authority"],
    [device, "V228_DESKTOP_SITE_PHYSICAL_PHONE_LOCK", "desktop-site source lock"],
    [device, 'if (desktopSitePhone) return "desktop";', "desktop-site classification priority"],
    [runtime, RELEASE, "runtime release"],
    [runtime, "semantic-green-blueprint", "green map runtime"],
    [runtime, "actual-1-to-10000", "actual code gutter"],
    [runtime, "camera-photo-file", "Nara attachment contract"],
    [css, 'data-v228-layout-canvas="semantic-small"', "small semantic map"],
    [css, 'data-v228-layout-canvas="semantic-large"', "large semantic map"],
    [css, 'data-v228-workspace="preview-above-code"', "small code geometry"],
    [css, 'data-v228-workspace="code-left-preview-right"', "large code geometry"],
    [css, 'data-v228-attachment-menu="viewport-fixed"', "Nara fixed attachment menu"],
    [worker, VERSION, "service worker version"],
    [worker, CACHE, "service worker cache"],
    [worker, RELEASE, "service worker release"],
    [release, RELEASE, "release metadata"],
  ];
  for (const [source, marker, label] of checks) if (!source.includes(marker)) throw new Error(`V228_VERIFY_FAILED:${label}:${marker}`);

  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((item) => item.id)).size !== 100) throw new Error("V228_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || !BUILT_IN_WIDGETS.some((item) => item.id === "custom-html")) throw new Error("V228_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V228_DESTRUCTIVE_SESSION_ACTION");
  if (/900\s*(juta|miliar|million|billion)/i.test(release)) throw new Error("V228_UNSUPPORTED_CAPACITY_CLAIM");
}

await patchDeviceModeSource();
await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);