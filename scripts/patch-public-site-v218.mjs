import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "public-site-atomic-v218-20260802";
const VERSION = "ngeblogging-app-v218-public-single-load-20260802";
const CACHE = "public-single-load-cache-v218";
const FORCE = "public-v218";
const V216_VERSION = 'const PUBLIC_SITE_COMPAT_VERSION_V216 = "ngeblogging-app-v216-theme-nara-layout-route-20260802";';
const V216_CACHE = 'const PUBLIC_SITE_COMPAT_CACHE_V216 = "theme-nara-layout-route-cache-v216";';

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V218_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function verifyPublicAtomicBootstrap() {
  const source = await read("src/PublicSiteNext.jsx");
  const marker = source.indexOf("PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218");
  const payload = source.indexOf("const [pageRows,postPage,item]=await Promise.all", marker);
  const pages = source.indexOf("setPages(orderedPages)", payload);
  const posts = source.indexOf("setPosts(postPage.contents)", payload);
  const content = source.indexOf("setContent(item)", payload);
  const site = source.indexOf("setSite(resolved)", payload);
  if ([marker,payload,pages,posts,content,site].some((value) => value < 0)) {
    throw new Error("V218_PUBLIC_ATOMIC_BOOTSTRAP_INCOMPLETE");
  }
  if (!(site > pages && site > posts && site > content)) {
    throw new Error("V218_PUBLIC_SITE_PUBLISHED_BEFORE_PAYLOAD_READY");
  }
}

async function rotateServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  source = insertAfterVersion(source, V216_VERSION);
  source = insertAfterVersion(source, V216_CACHE);
  if (!source.includes("PUBLIC_SITE_RELEASE_V218")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const PUBLIC_SITE_RELEASE_V218 = "${RELEASE}";\n`,
    );
  }
  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V216", "NGE_BLOGGING_UPDATE_AVAILABLE_V218")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V215", "NGE_BLOGGING_UPDATE_AVAILABLE_V218");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v218 only announces a new shell; it never forces login/callback/editor navigation.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V218_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V218_DESTRUCTIVE_SESSION_ACTION_FOUND");
  }
  for (const marker of [VERSION,CACHE,RELEASE,V216_VERSION,V216_CACHE]) {
    if (!source.includes(marker)) throw new Error(`V218_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

await verifyPublicAtomicBootstrap();
await rotateServiceWorker();
console.log(`Applied ${RELEASE}; cache rotated without forced navigation or session destruction.`);
