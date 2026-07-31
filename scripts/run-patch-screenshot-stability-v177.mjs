import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./patch-drawer-inert-v177.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE = "studio-screenshot-stability-v177-20260731";
const WORKER_RELEASE = "2026.07.31-screenshot-stability-v177";
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch v177 gagal: ${label} tidak ditemukan.`);
  return source.replace(search, replacement);
}

function patchNaraReact() {
  const file = "src/NaraAssistant.jsx";
  let source = read(file);
  if (!source.includes('data-nara-native-interaction="v177"')) {
    source = replaceRequired(
      source,
      '<button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">',
      '<button className="nara-floating-button" onClick={() => { changeSize("small"); setOpen(true); }} aria-label="Buka Nara AI Assistant">',
      "launcher membuka small",
    );
    source = replaceRequired(
      source,
      '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">',
      '<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} data-nara-native-interaction="v177" data-nara-interaction-native={size === "full" ? "modal" : "nonmodal"} aria-label="Nara AI Assistant">',
      "native modal state",
    );
    source = replaceRequired(
      source,
      '<button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />',
      '<button className="nara-assistant-backdrop" hidden={size !== "full"} aria-hidden={size !== "full"} onClick={closeNara} aria-label="Tutup Nara" />',
      "native backdrop state",
    );
    source = replaceRequired(
      source,
      '<button onClick={resetChat} title="Percakapan baru"><RotateCcw /></button>\n              <button onClick={closeNara} title="Tutup"><X /></button>',
      '<button className="nara-reset-v177" onClick={resetChat} aria-label="Percakapan baru" title="Percakapan baru"><RotateCcw /></button>\n              <button className="nara-close-v177" data-nara-close-v177="native" onClick={closeNara} aria-label="Tutup Nara AI" title="Tutup Nara AI"><X /></button>',
      "native reset dan close",
    );
  }
  write(file, source);
}

function patchServiceWorker() {
  const file = "public/sw.js";
  let source = read(file);
  if (source.includes('const VERSION = "ngeblogging-app-v177-screenshot-stability-20260731";')) return;

  source = replaceRequired(
    source,
    'const VERSION = "ngeblogging-app-v176-mobile-stability-20260731";',
    'const VERSION = "ngeblogging-app-v177-screenshot-stability-20260731";\nconst MOBILE_STABILITY_COMPAT_VERSION = "ngeblogging-app-v176-mobile-stability-20260731";',
    "service worker versi v176",
  );
  source = replaceRequired(
    source,
    'const CACHE_RELEASE = "mobile-stability-cache-v176";',
    'const CACHE_RELEASE = "screenshot-stability-cache-v177";\nconst MOBILE_STABILITY_COMPAT_RELEASE = "mobile-stability-cache-v176";',
    "service worker cache v176",
  );
  source = replaceRequired(
    source,
    'const FORCE_REFRESH_VALUE = "mobile-stability-v176";',
    'const FORCE_REFRESH_VALUE = "screenshot-stability-v177";\nconst MOBILE_STABILITY_COMPAT_FORCE_REFRESH = "mobile-stability-v176";',
    "service worker refresh v176",
  );
  source = source.replaceAll("NGE_BLOGGING_FORCE_RELOAD_V176", "NGE_BLOGGING_FORCE_RELOAD_V177");
  source = source.replaceAll("service-worker-stale-shell-v176", "service-worker-stale-shell-v177");
  source = source.replaceAll("service-worker-activated-mobile-stability-v176", "service-worker-activated-screenshot-stability-v177");
  source = replaceRequired(
    source,
    '    mobileStabilityRelease: "mobile-stability-v176-20260731",',
    '    mobileStabilityRelease: "mobile-stability-v176-20260731",\n    screenshotStabilityRelease: "studio-screenshot-stability-v177-20260731",\n    mobileStabilityCompatVersion: MOBILE_STABILITY_COMPAT_VERSION,\n    mobileStabilityCompatRelease: MOBILE_STABILITY_COMPAT_RELEASE,\n    mobileStabilityCompatForceRefresh: MOBILE_STABILITY_COMPAT_FORCE_REFRESH,\n    screenshotStabilityCompatibility: ["NGE_BLOGGING_FORCE_RELOAD_V176", "service-worker-stale-shell-v176", "service-worker-activated-mobile-stability-v176"],',
    "service worker payload v176",
  );
  write(file, source);
}

function patchWorker() {
  const file = "cloudflare/worker-v69.mjs";
  let source = read(file);
  if (source.includes(`export const SCREENSHOT_STABILITY_RELEASE = "${WORKER_RELEASE}";`)) return;

  source = replaceRequired(
    source,
    'export const MOBILE_STABILITY_RELEASE = "2026.07.31-mobile-stability-v176";',
    `export const MOBILE_STABILITY_RELEASE = "2026.07.31-mobile-stability-v176";\nexport const SCREENSHOT_STABILITY_RELEASE = "${WORKER_RELEASE}";`,
    "worker mobile v176",
  );
  source = replaceRequired(
    source,
    '  "/release-v176.json",\n]);',
    '  "/release-v176.json",\n  "/release-v177.json",\n]);',
    "worker release path v177",
  );
  source = replaceRequired(
    source,
    '    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,',
    '    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,\n    screenshotStabilityRelease: SCREENSHOT_STABILITY_RELEASE,\n    drawerInertSingleAuthority: true,\n    naraNativeNonmodal: true,',
    "worker release body v177",
  );
  source = replaceRequired(
    source,
    '      "x-ngeblogging-mobile-stability": MOBILE_STABILITY_RELEASE,',
    '      "x-ngeblogging-mobile-stability": MOBILE_STABILITY_RELEASE,\n      "x-ngeblogging-screenshot-stability": SCREENSHOT_STABILITY_RELEASE,',
    "worker release header v177",
  );
  source = replaceRequired(
    source,
    '    && html.includes("ngeblogging-mobile-stability-v176")',
    '    && html.includes("ngeblogging-mobile-stability-v176")\n    && html.includes("ngeblogging-screenshot-stability-v177")',
    "worker marker condition v177",
  );
  source = replaceRequired(
    source,
    '    `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}"/>`,',
    '    `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}"/>`,\n    `<meta name="ngeblogging-screenshot-stability-v177" content="${SCREENSHOT_STABILITY_RELEASE}"/>`,',
    "worker marker v177",
  );
  source = source.replaceAll(
    '  headers.set("x-ngeblogging-mobile-stability", MOBILE_STABILITY_RELEASE);',
    '  headers.set("x-ngeblogging-mobile-stability", MOBILE_STABILITY_RELEASE);\n  headers.set("x-ngeblogging-screenshot-stability", SCREENSHOT_STABILITY_RELEASE);',
  );
  write(file, source);
}

function patchNetlify() {
  const file = "scripts/write-netlify-redirects.mjs";
  let source = read(file);
  if (source.includes(`const SCREENSHOT_STABILITY_RELEASE = "${WORKER_RELEASE}";`)) return;

  source = replaceRequired(
    source,
    'const MOBILE_STABILITY_RELEASE = "2026.07.31-mobile-stability-v176";',
    `const MOBILE_STABILITY_RELEASE = "2026.07.31-mobile-stability-v176";\nconst SCREENSHOT_STABILITY_RELEASE = "${WORKER_RELEASE}";`,
    "netlify mobile v176",
  );
  source = replaceRequired(
    source,
    '  X-Ngeblogging-Mobile-Stability: ${MOBILE_STABILITY_RELEASE}',
    '  X-Ngeblogging-Mobile-Stability: ${MOBILE_STABILITY_RELEASE}\n  X-Ngeblogging-Screenshot-Stability: ${SCREENSHOT_STABILITY_RELEASE}',
    "netlify header v177",
  );
  source = replaceRequired(
    source,
    '/release-v176.json\n  Cache-Control: no-store, max-age=0\n`,',
    '/release-v176.json\n  Cache-Control: no-store, max-age=0\n/release-v177.json\n  Cache-Control: no-store, max-age=0\n`,',
    "netlify release path v177",
  );
  source = replaceRequired(
    source,
    '    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,',
    '    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,\n    screenshotStabilityRelease: SCREENSHOT_STABILITY_RELEASE,\n    drawerInertSingleAuthority: true,\n    naraNativeNonmodal: true,',
    "netlify release body v177",
  );
  source = replaceRequired(
    source,
    '    || !html.includes(\'name="ngeblogging-mobile-stability-v176"\')',
    '    || !html.includes(\'name="ngeblogging-mobile-stability-v176"\')\n    || !html.includes(\'name="ngeblogging-screenshot-stability-v177"\')',
    "netlify marker condition v177",
  );
  source = replaceRequired(
    source,
    '      `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}">`,',
    '      `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}">`,\n      `<meta name="ngeblogging-screenshot-stability-v177" content="${SCREENSHOT_STABILITY_RELEASE}">`,',
    "netlify marker v177",
  );
  write(file, source);
}

function verify() {
  const checks = [
    ["src/Studio.jsx", 'import "./studio-screenshot-stability-v177.js";'],
    ["src/studio-screenshot-stability-v177.js", RELEASE],
    ["src/studio-screenshot-stability-v177.css", "left:var(--sm177-drawer-width)!important"],
    ["src/studio-screenshot-stability-v177.css", "data-nara-interaction-v177=\"nonmodal\""],
    ["src/studio-platform-v160.js", 'main.removeAttribute("inert")'],
    ["src/studio-platform-v160.js", "drawerInteractionV177"],
    ["src/NaraAssistant.jsx", 'data-nara-native-interaction="v177"'],
    ["src/NaraAssistant.jsx", 'className="nara-close-v177"'],
    ["public/sw.js", "ngeblogging-app-v177-screenshot-stability-20260731"],
    ["public/sw.js", "screenshot-stability-cache-v177"],
    ["public/sw.js", 'url.pathname === "/login"'],
    ["public/sw.js", 'url.pathname.startsWith("/auth/")'],
    ["cloudflare/worker-v69.mjs", '"/release-v177.json"'],
    ["cloudflare/worker-v69.mjs", "x-ngeblogging-screenshot-stability"],
    ["scripts/write-netlify-redirects.mjs", "/release-v177.json"],
    ["scripts/write-netlify-redirects.mjs", "X-Ngeblogging-Screenshot-Stability"],
  ];
  const missing = checks.filter(([file, marker]) => !read(file).includes(marker));
  if (missing.length) throw new Error(`Patch v177 tidak lengkap: ${missing.map(([file, marker]) => `${file}:${marker}`).join(", ")}`);
}

patchNaraReact();
patchServiceWorker();
patchWorker();
patchNetlify();
verify();
console.log(`[${RELEASE}] patch applied exactly once and verified`);
