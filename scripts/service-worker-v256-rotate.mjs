import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-build-auth-v256-20260804";
export const VERSION = "ngeblogging-app-v256-build-auth-20260804";
export const CACHE = "studio-build-auth-cache-v256";

export function rotateServiceWorkerV256(target = resolve("dist", "sw.js")) {
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V256_ROTATE_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  // v256 deliberately runs only after the already-proven v253 rotator. Keep the
  // transformation narrow so historical service-worker compatibility is preserved.
  for (const required of ["ACTIVE_VERSION_V253", "ACTIVE_CACHE_RELEASE_V253", "AUTH_HANDOFF_RELEASE"]) {
    if (!source.includes(required)) throw new Error(`V256_ROTATE_REQUIRES_V253:${required}`);
  }

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V256_ROTATE_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V256 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V256 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_BUILD_AUTH_RELEASE_V256 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V256}-${ACTIVE_CACHE_RELEASE_V256}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V256}-${ACTIVE_CACHE_RELEASE_V256}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V253", "NGE_BLOGGING_UPDATE_AVAILABLE_V256")
    .replaceAll("service-worker-activated-shell-nara-v253", "service-worker-activated-build-auth-v256");

  if (source.includes("function versionPayload(type)") && !source.includes("studioBuildAuthReleaseV256:")) {
    source = source.replace(
      /(function versionPayload\(type\) \{[\s\S]*?return \{)/,
      "$1\n    studioBuildAuthReleaseV256: STUDIO_BUILD_AUTH_RELEASE_V256,",
    );
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V256}-${ACTIVE_CACHE_RELEASE_V256}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V256}-${ACTIVE_CACHE_RELEASE_V256}-${AUTH_HANDOFF_RELEASE}-assets`;',
  ]) {
    if (!source.includes(marker)) throw new Error(`V256_ROTATE_MARKER_MISSING:${marker}`);
  }

  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V256_ROTATE_DESTRUCTIVE_SESSION_ACTION");
  }

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
