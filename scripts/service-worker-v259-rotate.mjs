import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-stability-v260-20260804-r2";
export const VERSION = "ngeblogging-app-v260-stability-r2-20260804";
export const CACHE = "studio-stability-cache-v260-r2";
export const LEGACY_RELEASE_V259 = "studio-six-mode-authority-v259-20260804";

export function rotateServiceWorkerV259(target = resolve("dist", "sw.js")) {
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V260_ROTATE_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  for (const required of ["ACTIVE_VERSION_V258", "ACTIVE_CACHE_RELEASE_V258", "AUTH_HANDOFF_RELEASE"]) {
    if (!source.includes(required)) throw new Error(`V260_ROTATE_REQUIRES_V258:${required}`);
  }

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V260_ROTATE_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  // Keep the v259 markers for regression compatibility, then make v260-r2 authoritative.
  insertAfterVersion('const ACTIVE_VERSION_V259 = "ngeblogging-app-v259-six-mode-authority-20260804";');
  insertAfterVersion('const ACTIVE_CACHE_RELEASE_V259 = "studio-six-mode-cache-v259";');
  insertAfterVersion(`const STUDIO_SIX_MODE_RELEASE_V259 = "${LEGACY_RELEASE_V259}";`);
  insertAfterVersion(`const ACTIVE_VERSION_V260 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V260 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_STABILITY_RELEASE_V260 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V258", "NGE_BLOGGING_UPDATE_AVAILABLE_V260")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V259", "NGE_BLOGGING_UPDATE_AVAILABLE_V260")
    .replaceAll("service-worker-activated-theme-right4-v258", "service-worker-activated-stability-v260-r2")
    .replaceAll("service-worker-activated-six-mode-v259", "service-worker-activated-stability-v260-r2")
    .replaceAll("service-worker-activated-stability-v260", "service-worker-activated-stability-v260-r2");

  if (source.includes("function versionPayload(type)") && !source.includes("studioStabilityReleaseV260:")) {
    source = source.replace(
      /(function versionPayload\(type\) \{[\s\S]*?return \{)/,
      "$1\n    studioStabilityReleaseV260: STUDIO_STABILITY_RELEASE_V260,\n    studioSixModeReleaseV259: STUDIO_SIX_MODE_RELEASE_V259,",
    );
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    LEGACY_RELEASE_V259,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${AUTH_HANDOFF_RELEASE}-assets`;',
  ]) {
    if (!source.includes(marker)) throw new Error(`V260_ROTATE_MARKER_MISSING:${marker}`);
  }

  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    // Compatibility marker: V259_ROTATE_DESTRUCTIVE_SESSION_ACTION.
    throw new Error("V260_ROTATE_DESTRUCTIVE_SESSION_ACTION");
  }

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, legacyRelease: LEGACY_RELEASE_V259, version: VERSION, cache: CACHE };
}