import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-physical-shell-v259-20260804";
export const VERSION = "ngeblogging-app-v259-physical-shell-20260804";
export const CACHE = "studio-physical-shell-cache-v259";

export function rotateServiceWorkerV259(target = resolve("dist", "sw.js")) {
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V259_ROTATE_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  for (const required of ["ACTIVE_VERSION_V258", "ACTIVE_CACHE_RELEASE_V258", "AUTH_HANDOFF_RELEASE"]) {
    if (!source.includes(required)) throw new Error(`V259_ROTATE_REQUIRES_V258:${required}`);
  }

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V259_ROTATE_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V259 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V259 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_PHYSICAL_SHELL_RELEASE_V259 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V259}-${ACTIVE_CACHE_RELEASE_V259}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V259}-${ACTIVE_CACHE_RELEASE_V259}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V258", "NGE_BLOGGING_UPDATE_AVAILABLE_V259")
    .replaceAll("service-worker-activated-theme-right4-v258", "service-worker-activated-physical-shell-v259");

  if (source.includes("function versionPayload(type)") && !source.includes("studioPhysicalShellReleaseV259:")) {
    source = source.replace(
      /(function versionPayload\(type\) \{[\s\S]*?return \{)/,
      "$1\n    studioPhysicalShellReleaseV259: STUDIO_PHYSICAL_SHELL_RELEASE_V259,",
    );
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V259}-${ACTIVE_CACHE_RELEASE_V259}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V259}-${ACTIVE_CACHE_RELEASE_V259}-${AUTH_HANDOFF_RELEASE}-assets`;',
  ]) {
    if (!source.includes(marker)) throw new Error(`V259_ROTATE_MARKER_MISSING:${marker}`);
  }

  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V259_ROTATE_DESTRUCTIVE_SESSION_ACTION");
  }

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
