import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v237-layout-stability-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v237-layout-stability-20260803";
const ACTIVE_CACHE = "layout-stability-cache-v237";
const SITE_LIMIT = 25;

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V237_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  for (const line of [
    `const ACTIVE_VERSION_V237 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V237 = "${ACTIVE_CACHE}";`,
    `const STUDIO_PRODUCTION_RELEASE_V237 = "${RELEASE}";`,
  ]) source = insertAfterVersion(source, line);

  const oldShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V236}-${ACTIVE_CACHE_RELEASE_V236}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const nextShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-shell`;';
  if (!source.includes(nextShell)) {
    if (!source.includes(oldShell)) throw new Error("V237_SHELL_V236_ANCHOR_MISSING");
    source = source.replace(oldShell, nextShell);
  }
  const oldAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V236}-${ACTIVE_CACHE_RELEASE_V236}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const nextAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V237}-${ACTIVE_CACHE_RELEASE_V237}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(nextAsset)) {
    if (!source.includes(oldAsset)) throw new Error("V237_ASSET_V236_ANCHOR_MISSING");
    source = source.replace(oldAsset, nextAsset);
  }

  source = source
    .replace("    version: ACTIVE_VERSION_V236,", "    version: ACTIVE_VERSION_V237,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V236,", "    release: ACTIVE_CACHE_RELEASE_V237,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V236", "NGE_BLOGGING_UPDATE_AVAILABLE_V237")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v237 announces the new shell without forced navigation, storage clearing, or logout.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V237_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V237_DESTRUCTIVE_SW_ACTION");
  for (const marker of [ACTIVE_VERSION, ACTIVE_CACHE, RELEASE, nextShell, nextAsset]) {
    if (!source.includes(marker)) throw new Error(`V237_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function patchSiteLimit() {
  const path = "src/lib/studio-data.js";
  let source = await read(path);
  if (!source.includes("MAX_USER_SITES_V237")) {
    const constantAnchor = 'export const ACTIVE_SITE_STORAGE_KEY = "ngeblogging-active-site-id";';
    if (!source.includes(constantAnchor)) throw new Error("V237_SITE_LIMIT_CONSTANT_ANCHOR_MISSING");
    source = source.replace(constantAnchor, `${constantAnchor}\nexport const MAX_USER_SITES_V237 = ${SITE_LIMIT};`);

    const functionAnchor = `export async function createUserSite({ userId, name, slug, description = "", blueprint = "blog" }) {\n  if (!userId) throw new Error("Akun pengguna tidak ditemukan.");\n  const client = requireCloud();`;
    const replacement = `${functionAnchor}\n  const { count: membershipCount, error: membershipCountError } = await client\n    .from("site_members")\n    .select("site_id", { count: "exact", head: true })\n    .eq("user_id", userId);\n  if (membershipCountError) throw membershipCountError;\n  if (Number(membershipCount || 0) >= MAX_USER_SITES_V237) throw new Error("Batas situs akun telah tercapai.");`;
    if (!source.includes(functionAnchor)) throw new Error("V237_CREATE_SITE_ANCHOR_MISSING");
    source = source.replace(functionAnchor, replacement);
  }
  for (const marker of ["MAX_USER_SITES_V237 = 25", 'select("site_id", { count: "exact", head: true })', "Batas situs akun telah tercapai."]) {
    if (!source.includes(marker)) throw new Error(`V237_SITE_LIMIT_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, release, auth, data, themeCatalog, themeStudio, widgets, nara, domain] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v237.js"),
    read("src/studio-production-v237.css"),
    read("public/release-v237.json"),
    read("src/lib/supabase.js"),
    read("src/lib/studio-data.js"),
    read("src/theme-catalog.js"),
    read("src/ThemeStudio.jsx"),
    read("src/widget-system.js"),
    read("src/NaraAssistant.jsx"),
    read("src/DomainPanelV124.jsx"),
  ]);

  const checks = [
    [entry, 'import "./studio-production-v237.js"'],
    [runtime, RELEASE],
    [runtime, "data.v235Family = family"],
    [runtime, "data.v236Family = family"],
    [runtime, "v237BackupCard"],
    [runtime, "v237DomainAction"],
    [runtime, "+ Tambahkan situs"],
    [runtime, "Tema Custom"],
    [runtime, "camera-photo-file"],
    [css, 'data-v237-family="small"'],
    [css, ".tn-widget-summary"],
    [css, ".sv124-free-domain"],
    [css, ".tn-code-workspace"],
    [release, RELEASE],
    [auth, "persistSession: true"],
    [auth, "autoRefreshToken: true"],
    [data, "MAX_USER_SITES_V237 = 25"],
    [themeCatalog, "const FAMILIES = ["],
    [themeCatalog, "const COMPOSITIONS = ["],
    [themeStudio, "Editor HTML, CSS, dan JavaScript"],
    [widgets, 'id: "custom-html"'],
    [nara, "Kamera"],
    [nara, "Foto"],
    [nara, "File teks"],
    [domain, "SUBDOMAIN GRATIS"],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V237_VERIFY_FAILED:${marker}`);
  if (entry.indexOf("studio-production-v237.js") < entry.indexOf("studio-real-device-v236.js")) throw new Error("V237_ENTRY_NOT_FINAL");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V237_DESTRUCTIVE_RUNTIME_ACTION");

  const familyCount = (themeCatalog.match(/\{ id:"[^"]+",name:/g) || []).length;
  const compositionBlock = themeCatalog.match(/const COMPOSITIONS = \[([\s\S]*?)\n\];/m)?.[1] || "";
  const compositionCount = (compositionBlock.match(/\{ id:/g) || []).length;
  if (familyCount < 20 || compositionCount < 5 || familyCount * compositionCount < 100) throw new Error(`V237_THEME_COUNT_INVALID:${familyCount}x${compositionCount}`);
  const widgetBlock = widgets.match(/export const BUILT_IN_WIDGETS = \[([\s\S]*?)\n\];/m)?.[1] || "";
  const widgetCount = (widgetBlock.match(/\{ id:/g) || []).length;
  if (widgetCount < 26) throw new Error(`V237_WIDGET_COUNT_INVALID:${widgetCount}`);
}

await patchServiceWorker();
await patchSiteLimit();
await verify();
console.log(`Applied ${RELEASE}; responsive family, 25-site limit, v233 session/data recovery and v235 interactions remain preserved.`);
