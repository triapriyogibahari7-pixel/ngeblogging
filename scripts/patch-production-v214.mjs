import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v214-20260802";
const VERSION = "ngeblogging-app-v214-six-mode-profile-layout-20260802";
const CACHE = "six-mode-profile-layout-cache-v214";
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
    await write(path, source);
  }
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
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v214 announces an update without forced navigation or session destruction.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V214_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function patchProductionMetadata() {
  const path = "wrangler.production.jsonc";
  let source = await read(path);
  source = source.replace('"PRODUCTION_UI_RELEASE": "2026.08.02-studio-production-v202"', '"PRODUCTION_UI_RELEASE": "2026.08.02-studio-production-v214"');
  source = source.replace('"CURRENT_STUDIO_UI_RELEASE": "studio-production-v202-20260802"', '"CURRENT_STUDIO_UI_RELEASE": "studio-production-v214-20260802"');
  await write(path, source);
}

async function verify() {
  const [entry, studioNext, runtime, css, sw, release, device, theme, nara, auth, publicSite, production] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/StudioNext.jsx"),
    read("src/studio-production-v214.js"),
    read("src/studio-production-v214.css"),
    read("public/sw.js"),
    read("public/release-v214.json"),
    read("src/studio-device-mode-v140.js"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/lib/supabase.js"),
    read("src/PublicSiteNext.jsx"),
    read("wrangler.production.jsonc"),
  ]);
  const checks = [
    [entry, "studio-production-v214.js", "Studio v214 import"],
    [studioNext, "sn-profile-menu-wrap", "profile dropdown"],
    [studioNext, "function ProfileView", "separate Profile view"],
    [studioNext, "function SiteSettingsView", "separate Settings view"],
    [runtime, RELEASE, "v214 runtime"],
    [runtime, "RESPONSIVE_MODES", "six-mode runtime"],
    [runtime, "v214LockedContent", "locked Post/Page area"],
    [css, 'data-studio-v214-mode="application"', "application mode CSS"],
    [css, 'data-studio-v214-mode="phone"', "phone mode CSS"],
    [css, 'data-studio-v214-mode="mobile"', "mobile mode CSS"],
    [css, 'data-studio-v214-mode="compact"', "compact mode CSS"],
    [css, 'data-studio-v214-mode="tablet"', "tablet mode CSS"],
    [css, 'data-studio-v214-mode="desktop"', "desktop mode CSS"],
    [css, 'data-studio-v214-variant="laptop"', "laptop variant CSS"],
    [css, 'data-studio-v214-variant="computer"', "computer variant CSS"],
    [device, '"application"', "application detector"],
    [device, '"phone"', "phone detector"],
    [device, '"mobile"', "mobile detector"],
    [device, '"compact"', "compact detector"],
    [device, '"tablet"', "tablet detector"],
    [device, '"desktop"', "desktop detector"],
    [theme, "PREVIEW LANGSUNG", "Theme live preview"],
    [nara, 'aria-controls="nara-attachment-menu-v211"', "Nara attachment trigger"],
    [auth, "persistSession: true", "persistent auth session"],
    [auth, "autoRefreshToken: true", "automatic auth refresh"],
    [publicSite, "PUBLIC_SITE_SINGLE_RENDER_V209", "single public render"],
    [sw, VERSION, "v214 service worker version"],
    [sw, CACHE, "v214 service worker cache"],
    [sw, RELEASE, "v214 service worker marker"],
    [release, RELEASE, "v214 release metadata"],
    [production, "studio-production-v214-20260802", "production UI metadata"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V214_VERIFY_FAILED:${label}:${marker}`);
  }
  for (const source of [runtime]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V214_DESTRUCTIVE_SESSION_ACTION");
  }
}

await import("./patch-production-v214-profile.mjs");
await patchStudioEntry();
await patchServiceWorker();
await patchProductionMetadata();
await verify();
console.log(`Applied ${RELEASE}`);
