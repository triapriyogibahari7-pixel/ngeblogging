import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v224-20260803";
const VERSION = "ngeblogging-app-v224-visible-actions-cutover-20260803";
const CACHE = "visible-actions-cutover-cache-v224";
const FORCE = "studio-v224";

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const runtime = 'import "./studio-production-v224.js";';
  const isolation = 'import "./studio-production-v224-action-isolation.js";';
  if (!source.includes(runtime)) {
    const anchor = 'import "./studio-production-v223.js";';
    if (!source.includes(anchor)) throw new Error("V224_STUDIO_ENTRY_ANCHOR_MISSING");
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
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V224")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_PRODUCTION_RELEASE_V224 = "${RELEASE}";\n`);
  }
  for (const eventName of ["NGE_BLOGGING_UPDATE_AVAILABLE_V223", "NGE_BLOGGING_UPDATE_AVAILABLE_V222", "NGE_BLOGGING_UPDATE_AVAILABLE_V221"]) {
    source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V224");
  }
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v224 announces the update without navigating authenticated tabs.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V224_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V224_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  await write(path, source);
}

await patchStudioEntry();
await patchServiceWorker();
console.log("V224_DIAGNOSTIC_STAGE_2_STUDIO_AND_SW");
