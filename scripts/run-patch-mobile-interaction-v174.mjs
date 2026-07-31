import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE = "mobile-interaction-v174-20260731";
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch v174 gagal: ${label} tidak ditemukan.`);
  return source.replace(search, replacement);
}

function patchEntry() {
  const file = "src/main.jsx";
  let source = read(file);
  if (source.includes('import "./mobile-interaction-v174.js";')) return;
  source = replaceRequired(
    source,
    'import "./theme-map-extension-v171.css";',
    'import "./theme-map-extension-v171.css";\nimport "./mobile-interaction-v174.js";',
    "import authority v171",
  );
  write(file, source);
}

function patchServiceWorker() {
  const file = "public/sw.js";
  let source = read(file);
  if (source.includes('const VERSION = "ngeblogging-app-v174-mobile-interaction-20260731";')) return;

  source = replaceRequired(
    source,
    'const VERSION = "ngeblogging-app-v171-mobile-public-20260730";',
    'const VERSION = "ngeblogging-app-v174-mobile-interaction-20260731";\nconst MOBILE_PUBLIC_COMPAT_VERSION = "ngeblogging-app-v171-mobile-public-20260730";',
    "versi v171",
  );
  source = replaceRequired(
    source,
    'const CACHE_RELEASE = "mobile-public-cache-v171";',
    'const CACHE_RELEASE = "mobile-interaction-cache-v174";\nconst MOBILE_PUBLIC_COMPAT_RELEASE = "mobile-public-cache-v171";',
    "cache v171",
  );
  source = replaceRequired(
    source,
    'const FORCE_REFRESH_VALUE = "mobile-public-v171";',
    'const FORCE_REFRESH_VALUE = "mobile-interaction-v174";\nconst MOBILE_PUBLIC_COMPAT_FORCE_REFRESH = "mobile-public-v171";',
    "refresh v171",
  );
  source = source.replaceAll("NGE_BLOGGING_FORCE_RELOAD_V171", "NGE_BLOGGING_FORCE_RELOAD_V174");
  source = source.replaceAll("service-worker-stale-shell-v171", "service-worker-stale-shell-v174");
  source = source.replaceAll("service-worker-activated-mobile-public-v171", "service-worker-activated-mobile-interaction-v174");
  source = replaceRequired(
    source,
    '    mobilePublicRelease: "mobile-public-v171-20260730",',
    '    mobilePublicRelease: "mobile-public-v171-20260730",\n    mobileInteractionRelease: "mobile-interaction-v174-20260731",\n    mobilePublicCompatVersion: MOBILE_PUBLIC_COMPAT_VERSION,\n    mobilePublicCompatRelease: MOBILE_PUBLIC_COMPAT_RELEASE,\n    mobilePublicCompatForceRefresh: MOBILE_PUBLIC_COMPAT_FORCE_REFRESH,\n    mobileInteractionCompatibility: ["NGE_BLOGGING_FORCE_RELOAD_V171", "service-worker-stale-shell-v171", "service-worker-activated-mobile-public-v171"],',
    "payload v171",
  );
  write(file, source);
}

function verify() {
  const checks = [
    ["src/main.jsx", 'import "./mobile-interaction-v174.js";'],
    ["src/mobile-interaction-v174.js", RELEASE],
    ["src/mobile-interaction-v174.css", "--v174-drawer-z:2147483000"],
    ["src/mobile-interaction-v174.css", 'justify-content:flex-start!important'],
    ["src/mobile-interaction-v174.css", '.nara-floating-button'],
    ["public/sw.js", 'ngeblogging-app-v174-mobile-interaction-20260731'],
    ["public/sw.js", 'mobile-interaction-cache-v174'],
    ["public/sw.js", 'mobilePublicCompatVersion'],
    ["public/sw.js", 'url.pathname === "/login"'],
    ["public/sw.js", 'url.pathname.startsWith("/auth/")'],
  ];
  const missing = checks.filter(([file, marker]) => !read(file).includes(marker));
  if (missing.length) {
    throw new Error(`Patch v174 tidak lengkap: ${missing.map(([file, marker]) => `${file}:${marker}`).join(", ")}`);
  }
}

patchEntry();
patchServiceWorker();
verify();
console.log(`[${RELEASE}] patch applied exactly once and verified`);
