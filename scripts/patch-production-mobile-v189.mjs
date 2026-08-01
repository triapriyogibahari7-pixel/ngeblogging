import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-mobile-v189-20260801";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V189_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  source = replaceOnce(
    source,
    'import "./studio-physical-mobile-v188.js";',
    'import "./studio-physical-mobile-v188.js";\nimport "./studio-production-mobile-v189.js";',
    "STUDIO_ENTRY",
  );
  if (!source.includes('import "./studio-production-mobile-v189-account.js";')) {
    source = replaceOnce(
      source,
      'import "./studio-production-mobile-v189.js";',
      'import "./studio-production-mobile-v189.js";\nimport "./studio-production-mobile-v189-account.js";',
      "ACCOUNT_ENTRY",
    );
  }
  if (!source.includes('import "./studio-production-mobile-v189-fix.css";')) {
    source = replaceOnce(
      source,
      'import "./studio-production-mobile-v189-account.js";',
      'import "./studio-production-mobile-v189-account.js";\nimport "./studio-production-mobile-v189-fix.css";',
      "NARROW_FIX_ENTRY",
    );
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v189-production-mobile-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "production-mobile-cache-v189";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "production-mobile-v189";');
  if (!source.includes("PRODUCTION_MOBILE_RELEASE_V189")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      '$1const PRODUCTION_MOBILE_RELEASE_V189 = "studio-production-mobile-v189-20260801";\n',
    );
  }
  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V188", "NGE_BLOGGING_UPDATE_AVAILABLE_V189")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V187", "NGE_BLOGGING_UPDATE_AVAILABLE_V189");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) {
    throw new Error("V189_FORCED_NAVIGATION_REMAINS");
  }
  if (/localStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V189_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-production-mobile-v189.js"],
    ["src/Studio.jsx", "studio-production-mobile-v189-account.js"],
    ["src/Studio.jsx", "studio-production-mobile-v189-fix.css"],
    ["src/studio-production-mobile-v189.js", "studio-production-mobile-v189-20260801"],
    ["src/studio-production-mobile-v189.js", "studioDesktopSiteCompensationV189"],
    ["src/studio-production-mobile-v189.js", "nara-open-v189"],
    ["src/studio-production-mobile-v189.js", "studioAccountViewV189"],
    ["src/studio-production-mobile-v189-account.js", "studio-production-mobile-v189-account-20260801"],
    ["src/studio-production-mobile-v189.css", "data-studio-desktop-site-phone-v189"],
    ["src/studio-production-mobile-v189.css", "sv124-toggle-row>input:checked+i"],
    ["src/studio-production-mobile-v189.css", ".sn-media-tools>nav"],
    ["src/studio-production-mobile-v189.css", "data-v189-nara-mode"],
    ["src/studio-production-mobile-v189-fix.css", "left: var(--v189-drawer-width)"],
    ["src/StudioNext.jsx", "studio-bootstrap-resilient-v186"],
    ["src/lib/supabase.js", "direct-fallback-v186"],
    ["src/lib/supabase.js", "direct-supabase-oauth-v186"],
    ["src/NaraAssistant.jsx", 'aria-modal={size === "full"}'],
    ["public/sw.js", "ngeblogging-app-v189-production-mobile-20260801"],
    ["public/sw.js", "production-mobile-cache-v189"],
    ["public/release-v189.json", "studio-production-mobile-v189-20260801"],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V189_VERIFY_FAILED:${path}:${marker}`);
  }

  const source = await read("src/studio-production-mobile-v189.js");
  if (source.includes('body.style.setProperty("width", `${state.physicalWidth}px`')) {
    throw new Error("V189_BODY_PHYSICAL_WIDTH_CLIP_REINTRODUCED");
  }
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
if (String(process.env.V190_DIAGNOSTIC_SKIP || "") !== "1") {
  await import("./patch-production-v190.mjs");
}
console.log(`Applied ${RELEASE}${String(process.env.V190_DIAGNOSTIC_SKIP || "") === "1" ? " diagnostic:skip-v190" : " + Studio real-device v190"}`);
