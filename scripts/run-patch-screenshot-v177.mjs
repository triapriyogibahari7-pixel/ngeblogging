import "./patch-nara-interaction-v177.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE = "screenshot-interaction-v177-20260731";
const WORKER_RELEASE = "2026.07.31-screenshot-interaction-v177";
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch v177 gagal: ${label} tidak ditemukan.`);
  return source.replace(search, replacement);
}

function patchServiceWorker() {
  const file = "public/sw.js";
  let source = read(file);
  if (source.includes('const VERSION = "ngeblogging-app-v177-screenshot-interaction-20260731";')) return;

  source = replaceRequired(
    source,
    'const VERSION = "ngeblogging-app-v176-mobile-stability-20260731";',
    'const VERSION = "ngeblogging-app-v177-screenshot-interaction-20260731";\nconst MOBILE_STABILITY_COMPAT_VERSION = "ngeblogging-app-v176-mobile-stability-20260731";',
    "versi service worker v176",
  );
  source = replaceRequired(
    source,
    'const CACHE_RELEASE = "mobile-stability-cache-v176";',
    'const CACHE_RELEASE = "screenshot-interaction-cache-v177";\nconst MOBILE_STABILITY_COMPAT_RELEASE = "mobile-stability-cache-v176";',
    "cache service worker v176",
  );
  source = replaceRequired(
    source,
    'const FORCE_REFRESH_VALUE = "mobile-stability-v176";',
    'const FORCE_REFRESH_VALUE = "screenshot-interaction-v177";\nconst MOBILE_STABILITY_COMPAT_FORCE_REFRESH = "mobile-stability-v176";',
    "refresh service worker v176",
  );
  source = replaceRequired(
    source,
    '    mobileStabilityRelease: "mobile-stability-v176-20260731",',
    '    mobileStabilityRelease: "mobile-stability-v176-20260731",\n    screenshotInteractionRelease: "screenshot-interaction-v177-20260731",\n    mobileStabilityCompatVersion: MOBILE_STABILITY_COMPAT_VERSION,\n    mobileStabilityCompatRelease: MOBILE_STABILITY_COMPAT_RELEASE,\n    mobileStabilityCompatForceRefresh: MOBILE_STABILITY_COMPAT_FORCE_REFRESH,\n    screenshotInteractionCompatibility: ["NGE_BLOGGING_FORCE_RELOAD_V176", "service-worker-stale-shell-v176", "service-worker-activated-mobile-stability-v176"],',
    "payload kompatibilitas v176",
  );
  source = source.replaceAll("NGE_BLOGGING_FORCE_RELOAD_V176", "NGE_BLOGGING_FORCE_RELOAD_V177");
  source = source.replaceAll("service-worker-stale-shell-v176", "service-worker-stale-shell-v177");
  source = source.replaceAll("service-worker-activated-mobile-stability-v176", "service-worker-activated-screenshot-interaction-v177");
  // Pulihkan literal kompatibilitas yang ikut berubah oleh replaceAll.
  source = source.replace(
    '["NGE_BLOGGING_FORCE_RELOAD_V177", "service-worker-stale-shell-v177", "service-worker-activated-screenshot-interaction-v177"]',
    '["NGE_BLOGGING_FORCE_RELOAD_V176", "service-worker-stale-shell-v176", "service-worker-activated-mobile-stability-v176"]',
  );
  write(file, source);
}

function patchWorker() {
  const file = "cloudflare/worker-v69.mjs";
  let source = read(file);
  if (source.includes(`export const SCREENSHOT_INTERACTION_RELEASE = "${WORKER_RELEASE}";`)) return;

  source = replaceRequired(
    source,
    'export const MOBILE_STABILITY_RELEASE = "2026.07.31-mobile-stability-v176";',
    `export const MOBILE_STABILITY_RELEASE = "2026.07.31-mobile-stability-v176";\nexport const SCREENSHOT_INTERACTION_RELEASE = "${WORKER_RELEASE}";`,
    "konstanta Worker v176",
  );
  source = replaceRequired(
    source,
    '  "/release-v176.json",\n]);',
    '  "/release-v176.json",\n  "/release-v177.json",\n]);',
    "release path Worker v176",
  );
  source = replaceRequired(
    source,
    '    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,',
    '    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,\n    screenshotInteractionRelease: SCREENSHOT_INTERACTION_RELEASE,',
    "release body Worker v176",
  );
  source = source.replaceAll(
    '      "x-ngeblogging-mobile-stability": MOBILE_STABILITY_RELEASE,',
    '      "x-ngeblogging-mobile-stability": MOBILE_STABILITY_RELEASE,\n      "x-ngeblogging-screenshot-interaction": SCREENSHOT_INTERACTION_RELEASE,',
  );
  source = source.replaceAll(
    '  headers.set("x-ngeblogging-mobile-stability", MOBILE_STABILITY_RELEASE);',
    '  headers.set("x-ngeblogging-mobile-stability", MOBILE_STABILITY_RELEASE);\n  headers.set("x-ngeblogging-screenshot-interaction", SCREENSHOT_INTERACTION_RELEASE);',
  );
  source = replaceRequired(
    source,
    '    && html.includes("ngeblogging-mobile-stability-v176")',
    '    && html.includes("ngeblogging-mobile-stability-v176")\n    && html.includes("ngeblogging-screenshot-interaction-v177")',
    "kondisi marker Worker v176",
  );
  source = replaceRequired(
    source,
    '    `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}"/>`,',
    '    `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}"/>`,\n    `<meta name="ngeblogging-screenshot-interaction-v177" content="${SCREENSHOT_INTERACTION_RELEASE}"/>`,',
    "marker Worker v176",
  );
  write(file, source);
}

function patchNetlify() {
  const file = "scripts/write-netlify-redirects.mjs";
  let source = read(file);
  if (source.includes(`const SCREENSHOT_INTERACTION_RELEASE = "${WORKER_RELEASE}";`)) return;

  source = replaceRequired(
    source,
    'const MOBILE_STABILITY_RELEASE = "2026.07.31-mobile-stability-v176";',
    `const MOBILE_STABILITY_RELEASE = "2026.07.31-mobile-stability-v176";\nconst SCREENSHOT_INTERACTION_RELEASE = "${WORKER_RELEASE}";`,
    "konstanta Netlify v176",
  );
  source = replaceRequired(
    source,
    '  X-Ngeblogging-Mobile-Stability: ${MOBILE_STABILITY_RELEASE}',
    '  X-Ngeblogging-Mobile-Stability: ${MOBILE_STABILITY_RELEASE}\n  X-Ngeblogging-Screenshot-Interaction: ${SCREENSHOT_INTERACTION_RELEASE}',
    "header Netlify v176",
  );
  source = replaceRequired(
    source,
    '/release-v176.json\n  Cache-Control: no-store, max-age=0\n`,',
    '/release-v176.json\n  Cache-Control: no-store, max-age=0\n/release-v177.json\n  Cache-Control: no-store, max-age=0\n`,',
    "release header Netlify v176",
  );
  source = replaceRequired(
    source,
    '    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,',
    '    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,\n    screenshotInteractionRelease: SCREENSHOT_INTERACTION_RELEASE,',
    "release body Netlify v176",
  );
  source = replaceRequired(
    source,
    '    || !html.includes(\'name="ngeblogging-mobile-stability-v176"\')',
    '    || !html.includes(\'name="ngeblogging-mobile-stability-v176"\')\n    || !html.includes(\'name="ngeblogging-screenshot-interaction-v177"\')',
    "kondisi marker Netlify v176",
  );
  source = replaceRequired(
    source,
    '      `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}">`,',
    '      `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}">`,\n      `<meta name="ngeblogging-screenshot-interaction-v177" content="${SCREENSHOT_INTERACTION_RELEASE}">`,',
    "marker Netlify v176",
  );
  write(file, source);
}

function verify() {
  const checks = [
    ["src/Studio.jsx", 'import "./studio-screenshot-fix-v177.js";'],
    ["src/studio-screenshot-fix-v177.js", "studio-screenshot-fix-v177-20260731"],
    ["src/studio-screenshot-fix-v177.css", "left:var(--sm177-drawer-width)!important"],
    ["src/studio-screenshot-fix-v177.css", 'data-nara-interaction-v177="nonmodal"'],
    ["src/NaraAssistant.jsx", "data-nara-interaction-v177"],
    ["src/NaraAssistant.jsx", "nara-close-v177"],
    ["public/sw.js", "ngeblogging-app-v177-screenshot-interaction-20260731"],
    ["public/sw.js", "screenshot-interaction-cache-v177"],
    ["public/sw.js", 'url.pathname === "/login"'],
    ["public/sw.js", 'url.pathname.startsWith("/auth/")'],
    ["cloudflare/worker-v69.mjs", '"/release-v177.json"'],
    ["cloudflare/worker-v69.mjs", "x-ngeblogging-screenshot-interaction"],
    ["scripts/write-netlify-redirects.mjs", "/release-v177.json"],
    ["scripts/write-netlify-redirects.mjs", "X-Ngeblogging-Screenshot-Interaction"],
  ];
  const missing = checks.filter(([file, marker]) => !read(file).includes(marker));
  if (missing.length) throw new Error(`Patch v177 tidak lengkap: ${missing.map(([file, marker]) => `${file}:${marker}`).join(", ")}`);
}

patchServiceWorker();
patchWorker();
patchNetlify();
verify();
console.log(`[${RELEASE}] screenshot interaction patch applied exactly once and verified`);
