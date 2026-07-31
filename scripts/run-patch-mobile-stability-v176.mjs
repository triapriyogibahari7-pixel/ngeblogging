import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE = "mobile-stability-v176-20260731";
const WORKER_RELEASE = "2026.07.31-mobile-stability-v176";
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch v176 gagal: ${label} tidak ditemukan.`);
  return source.replace(search, replacement);
}

function patchEntry() {
  const file = "src/main.jsx";
  let source = read(file);
  if (source.includes('import "./mobile-stability-v176.js";')) return;
  source = replaceRequired(
    source,
    'import "./mobile-interaction-v174.js";',
    'import "./mobile-interaction-v174.js";\nimport "./mobile-stability-v176.js";',
    "import mobile v174",
  );
  write(file, source);
}

function patchDeviceDetector() {
  const file = "src/studio-device-mode-v140.js";
  let source = read(file);
  if (source.includes('const LAYOUT_STABILITY_RELEASE = "studio-layout-stability-v176-20260731";')) return;

  source = replaceRequired(
    source,
    'const RESPONSIVE_MODES = Object.freeze([',
    'const LAYOUT_STABILITY_RELEASE = "studio-layout-stability-v176-20260731";\nconst RESPONSIVE_MODES = Object.freeze([',
    "marker responsive modes",
  );
  source = replaceRequired(
    source,
    '    effectiveWidth: Math.min(layoutWidth, visualWidth),',
    '    // Layout mode must not jump when the Android address bar, keyboard, pinch zoom,\n    // or visualViewport changes. CSS layout follows the stable layout viewport.\n    effectiveWidth: layoutWidth,',
    "effective width visual viewport",
  );
  source = replaceRequired(
    source,
    '  root.dataset.studioDeviceLegacyRelease = LEGACY_RELEASE;',
    '  root.dataset.studioDeviceLegacyRelease = LEGACY_RELEASE;\n  root.dataset.studioLayoutStabilityV176 = LAYOUT_STABILITY_RELEASE;',
    "root stability marker",
  );
  source = replaceRequired(
    source,
    '  RESPONSIVE_MODES,\n};',
    '  RESPONSIVE_MODES,\n  LAYOUT_STABILITY_RELEASE,\n};',
    "export stability marker",
  );
  write(file, source);
}

function patchServiceWorker() {
  const file = "public/sw.js";
  let source = read(file);
  if (source.includes('const VERSION = "ngeblogging-app-v176-mobile-stability-20260731";')) return;

  source = replaceRequired(
    source,
    'const VERSION = "ngeblogging-app-v174-mobile-interaction-20260731";',
    'const VERSION = "ngeblogging-app-v176-mobile-stability-20260731";\nconst MOBILE_INTERACTION_COMPAT_VERSION = "ngeblogging-app-v174-mobile-interaction-20260731";',
    "versi v174",
  );
  source = replaceRequired(
    source,
    'const CACHE_RELEASE = "mobile-interaction-cache-v174";',
    'const CACHE_RELEASE = "mobile-stability-cache-v176";\nconst MOBILE_INTERACTION_COMPAT_RELEASE = "mobile-interaction-cache-v174";',
    "cache v174",
  );
  source = replaceRequired(
    source,
    'const FORCE_REFRESH_VALUE = "mobile-interaction-v174";',
    'const FORCE_REFRESH_VALUE = "mobile-stability-v176";\nconst MOBILE_INTERACTION_COMPAT_FORCE_REFRESH = "mobile-interaction-v174";',
    "refresh v174",
  );
  source = source.replaceAll("NGE_BLOGGING_FORCE_RELOAD_V174", "NGE_BLOGGING_FORCE_RELOAD_V176");
  source = source.replaceAll("service-worker-stale-shell-v174", "service-worker-stale-shell-v176");
  source = source.replaceAll("service-worker-activated-mobile-interaction-v174", "service-worker-activated-mobile-stability-v176");
  source = replaceRequired(
    source,
    '    mobileInteractionRelease: "mobile-interaction-v174-20260731",',
    '    mobileInteractionRelease: "mobile-interaction-v174-20260731",\n    mobileStabilityRelease: "mobile-stability-v176-20260731",\n    mobileInteractionCompatVersion: MOBILE_INTERACTION_COMPAT_VERSION,\n    mobileInteractionCompatRelease: MOBILE_INTERACTION_COMPAT_RELEASE,\n    mobileInteractionCompatForceRefresh: MOBILE_INTERACTION_COMPAT_FORCE_REFRESH,\n    mobileStabilityCompatibility: ["NGE_BLOGGING_FORCE_RELOAD_V174", "service-worker-stale-shell-v174", "service-worker-activated-mobile-interaction-v174"],',
    "payload v174",
  );
  write(file, source);
}

function patchWorker() {
  const file = "cloudflare/worker-v69.mjs";
  let source = read(file);
  if (source.includes(`export const MOBILE_STABILITY_RELEASE = "${WORKER_RELEASE}";`)) return;

  source = replaceRequired(
    source,
    'export const PRODUCTION_CUSTOM_DOMAIN_RELEASE = "2026.07.30-production-custom-domain-v172";',
    `export const PRODUCTION_CUSTOM_DOMAIN_RELEASE = "2026.07.30-production-custom-domain-v172";\nexport const MOBILE_STABILITY_RELEASE = "${WORKER_RELEASE}";`,
    "worker release v172",
  );
  source = replaceRequired(
    source,
    '  "/release-v172.json",\n]);',
    '  "/release-v172.json",\n  "/release-v176.json",\n]);',
    "worker release paths",
  );
  source = replaceRequired(
    source,
    '    mobilePublicRelease: "mobile-public-v171-20260730",',
    '    mobilePublicRelease: "mobile-public-v171-20260730",\n    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,',
    "worker release body",
  );
  source = replaceRequired(
    source,
    '      "x-ngeblogging-mobile-public": "mobile-public-v171-20260730",',
    '      "x-ngeblogging-mobile-public": "mobile-public-v171-20260730",\n      "x-ngeblogging-mobile-stability": MOBILE_STABILITY_RELEASE,',
    "worker release header",
  );
  source = replaceRequired(
    source,
    '    && html.includes("ngeblogging-mobile-public-v171")',
    '    && html.includes("ngeblogging-mobile-public-v171")\n    && html.includes("ngeblogging-mobile-stability-v176")',
    "worker injected marker condition",
  );
  source = replaceRequired(
    source,
    '    \'<meta name="ngeblogging-mobile-public-v171" content="mobile-public-v171-20260730"/>\',',
    '    \'<meta name="ngeblogging-mobile-public-v171" content="mobile-public-v171-20260730"/>\',\n    `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}"/>`,',
    "worker injected marker",
  );
  source = source.replaceAll(
    '  headers.set("x-ngeblogging-mobile-public", "mobile-public-v171-20260730");',
    '  headers.set("x-ngeblogging-mobile-public", "mobile-public-v171-20260730");\n  headers.set("x-ngeblogging-mobile-stability", MOBILE_STABILITY_RELEASE);',
  );
  write(file, source);
}

function patchNetlify() {
  const file = "scripts/write-netlify-redirects.mjs";
  let source = read(file);
  if (source.includes(`const MOBILE_STABILITY_RELEASE = "${WORKER_RELEASE}";`)) return;

  source = replaceRequired(
    source,
    'const PRODUCTION_DOMAIN_ATTACH_RELEASE = "2026.07.30-production-domain-attach-v165";',
    `const PRODUCTION_DOMAIN_ATTACH_RELEASE = "2026.07.30-production-domain-attach-v165";\nconst MOBILE_STABILITY_RELEASE = "${WORKER_RELEASE}";`,
    "netlify release constants",
  );
  source = replaceRequired(
    source,
    '  X-Ngeblogging-Domain-Attach: ${PRODUCTION_DOMAIN_ATTACH_RELEASE}',
    '  X-Ngeblogging-Domain-Attach: ${PRODUCTION_DOMAIN_ATTACH_RELEASE}\n  X-Ngeblogging-Mobile-Stability: ${MOBILE_STABILITY_RELEASE}',
    "netlify global header",
  );
  source = replaceRequired(
    source,
    '/release-v165.json\n  Cache-Control: no-store, max-age=0\n`,',
    '/release-v165.json\n  Cache-Control: no-store, max-age=0\n/release-v176.json\n  Cache-Control: no-store, max-age=0\n`,',
    "netlify release header path",
  );
  source = replaceRequired(
    source,
    '    productionDomainAttachRelease: PRODUCTION_DOMAIN_ATTACH_RELEASE,',
    '    productionDomainAttachRelease: PRODUCTION_DOMAIN_ATTACH_RELEASE,\n    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,',
    "netlify release body",
  );
  source = replaceRequired(
    source,
    '    || !html.includes(\'name="ngeblogging-auth-callback-singleflight-v162"\')',
    '    || !html.includes(\'name="ngeblogging-auth-callback-singleflight-v162"\')\n    || !html.includes(\'name="ngeblogging-mobile-stability-v176"\')',
    "netlify marker condition",
  );
  source = replaceRequired(
    source,
    '      `<meta name="ngeblogging-production-domain-attach-v165" content="${PRODUCTION_DOMAIN_ATTACH_RELEASE}">`,',
    '      `<meta name="ngeblogging-production-domain-attach-v165" content="${PRODUCTION_DOMAIN_ATTACH_RELEASE}">`,\n      `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}">`,',
    "netlify marker",
  );
  write(file, source);
}

function verify() {
  const checks = [
    ["src/main.jsx", 'import "./mobile-stability-v176.js";'],
    ["src/mobile-stability-v176.js", RELEASE],
    ["src/mobile-stability-v176.css", "--v176-drawer-z:2147483300"],
    ["src/mobile-stability-v176.css", "left:var(--v176-drawer-width)!important"],
    ["src/mobile-stability-v176.css", ".nara-floating-button"],
    ["src/studio-device-mode-v140.js", "studio-layout-stability-v176-20260731"],
    ["src/studio-device-mode-v140.js", "effectiveWidth: layoutWidth"],
    ["public/sw.js", "ngeblogging-app-v176-mobile-stability-20260731"],
    ["public/sw.js", "mobile-stability-cache-v176"],
    ["public/sw.js", 'url.pathname === "/login"'],
    ["public/sw.js", 'url.pathname.startsWith("/auth/")'],
    ["cloudflare/worker-v69.mjs", '"/release-v176.json"'],
    ["cloudflare/worker-v69.mjs", "x-ngeblogging-mobile-stability"],
    ["scripts/write-netlify-redirects.mjs", "/release-v176.json"],
    ["scripts/write-netlify-redirects.mjs", "X-Ngeblogging-Mobile-Stability"],
  ];
  const missing = checks.filter(([file, marker]) => !read(file).includes(marker));
  if (missing.length) throw new Error(`Patch v176 tidak lengkap: ${missing.map(([file, marker]) => `${file}:${marker}`).join(", ")}`);
}

patchEntry();
patchDeviceDetector();
patchServiceWorker();
patchWorker();
patchNetlify();
verify();
console.log(`[${RELEASE}] patch applied exactly once and verified`);
