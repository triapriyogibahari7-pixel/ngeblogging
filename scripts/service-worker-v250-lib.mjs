import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const RELEASE = "studio-native-auth-v250-20260804";
export const VERSION = "ngeblogging-app-v250-native-auth-20260804";
export const CACHE = "studio-native-auth-cache-v250";

const read = (path) => readFileSync(resolve(path), "utf8");
const liveImport = (source, path) => new RegExp(`^\\s*import\\s+[\"']\\./${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\"'];?\\s*$`, "m").test(source);

function verifySourceContracts() {
  const entry = read("src/Studio.jsx");
  const runtime = read("src/studio-native-authority-v250.js");
  const css = read("src/studio-native-authority-v250.css");
  const onboarding = read("src/StudioOnboardingGate.jsx");
  const auth = read("src/lib/supabase.js");
  const authReadiness = read("src/auth-readiness-bridge.js");
  const providerGateway = read("src/auth-provider-gateway-v250.js");
  const studio = read("src/StudioNext.jsx");
  const nara = read("src/NaraAssistant.jsx");
  const theme = read("src/theme-system.js");
  const widgets = read("src/widget-system.js");

  if (!liveImport(entry, "studio-native-authority-v250.js") || !liveImport(entry, "studio-native-authority-v250.css")) {
    throw new Error("V250_NATIVE_AUTHORITY_NOT_ACTIVE");
  }
  for (const retired of [
    "studio-stable-shell-v244.js",
    "studio-shell-controller-v147.js",
    "studio-production-v235.js",
    "studio-visual-stability-v241.js",
    "studio-shell-rescue-v242.js",
    "studio-sidebar-brand-v246.js",
    "studio-stable-shell-v244-final.css",
    "studio-sidebar-brand-v246.css",
    "studio-screenshot-lock-v247.css",
    "studio-final-visual-v249.css",
    "studio-final-visual-v249-hotfix.css",
  ]) {
    if (liveImport(entry, retired)) throw new Error(`V250_RETIRED_AUTHORITY_ACTIVE:${retired}`);
  }

  for (const marker of [
    "studio-native-authority-v250-20260804",
    'new Set(["application", "phone", "mobile", "compact"])',
    'new Set(["tablet", "desktop", "laptop", "computer"])',
    "ngeblogging-sidebar-native-v250",
    "sn-logo-mark",
    "Buka menu profil",
    "Tambahkan situs",
    "Lihat situs",
    "dataset.v250Interaction",
    "LAYOUT_AREAS",
    "tn-code-gutter-v250",
  ]) if (!runtime.includes(marker)) throw new Error(`V250_RUNTIME_MARKER_MISSING:${marker}`);

  for (const marker of [
    "--v250-side-open:248px",
    "--v250-side-rail:70px",
    'data-studio-v250-family="large"',
    'data-studio-v250-family="small"',
    ".sn-profile-menu-v250",
    '.nara-assistant-layer[data-v250-interaction="nonmodal"]',
    ".nara-attachment-menu",
    ".tn-code-workspace",
    ".v250-layout-map",
    ".sv124-free-domain>aside",
    ".ce-titlebar",
  ]) if (!css.includes(marker)) throw new Error(`V250_CSS_MARKER_MISSING:${marker}`);

  for (const label of ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"]) {
    if (!studio.includes(label)) throw new Error(`V250_MENU_REGRESSION:${label}`);
  }
  for (const marker of ["<Camera />","<ImageIcon />","<File />","<MicOff />","SpeakerIcon","intelligenceOptions","modelOptions"]) {
    if (!nara.includes(marker)) throw new Error(`V250_NARA_REGRESSION:${marker}`);
  }
  for (const marker of ["persistSession: true","autoRefreshToken: true",'flowType: "pkce"',"PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245"]) {
    if (!auth.includes(marker)) throw new Error(`V250_AUTH_SESSION_REGRESSION:${marker}`);
  }
  for (const marker of ["auth-provider-gateway-v250.js","Opsi login tetap aktif","AUTH_READINESS_RELEASE_V250"]) {
    if (!authReadiness.includes(marker)) throw new Error(`V250_AUTH_READINESS_REGRESSION:${marker}`);
  }
  for (const marker of ["/api/auth-proxy","/auth/v1/authorize","same-origin-auth-gateway"]) {
    if (!providerGateway.includes(marker)) throw new Error(`V250_PROVIDER_GATEWAY_REGRESSION:${marker}`);
  }
  for (const marker of [
    "first-site-onboarding-v250-20260804",
    "Critical path: Supabase already owns persisted tokens. Read the user's sites first.",
    "verifySessionDeferred(userId)",
    "Gangguan jaringan tidak akan dianggap sebagai logout",
  ]) if (!onboarding.includes(marker)) throw new Error(`V250_BOOTSTRAP_REGRESSION:${marker}`);
  if (!/BUILT_IN_THEMES/.test(theme) || !/THEME_COUNT/.test(theme)) throw new Error("V250_THEME_SYSTEM_MISSING");
  if (!/BUILT_IN_WIDGETS/.test(widgets) || !/WIDGET_COUNT/.test(widgets) || !/custom-html/.test(widgets)) throw new Error("V250_WIDGET_SYSTEM_MISSING");

  for (const destructive of [/localStorage\.clear\s*\(/,/sessionStorage\.clear\s*\(/]) {
    if (destructive.test(runtime) || destructive.test(onboarding) || destructive.test(providerGateway)) {
      throw new Error("V250_DESTRUCTIVE_SESSION_ACTION");
    }
  }
}

export function finalizeServiceWorkerV250(target = resolve("dist", "sw.js")) {
  verifySourceContracts();
  const swPath = resolve(target);
  if (!existsSync(swPath)) throw new Error(`V250_DIST_SW_MISSING:${swPath}`);
  let source = readFileSync(swPath, "utf8");

  const insertAfterVersion = (line) => {
    if (source.includes(line)) return;
    const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
    if (next === source) throw new Error(`V250_VERSION_ANCHOR_MISSING:${line}`);
    source = next;
  };

  insertAfterVersion(`const ACTIVE_VERSION_V250 = "${VERSION}";`);
  insertAfterVersion(`const ACTIVE_CACHE_RELEASE_V250 = "${CACHE}";`);
  insertAfterVersion(`const STUDIO_NATIVE_AUTH_RELEASE_V250 = "${RELEASE}";`);

  source = source
    .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V250}-${ACTIVE_CACHE_RELEASE_V250}-${AUTH_HANDOFF_RELEASE}-shell`;')
    .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V250}-${ACTIVE_CACHE_RELEASE_V250}-${AUTH_HANDOFF_RELEASE}-assets`;')
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*type,\n\s*)version:\s*[^,]+,/m, "$1version: ACTIVE_VERSION_V250,")
    .replace(/(function versionPayload\(type\) \{[\s\S]*?return \{[\s\S]*?\n\s*(?:type,[\s\S]*?\n\s*)?)release:\s*[^,]+,/m, "$1release: ACTIVE_CACHE_RELEASE_V250,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V249", "NGE_BLOGGING_UPDATE_AVAILABLE_V250")
    .replaceAll("service-worker-activated-final-visual-v249", "service-worker-activated-native-auth-v250")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v250 announces updates without forced navigation or session loss.");

  if (!source.includes("studioNativeAuthReleaseV250:")) {
    source = source.replace(/(function versionPayload\(type\) \{[\s\S]*?return \{)/, "$1\n    studioNativeAuthReleaseV250: STUDIO_NATIVE_AUTH_RELEASE_V250,");
  }

  for (const marker of [
    VERSION,
    CACHE,
    RELEASE,
    'const SHELL_CACHE = `${ACTIVE_VERSION_V250}-${ACTIVE_CACHE_RELEASE_V250}-${AUTH_HANDOFF_RELEASE}-shell`;',
    'const ASSET_CACHE = `${ACTIVE_VERSION_V250}-${ACTIVE_CACHE_RELEASE_V250}-${AUTH_HANDOFF_RELEASE}-assets`;',
    "studioNativeAuthReleaseV250",
  ]) if (!source.includes(marker)) throw new Error(`V250_FINALIZE_MARKER_MISSING:${marker}`);

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V250_FORCED_NAVIGATION_REMAINS");
  if (!/\.filter\(\(key\) => !\[SHELL_CACHE, ASSET_CACHE\]\.includes\(key\)\)/.test(source)) throw new Error("V250_OLD_CACHE_CLEANUP_MISSING");
  if (!/if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return;/.test(source)) throw new Error("V250_AUTH_SURFACE_GUARD_MISSING");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V250_SW_DESTRUCTIVE_SESSION_ACTION");

  writeFileSync(swPath, source, "utf8");
  return { path: swPath, release: RELEASE, version: VERSION, cache: CACHE };
}
