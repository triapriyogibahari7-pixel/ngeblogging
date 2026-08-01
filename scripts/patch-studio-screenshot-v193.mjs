import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-screenshot-recovery-v193-20260801";
const VERSION = "ngeblogging-app-v193-screenshot-recovery-20260801";
const CACHE = "screenshot-recovery-cache-v193";

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-screenshot-recovery-v193.js";')) {
    const anchor = 'import "./studio-screenshot-recovery-v191-hotfix.css";';
    if (!source.includes(anchor)) throw new Error("V193_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\nimport "./studio-screenshot-recovery-v193.js";`);
    await write(path, source);
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "screenshot-recovery-v193";');
  if (!source.includes("SCREENSHOT_RECOVERY_RELEASE_V193")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const SCREENSHOT_RECOVERY_RELEASE_V193 = "${RELEASE}";\n`,
    );
  }
  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V192", "NGE_BLOGGING_UPDATE_AVAILABLE_V193")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V191", "NGE_BLOGGING_UPDATE_AVAILABLE_V193")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v193 announces the update without forcing navigation or disturbing auth/editor state.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V193_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V193_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-screenshot-recovery-v193.js"],
    ["src/studio-screenshot-recovery-v193.js", RELEASE],
    ["src/studio-screenshot-recovery-v193.js", "recoverThemeStudioV193"],
    ["src/studio-screenshot-recovery-v193.js", "recoverDrawerV193"],
    ["src/studio-screenshot-recovery-v193.js", "recoverNaraV193"],
    ["src/studio-screenshot-recovery-v193.css", 'data-studio-physical-mobile-v193="true"'],
    ["src/studio-screenshot-recovery-v193.css", ".tn-library>header"],
    ["src/studio-screenshot-recovery-v193.css", ".tn-layout-canvas-v170"],
    ["src/studio-screenshot-recovery-v193.css", '.nara-assistant-layer[aria-modal="false"]'],
    ["src/studio-screenshot-recovery-v193.css", ".sn-mobile-menu-mark>strong"],
    ["src/lib/supabase.js", "persistSession: true"],
    ["src/lib/supabase.js", "autoRefreshToken: true"],
    ["src/StudioOnboardingGate.jsx", "listUserSitesDirectV192"],
    ["src/lib/auth-callback-v162.js", "recovered-provider-replay-v192"],
    ["public/release-v193.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V193_VERIFY_FAILED:${path}:${marker}`);
  }

  const runtime = await read("src/studio-screenshot-recovery-v193.js");
  if (/setImportant\(appRoot,\s*"zoom",\s*String\(/.test(runtime)) throw new Error("V193_ROOT_ZOOM_SCALE_REINTRODUCED");
  if (/setImportant\(appRoot,\s*"transform",\s*`scale\(/.test(runtime)) throw new Error("V193_ROOT_TRANSFORM_SCALE_REINTRODUCED");

  const css = await read("src/studio-screenshot-recovery-v193.css");
  for (const marker of [
    "position:static !important",
    "overflow-wrap:anywhere !important",
    "background:transparent !important",
    "pointer-events:none !important",
    "grid-template-columns:minmax(0,1fr) !important",
  ]) {
    if (!css.includes(marker)) throw new Error(`V193_CSS_CONTRACT_MISSING:${marker}`);
  }
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
