import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v216-20260802";
const VERSION = "ngeblogging-app-v216-theme-nara-layout-route-20260802";
const CACHE = "theme-nara-layout-route-cache-v216";
const FORCE = "studio-v216";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V216_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v216.js";')) {
    const anchors = [
      'import "./studio-production-v214-profile.js";',
      'import "./studio-production-v214.js";',
      'import "./studio-production-v213.js";',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("V216_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\nimport "./studio-production-v216.js";`);
    await write(path, source);
  }
}

async function patchNaraClose() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);
  const marker = "NARA_CLOSE_CLEANUP_V216";
  if (source.includes(marker)) return;

  // v206 already owns microphone/speech cleanup. v216 extends that proven block
  // instead of replacing it, so the patch remains idempotent after the complete
  // production chain has run.
  if (source.includes("nara-close-stops-media-v206")) {
    source = source.replace(
      "    // nara-close-stops-media-v206: release microphone and speech before closing.",
      "    // nara-close-stops-media-v206: release microphone and speech before closing.\n    // NARA_CLOSE_CLEANUP_V216: also cancel any active request before restoring the page.",
    );
    if (!source.includes("activeRequest.current?.abort?.();")) {
      const anchor = "    setAttachmentMenu(false);\n    setOpen(false);";
      if (!source.includes(anchor)) throw new Error("V216_NARA_V206_CLOSE_ANCHOR_MISSING");
      source = source.replace(
        anchor,
        "    setAttachmentMenu(false);\n    activeRequest.current?.abort?.();\n    activeRequest.current = null;\n    setOpen(false);",
      );
    }
  } else {
    const original = `  const closeNara = () => {\n    stopSpeech();\n    setOpen(false);\n  };`;
    const mediaAware = `  const closeNara = () => {\n    recognition.current?.stop?.();\n    recognition.current = null;\n    setListening(false);\n    stopSpeech();\n    setAttachmentMenu(false);\n    setOpen(false);\n  };`;
    const replacement = `  const closeNara = () => {\n    // ${marker}: closing Nara restores the page and stops device/request resources.\n    try { recognition.current?.stop?.(); } catch { /* microphone may already be stopped */ }\n    recognition.current = null;\n    setListening(false);\n    stopSpeech();\n    setAttachmentMenu(false);\n    activeRequest.current?.abort?.();\n    activeRequest.current = null;\n    setOpen(false);\n  };`;
    if (source.includes(mediaAware)) source = source.replace(mediaAware, replacement);
    else if (source.includes(original)) source = source.replace(original, replacement);
    else throw new Error("V216_NARA_CLOSE_COMPAT_ANCHOR_MISSING");
  }

  if (!source.includes(marker)) throw new Error("V216_NARA_CLOSE_MARKER_MISSING");
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V216")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_PRODUCTION_RELEASE_V216 = "${RELEASE}";\nconst STUDIO_PRODUCTION_COMPAT_VERSION_V214 = "ngeblogging-app-v214-clean-screenshot-20260802";\nconst STUDIO_PRODUCTION_COMPAT_CACHE_V214 = "clean-screenshot-cache-v214";\n`,
    );
  }
  for (const eventName of [
    "NGE_BLOGGING_UPDATE_AVAILABLE_V214",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V213",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V212",
  ]) source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V216");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v216 announces updates without forced navigation, preserving login and editor state.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V216_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, themeStudio, nara, auth, publicSite, analytics, widgets, worker, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v216.js"),
    read("src/studio-production-v216.css"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/lib/supabase.js"),
    read("src/PublicSiteNext.jsx"),
    read("src/studio-analytics-v41.js"),
    read("src/widget-system.js"),
    read("public/sw.js"),
    read("public/release-v216.json"),
  ]);

  const checks = [
    [entry, "studio-production-v216.js", "Studio v216 entry"],
    [runtime, RELEASE, "v216 runtime release"],
    [runtime, "MAX_CODE_LINES = 10000", "ten-thousand code line numbers"],
    [runtime, "preview-above-code", "physical-small Theme editor"],
    [runtime, "split-50-50", "large Theme editor"],
    [runtime, "camera-photo-file", "Nara attachment positioning"],
    [css, 'data-v216-workspace="preview-above-code"', "small Theme CSS"],
    [css, 'data-v216-workspace="split-50-50"', "large Theme CSS"],
    [css, ".v216-code-line-gutter", "code gutter CSS"],
    [css, ".sidebar-left-4", "fourth left widget CSS"],
    [css, ".sidebar-right-4", "fourth right widget CSS"],
    [css, 'data-v216-attachment-menu="camera-photo-file"', "Nara attachment menu CSS"],
    [css, 'data-v216-domain-action="horizontal-full"', "Domain horizontal action CSS"],
    [themeStudio, "Editor HTML, CSS, dan JavaScript", "Theme code editor source"],
    [themeStudio, "Tema Custom", "Theme Custom source"],
    [themeStudio, "preferredArea={widgetArea}", "area-aware Widget Studio"],
    [themeStudio, "tn-widget-custom-code-v209", "custom HTML JavaScript widget editor"],
    [nara, "NARA_CLOSE_CLEANUP_V216", "Nara close cleanup"],
    [nara, "Kamera", "Nara Camera"],
    [nara, "Foto", "Nara Photo"],
    [nara, "File teks", "Nara File"],
    [nara, "Nara Vision", "Nara models"],
    [nara, "Maksimal", "Nara intelligence"],
    [auth, "persistSession: true", "persistent auth session"],
    [auth, "autoRefreshToken: true", "auth refresh"],
    [publicSite, "PUBLIC_SITE_SINGLE_RENDER_V209", "single public-site initial render"],
    [analytics, "get_site_analytics_dashboard", "real analytics RPC"],
    [widgets, 'id: "custom-html"', "custom HTML/JS widget"],
    [worker, VERSION, "v216 SW version"],
    [worker, CACHE, "v216 SW cache"],
    [worker, RELEASE, "v216 SW marker"],
    [release, RELEASE, "v216 release metadata"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V216_VERIFY_FAILED:${label}:${marker}`);
  }

  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size !== 100) {
    throw new Error("V216_THEME_COUNT_REGRESSION");
  }
  if (WIDGET_COUNT !== 26 || !BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html")) {
    throw new Error("V216_WIDGET_COUNT_REGRESSION");
  }
  for (const areaId of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) {
    if (!LAYOUT_AREAS.some((area) => area.id === areaId)) throw new Error(`V216_LAYOUT_AREA_REGRESSION:${areaId}`);
  }

  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) {
    throw new Error("V216_DESTRUCTIVE_SESSION_ACTION");
  }
  if (/await refreshStaleWindow\(client, url\);/.test(worker)) throw new Error("V216_FORCED_NAVIGATION_REMAINS_AFTER_VERIFY");
}

await patchStudioEntry();
await patchNaraClose();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
