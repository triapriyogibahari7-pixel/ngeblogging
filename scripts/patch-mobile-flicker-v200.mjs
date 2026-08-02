import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const write = (path, value) => writeFile(new URL(path, root), value);

const RELEASE = "studio-mobile-flicker-v200-20260802";
const VERSION = "ngeblogging-app-v200-mobile-flicker-20260802";
const CACHE = "mobile-flicker-cache-v200";

async function stopLegacyObserverSelfLoop() {
  const path = "src/studio-screenshot-recovery-v193.js";
  let source = await read(path);
  const before = `  attributeFilter: [
    "class", "hidden", "inert", "aria-hidden", "data-nara-size",
    "data-studio-responsive-mode", "data-studio-handheld", "data-studio-physical-mobile-v191",
  ],`;
  const after = `  /* v200: do not observe hidden/inert/aria-hidden. v193 itself writes those
     attributes while normalizing drawer/Nara state; observing the same writes
     created a requestAnimationFrame mutation/repaint loop on real phones. */
  attributeFilter: [
    "class", "data-nara-size",
    "data-studio-responsive-mode", "data-studio-handheld", "data-studio-physical-mobile-v191",
  ],`;
  if (!source.includes("v200: do not observe hidden/inert/aria-hidden")) {
    if (!source.includes(before)) throw new Error("V200_V193_OBSERVER_ANCHOR_MISSING");
    source = source.replace(before, after);
  }
  const observerIndex = source.indexOf("new MutationObserver(scheduleV193)");
  const observerTail = observerIndex >= 0 ? source.slice(observerIndex, source.indexOf("});", observerIndex) + 3) : "";
  if (!observerTail || /"hidden"|"inert"|"aria-hidden"/.test(observerTail)) {
    throw new Error("V200_V193_SELF_OBSERVED_ATTRIBUTES_REMAIN");
  }
  await write(path, source);
}

async function rotateServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "mobile-flicker-v200";');
  if (!source.includes("MOBILE_FLICKER_RELEASE_V200")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const MOBILE_FLICKER_RELEASE_V200 = "${RELEASE}";\n`);
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V199", "NGE_BLOGGING_UPDATE_AVAILABLE_V200");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v200: announce new shell; never force navigation during auth/editor work.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V200_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V200_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-mobile-flicker-v200.js"],
    ["src/studio-mobile-flicker-v200.js", RELEASE],
    ["src/studio-mobile-flicker-v200.css", ".sn-api-list > header"],
    ["src/studio-mobile-flicker-v200.css", ".nara-assistant-shell[data-nara-size=\"small\"]"],
    ["src/studio-screenshot-recovery-v193.js", "v200: do not observe hidden/inert/aria-hidden"],
    ["public/release-v200.json", RELEASE],
    ["public/sw.js", VERSION],
    ["public/sw.js", CACHE],
    ["public/sw.js", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V200_VERIFY_FAILED:${path}:${marker}`);
  }

  const supabase = await read("src/lib/supabase.js");
  for (const marker of ["persistSession: true", "autoRefreshToken: true"]) {
    if (!supabase.includes(marker)) throw new Error(`V200_AUTH_CONTINUITY_MISSING:${marker}`);
  }
}

await stopLegacyObserverSelfLoop();
await rotateServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
