import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-theme-right4-v258-20260804";
export const VERSION = "ngeblogging-app-v258-theme-right4-20260804";
export const CACHE = "studio-theme-right4-cache-v258";

export function rotateServiceWorkerV258(target = resolve("dist", "sw.js")) {
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V258_ROTATE_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  for (const required of ["ACTIVE_VERSION_V257", "ACTIVE_CACHE_RELEASE_V257", "AUTH_HANDOFF_RELEASE"]) {
    if (!source.includes(required)) throw new Error(`V258_ROTATE_REQUIRES_V257:${required}`);
  }

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V258_ROTATE_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V258 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V258 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_THEME_RIGHT4_RELEASE_V258 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V258}-${ACTIVE_CACHE_RELEASE_V258}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V258}-${ACTIVE_CACHE_RELEASE_V258}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V257", "NGE_BLOGGING_UPDATE_AVAILABLE_V258")
    .replaceAll("service-worker-activated-visual-native-v257", "service-worker-activated-theme-right4-v258");

  if (source.includes("function versionPayload(type)") && !source.includes("studioThemeRight4ReleaseV258:")) {
    source = source.replace(
      /(function versionPayload\(type\) \{[\s\S]*?return \{)/,
      "$1\n    studioThemeRight4ReleaseV258: STUDIO_THEME_RIGHT4_RELEASE_V258,",
    );
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V258}-${ACTIVE_CACHE_RELEASE_V258}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V258}-${ACTIVE_CACHE_RELEASE_V258}-${AUTH_HANDOFF_RELEASE}-assets`;',
  ]) {
    if (!source.includes(marker)) throw new Error(`V258_ROTATE_MARKER_MISSING:${marker}`);
  }

  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V258_ROTATE_DESTRUCTIVE_SESSION_ACTION");
  }

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
