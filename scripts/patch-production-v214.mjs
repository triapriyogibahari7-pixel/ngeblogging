import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v214-20260802";
const VERSION = "ngeblogging-app-v214-clean-screenshot-20260802";
const CACHE = "clean-screenshot-cache-v214";
const FORCE = "studio-v214";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V214_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v214.js";')) {
    source = replaceRequired(
      source,
      'import "./studio-production-v213.js";',
      'import "./studio-production-v213.js";\nimport "./studio-production-v214.js";',
      "Studio v213 import",
    );
  }
  if (!source.includes('import "./studio-production-v214-profile.js";')) {
    source = replaceRequired(
      source,
      'import "./studio-production-v214.js";',
      'import "./studio-production-v214.js";\nimport "./studio-production-v214-profile.js";',
      "Studio v214 runtime import",
    );
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V214")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_PRODUCTION_RELEASE_V214 = "${RELEASE}";\nconst STUDIO_PRODUCTION_COMPAT_VERSION_V213 = "ngeblogging-app-v213-analytics-layout-20260802";\nconst STUDIO_PRODUCTION_COMPAT_CACHE_V213 = "analytics-layout-cache-v213";\n`,
    );
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V213", "NGE_BLOGGING_UPDATE_AVAILABLE_V214");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v214 only announces an update; no forced navigation or auth callback interruption.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V214_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const paths = {
    entry: "src/Studio.jsx",
    runtime: "src/studio-production-v214.js",
    profile: "src/studio-production-v214-profile.js",
    profileCss: "src/studio-production-v214-profile.css",
    css: "src/studio-production-v214.css",
    shell: "src/studio-production-v214-shell.css",
    editor: "src/studio-production-v214-theme-editor.css",
    layout: "src/studio-production-v214-theme-layout.css",
    naraCss: "src/studio-production-v214-nara.css",
    operations: "src/studio-production-v214-operations.css",
    nara: "src/NaraAssistant.jsx",
    widgets: "src/widget-system.js",
    auth: "src/lib/supabase.js",
    analytics: "src/studio-analytics-v41.js",
    worker: "public/sw.js",
    release: "public/release-v214.json"
  };
  const files = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key,path]) => [key, await read(path)])));
  const checks = [
    [files.entry, "studio-production-v214.js", "Studio v214 entry"],
    [files.entry, "studio-production-v214-profile.js", "Studio profile entry"],
    [files.runtime, RELEASE, "runtime release"],
    [files.runtime, "small-paired-four-left-four-right", "small Theme layout"],
    [files.runtime, "split-50-50", "large Theme code split"],
    [files.profile, "studioAccountViewV189", "profile/settings mode"],
    [files.profile, "studio-production-v214-profile-settings-separated-20260802", "profile/settings separation release"],
    [files.profile, 'setText(title, "Profil")', "Profile title"],
    [files.profile, 'setText(title, "Pengaturan")', "Settings title"],
    [files.profile, "Simpan profil", "Profile save label"],
    [files.profile, "Simpan pengaturan", "Settings save label"],
    [files.profile, "sidebarAction(\"Keluar\")", "explicit logout action"],
    [files.profileCss, "sn-profile-dropdown-v214", "profile dropdown style"],
    [files.profileCss, 'data-studio-account-view-v189="profile"', "Profile-only surface"],
    [files.profileCss, 'data-studio-account-view-v189="settings"', "Settings-only surface"],
    [files.css, "studio-production-v214-theme.css", "CSS authority wiring"],
    [files.shell, "data-v214-sidebar", "sidebar stabilization"],
    [files.editor, "preview-above-code", "small Theme preview first"],
    [files.editor, "background:#f8fafc", "readable Theme code surface"],
    [files.layout, "sidebar-left-4", "fourth left widget area"],
    [files.layout, "sidebar-right-4", "fourth right widget area"],
    [files.naraCss, "camera-photo-file", "Nara attachment menu presentation"],
    [files.operations, "data-v214-domain-action", "Domain horizontal action"],
    [files.operations, "large-real-timeseries", "Analytics presentation"],
    [files.nara, "Kamera", "Nara camera source"],
    [files.nara, "Foto", "Nara photo source"],
    [files.nara, "File teks", "Nara file source"],
    [files.nara, "Nara Vision", "Nara model source"],
    [files.nara, "Maksimal", "Nara intelligence source"],
    [files.widgets, 'id: "custom-html"', "custom HTML JavaScript widget"],
    [files.auth, "persistSession: true", "persistent session"],
    [files.auth, "autoRefreshToken: true", "automatic refresh token"],
    [files.analytics, "get_site_analytics_dashboard", "real analytics RPC"],
    [files.worker, VERSION, "v214 service worker version"],
    [files.worker, CACHE, "v214 service worker cache"],
    [files.worker, RELEASE, "v214 service worker release marker"],
    [files.release, RELEASE, "v214 release metadata"]
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V214_VERIFY_FAILED:${label}:${marker}`);
  }
  for (const source of [files.runtime, files.profile]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V214_DESTRUCTIVE_SESSION_ACTION");
  }
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
