import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

export const RELEASE = "studio-bootstrap-resilience-v243-20260803";
export const SNAPSHOT_KEY = "ngeblogging-active-site-snapshot-v243";

const path = "src/StudioNext.jsx";
let source = await read(path);

if (!source.includes("function readActiveSiteSnapshotV186")) {
  throw new Error("V243_REQUIRES_V186_SNAPSHOT_HELPER");
}
if (!source.includes('document.documentElement.dataset.studioBootstrapV186 = "studio-bootstrap-resilient-v186"')) {
  throw new Error("V243_REQUIRES_V186_RESILIENT_BOOTSTRAP");
}

if (!source.includes("function readActiveSiteSnapshotV243")) {
  const anchor = "function publishActiveSiteV186(primary, rows, setSite, setSites, setDataMode, mode = \"cloud\") {";
  const index = source.indexOf(anchor);
  if (index < 0) throw new Error("V243_PUBLISH_V186_ANCHOR_MISSING");
  const helper = `const ACTIVE_SITE_SNAPSHOT_V243 = "${SNAPSHOT_KEY}";\n\nfunction readActiveSiteSnapshotV243(userId) {\n  try {\n    const activeId = localStorage.getItem("ngeblogging-active-site-id") || "";\n    const userBoundKeys = [\n      ACTIVE_SITE_SNAPSHOT_V243,\n      "ngeblogging-active-site-snapshot-v195",\n      "ngeblogging-active-site-snapshot-v192",\n    ];\n    for (const key of userBoundKeys) {\n      const cached = JSON.parse(localStorage.getItem(key) || "null");\n      if (!cached?.id || !cached?.slug) continue;\n      if (cached.__userId && cached.__userId !== userId) continue;\n      if (userId && !cached.__userId && key === ACTIVE_SITE_SNAPSHOT_V243) continue;\n      return cached;\n    }\n\n    // Legacy snapshots are accepted only when their id is still the explicitly\n    // selected active workspace. This prevents a previous account from being\n    // resumed merely because an old unscoped cache exists.\n    for (const key of [\n      "ngeblogging-active-site-snapshot-v186",\n      "ngeblogging-active-site-snapshot-v185",\n      "ngeblogging-active-site-snapshot-v183",\n    ]) {\n      const cached = JSON.parse(localStorage.getItem(key) || "null");\n      if (cached?.id && cached?.slug && activeId && cached.id === activeId) return cached;\n    }\n  } catch {\n    // Cache is only a continuity accelerator; RLS remains authoritative.\n  }\n  return null;\n}\n\nfunction rememberActiveSiteV243(site, userId) {\n  if (!site?.id || !site?.slug || !userId) return;\n  try {\n    localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V243, JSON.stringify({\n      ...site,\n      __userId: userId,\n      __release: "${RELEASE}",\n      __savedAt: Date.now(),\n    }));\n  } catch {\n    // Private browsing must not block Studio.\n  }\n}\n\n`;
  source = `${source.slice(0, index)}${helper}${source.slice(index)}`;
}

const cachedOld = `    const cachedAtStart = window.__ngebloggingActiveSite?.id\n      ? window.__ngebloggingActiveSite\n      : readActiveSiteSnapshotV186();`;
const cachedNew = `    const cachedAtStart = window.__ngebloggingActiveSite?.id\n      ? window.__ngebloggingActiveSite\n      : readActiveSiteSnapshotV243(user.id) || readActiveSiteSnapshotV186();`;
if (!source.includes(cachedNew)) {
  if (!source.includes(cachedOld)) throw new Error("V243_CACHED_START_ANCHOR_MISSING");
  source = source.replace(cachedOld, cachedNew);
}

const fallbackOld = `        const fallback = window.__ngebloggingActiveSite?.id\n          ? window.__ngebloggingActiveSite\n          : readActiveSiteSnapshotV186();`;
const fallbackNew = `        const fallback = window.__ngebloggingActiveSite?.id\n          ? window.__ngebloggingActiveSite\n          : readActiveSiteSnapshotV243(user.id) || readActiveSiteSnapshotV186();`;
if (!source.includes(fallbackNew)) {
  if (!source.includes(fallbackOld)) throw new Error("V243_FALLBACK_ANCHOR_MISSING");
  source = source.replace(fallbackOld, fallbackNew);
}

const publishOld = '        publishActiveSiteV186(primary, rows, setSite, setSites, setDataMode, "cloud");';
const publishNew = `${publishOld}\n        rememberActiveSiteV243(primary, user.id);\n        document.documentElement.dataset.studioBootstrapV243 = "${RELEASE}";`;
if (!source.includes("rememberActiveSiteV243(primary, user.id);")) {
  if (!source.includes(publishOld)) throw new Error("V243_CLOUD_PUBLISH_ANCHOR_MISSING");
  source = source.replace(publishOld, publishNew);
}

const cachedPublishOld = '    if (cachedAtStart) publishActiveSiteV186(cachedAtStart, [cachedAtStart], setSite, setSites, setDataMode, "local");';
const cachedPublishNew = `    if (cachedAtStart) {\n      publishActiveSiteV186(cachedAtStart, [cachedAtStart], setSite, setSites, setDataMode, "local");\n      rememberActiveSiteV243(cachedAtStart, user.id);\n      document.documentElement.dataset.studioBootstrapV243 = "cached-workspace-retained";\n    }`;
if (!source.includes('dataset.studioBootstrapV243 = "cached-workspace-retained"')) {
  if (!source.includes(cachedPublishOld)) throw new Error("V243_CACHED_PUBLISH_ANCHOR_MISSING");
  source = source.replace(cachedPublishOld, cachedPublishNew);
}

for (const marker of [
  RELEASE,
  SNAPSHOT_KEY,
  "readActiveSiteSnapshotV243(user.id)",
  "rememberActiveSiteV243(primary, user.id)",
  "cached-workspace-retained",
  "studio-bootstrap-resilient-v186",
  "window.addEventListener(\"online\", reconnect",
]) {
  if (!source.includes(marker)) throw new Error(`V243_BOOTSTRAP_CONTRACT_MISSING:${marker}`);
}

if (source.includes("getOrCreatePrimarySite")) {
  throw new Error("V243_AUTOMATIC_SITE_CREATION_REINTRODUCED");
}
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/.test(source)) {
  throw new Error("V243_DESTRUCTIVE_SESSION_ACTION");
}

await write(path, source);
console.log(`Applied ${RELEASE}: v195/v192 user-scoped snapshots now bridge into the v186 resilient Studio bootstrap.`);
