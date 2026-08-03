import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-real-device-v236-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v236-real-device-20260803";
const ACTIVE_CACHE = "real-device-cache-v236";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V236_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  for (const line of [
    `const ACTIVE_VERSION_V236 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V236 = "${ACTIVE_CACHE}";`,
    `const STUDIO_REAL_DEVICE_RELEASE_V236 = "${RELEASE}";`,
  ]) source = insertAfterVersion(source, line);

  const oldShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V235}-${ACTIVE_CACHE_RELEASE_V235}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const nextShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V236}-${ACTIVE_CACHE_RELEASE_V236}-${AUTH_HANDOFF_RELEASE}-shell`;';
  if (!source.includes(nextShell)) {
    if (!source.includes(oldShell)) throw new Error("V236_SHELL_V235_ANCHOR_MISSING");
    source = source.replace(oldShell, nextShell);
  }
  const oldAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V235}-${ACTIVE_CACHE_RELEASE_V235}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const nextAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V236}-${ACTIVE_CACHE_RELEASE_V236}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(nextAsset)) {
    if (!source.includes(oldAsset)) throw new Error("V236_ASSET_V235_ANCHOR_MISSING");
    source = source.replace(oldAsset, nextAsset);
  }

  source = source
    .replace("    version: ACTIVE_VERSION_V235,", "    version: ACTIVE_VERSION_V236,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V235,", "    release: ACTIVE_CACHE_RELEASE_V236,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V235", "NGE_BLOGGING_UPDATE_AVAILABLE_V236")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v236 announces a fresh shell without forced navigation, storage clearing, or logout.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V236_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V236_DESTRUCTIVE_SW_ACTION");
  for (const marker of [ACTIVE_VERSION, ACTIVE_CACHE, RELEASE, nextShell, nextAsset]) {
    if (!source.includes(marker)) throw new Error(`V236_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, release, auth, editor, nara, widgets] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-real-device-v236.js"),
    read("src/studio-real-device-v236.css"),
    read("public/release-v236.json"),
    read("src/lib/supabase.js"),
    read("src/ContentEditor.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/widget-system.js"),
  ]);
  const checks = [
    [entry, "studio-production-v235-widget-target.js"],
    [entry, "studio-real-device-v236.js"],
    [runtime, RELEASE],
    [runtime, "+ Tambahkan situs"],
    [runtime, "v236DomainAction"],
    [css, 'data-v236-family="small"'],
    [css, "preview-publish-visible"],
    [css, "v235-nara-attachment-portal"],
    [release, RELEASE],
    [auth, "persistSession: true"],
    [auth, "autoRefreshToken: true"],
    [editor, "Preview"],
    [editor, "Terbitkan"],
    [nara, "Kamera"],
    [nara, "Foto"],
    [nara, "File teks"],
    [widgets, 'id: "custom-html"'],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V236_VERIFY_FAILED:${marker}`);
  if (entry.indexOf("studio-real-device-v236.js") < entry.indexOf("studio-production-v235-widget-target.js")) throw new Error("V236_ENTRY_NOT_FINAL");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V236_DESTRUCTIVE_RUNTIME_ACTION");
}

await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}; v235 interaction authority and v233 session/data recovery remain preserved.`);
