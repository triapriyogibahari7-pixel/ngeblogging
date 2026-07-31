import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE = "studio-mobile-auth-interaction-v179-20260731";
const WORKER_RELEASE = "2026.07.31-mobile-auth-interaction-v179";
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);

function replaceRequired(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`Patch v179 gagal: ${label} tidak ditemukan.`);
  return source.replace(search, replacement);
}

function patchStudioEntry() {
  const file = "src/Studio.jsx";
  let source = read(file);
  if (!source.includes('import "./studio-interaction-v179.js";')) {
    source = replaceRequired(source, '\nimport "./studio-finalization-v178.js";\n\nexport default StudioFastGate;', '\nimport "./studio-finalization-v178.js";\nimport "./studio-interaction-v179.js";\n\nexport default StudioFastGate;', "Studio entry v179");
  }
  write(file, source);
}

function patchNara() {
  const file = "src/NaraAssistant.jsx";
  let source = read(file);
  source = replaceRequired(
    source,
    '  const closeNara = () => {\n    stopSpeech();\n    setOpen(false);\n  };',
    '  const closeNara = () => {\n    stopSpeech();\n    try { recognition.current?.stop?.(); } catch { /* microphone optional */ }\n    recognition.current = null;\n    setListening(false);\n    activeRequest.current?.abort?.();\n    setAttachmentMenu(false);\n    setOpen(false);\n  };',
    "Nara close media",
  );
  source = replaceRequired(
    source,
    '        <span><Sparkles /></span>\n        <b>Nara AI</b>\n        <small>Assistant</small>',
    '        <span aria-hidden="true"><Sparkles /></span>',
    "Nara launcher icon-only",
  );
  write(file, source);
}

function patchAuthTransport() {
  const file = "src/lib/supabase.js";
  let source = read(file);
  source = replaceRequired(
    source,
    'async function authAwareFetch(input, init) {\n  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada browser ini.");\n  const proxy = proxiedAuthUrl(input);\n  if (!proxy) return nativeFetch(input, init);\n\n  const request = input instanceof Request\n    ? new Request(proxy.toString(), input)\n    : proxy.toString();\n  const response = await nativeFetch(request, init);\n  if (typeof document !== "undefined") {\n    document.documentElement.dataset.authTransportV153 = response.headers.get("x-ngeblogging-auth-gateway")\n      ? "same-origin-gateway"\n      : "same-origin-response";\n  }\n  return response;\n}',
    'async function authAwareFetch(input, init) {\n  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada browser ini.");\n  const proxy = proxiedAuthUrl(input);\n  if (!proxy) return nativeFetch(input, init);\n\n  const direct = input instanceof Request ? input.clone() : input;\n  const request = input instanceof Request\n    ? new Request(proxy.toString(), input)\n    : proxy.toString();\n  try {\n    const response = await nativeFetch(request, init);\n    const retryDirect = [502, 503, 504].includes(response.status);\n    if (typeof document !== "undefined") {\n      document.documentElement.dataset.authTransportV179 = retryDirect ? "gateway-retry-direct" : "same-origin-gateway";\n      document.documentElement.dataset.authTransportV153 = response.headers.get("x-ngeblogging-auth-gateway")\n        ? "same-origin-gateway"\n        : "same-origin-response";\n    }\n    if (!retryDirect) return response;\n    return nativeFetch(direct, init);\n  } catch {\n    if (typeof document !== "undefined") document.documentElement.dataset.authTransportV179 = "network-retry-direct";\n    return nativeFetch(direct, init);\n  }\n}',
    "auth direct fallback",
  );
  source = replaceRequired(
    source,
    'function providerDestination(value) {\n  const direct = new URL(value);\n  const proxy = proxiedAuthUrl(direct.toString());\n  return proxy?.toString() || direct.toString();\n}',
    'function providerDestination(value) {\n  const direct = new URL(value);\n  if (direct.origin === supabaseOrigin() && direct.pathname.startsWith("/auth/v1/authorize")) {\n    if (typeof document !== "undefined") document.documentElement.dataset.authProviderTransportV179 = "direct-supabase-authorize";\n    return direct.toString();\n  }\n  const proxy = proxiedAuthUrl(direct.toString());\n  return proxy?.toString() || direct.toString();\n}',
    "OAuth direct authorize",
  );
  write(file, source);
}

function patchAuthUi() {
  const file = "src/AuthModal.jsx";
  let source = read(file);
  source = replaceRequired(
    source,
    '  if (value.includes("expired") || value.includes("invalid token")) return "Tautan sudah kedaluwarsa atau tidak valid. Minta tautan baru.";\n  return error?.message || "Proses belum berhasil. Silakan coba lagi.";',
    '  if (value.includes("expired") || value.includes("invalid token")) return "Tautan sudah kedaluwarsa atau tidak valid. Minta tautan baru.";\n  if (value.includes("failed to fetch") || value.includes("network") || value.includes("networkerror")) return "Koneksi login terputus. Sesi yang sudah ada tetap disimpan; periksa internet lalu tekan coba lagi.";\n  return error?.message || "Proses belum berhasil. Silakan coba lagi.";',
    "friendly network error",
  );
  write(file, source);
}

function patchServiceWorker() {
  const file = "public/sw.js";
  let source = read(file);
  if (source.includes('const VERSION = "ngeblogging-app-v179-mobile-auth-interaction-20260731";')) return;
  source = replaceRequired(source, 'const VERSION = "ngeblogging-app-v177-screenshot-stability-20260731";', 'const VERSION = "ngeblogging-app-v179-mobile-auth-interaction-20260731";\nconst SCREENSHOT_STABILITY_COMPAT_VERSION = "ngeblogging-app-v177-screenshot-stability-20260731";', "SW version v177");
  source = replaceRequired(source, 'const CACHE_RELEASE = "screenshot-stability-cache-v177";', 'const CACHE_RELEASE = "mobile-auth-interaction-cache-v179";\nconst SCREENSHOT_STABILITY_COMPAT_RELEASE = "screenshot-stability-cache-v177";', "SW cache v177");
  source = replaceRequired(source, 'const FORCE_REFRESH_VALUE = "screenshot-stability-v177";', 'const FORCE_REFRESH_VALUE = "mobile-auth-interaction-v179";\nconst SCREENSHOT_STABILITY_COMPAT_FORCE_REFRESH = "screenshot-stability-v177";', "SW refresh v177");
  source = source.replaceAll("NGE_BLOGGING_FORCE_RELOAD_V177", "NGE_BLOGGING_FORCE_RELOAD_V179");
  source = source.replaceAll("service-worker-stale-shell-v177", "service-worker-stale-shell-v179");
  source = source.replaceAll("service-worker-activated-screenshot-stability-v177", "service-worker-activated-mobile-auth-interaction-v179");
  source = replaceRequired(
    source,
    '    screenshotStabilityRelease: "studio-screenshot-stability-v177-20260731",',
    '    screenshotStabilityRelease: "studio-screenshot-stability-v177-20260731",\n    mobileAuthInteractionRelease: "studio-mobile-auth-interaction-v179-20260731",\n    screenshotStabilityCompatVersion: SCREENSHOT_STABILITY_COMPAT_VERSION,\n    screenshotStabilityCompatRelease: SCREENSHOT_STABILITY_COMPAT_RELEASE,\n    screenshotStabilityCompatForceRefresh: SCREENSHOT_STABILITY_COMPAT_FORCE_REFRESH,\n    mobileAuthInteractionCompatibility: ["NGE_BLOGGING_FORCE_RELOAD_V177", "service-worker-stale-shell-v177", "service-worker-activated-screenshot-stability-v177"],',
    "SW payload v177",
  );
  write(file, source);
}

function patchWorker() {
  const file = "cloudflare/worker-v69.mjs";
  let source = read(file);
  if (source.includes(`export const MOBILE_AUTH_INTERACTION_RELEASE = "${WORKER_RELEASE}";`)) return;
  source = replaceRequired(source, 'export const SCREENSHOT_STABILITY_RELEASE = "2026.07.31-screenshot-stability-v177";', `export const SCREENSHOT_STABILITY_RELEASE = "2026.07.31-screenshot-stability-v177";\nexport const MOBILE_AUTH_INTERACTION_RELEASE = "${WORKER_RELEASE}";`, "worker release v177");
  source = replaceRequired(source, '  "/release-v178.json",\n]);', '  "/release-v178.json",\n  "/release-v179.json",\n]);', "worker release path v179");
  source = replaceRequired(source, '    screenshotStabilityRelease: SCREENSHOT_STABILITY_RELEASE,', '    screenshotStabilityRelease: SCREENSHOT_STABILITY_RELEASE,\n    mobileAuthInteractionRelease: MOBILE_AUTH_INTERACTION_RELEASE,\n    drawerBackdropOutsideOnlyV179: true,\n    naraSmallMediumNonmodalV179: true,\n    oauthAuthorizeDirectTransportV179: true,', "worker body v179");
  source = replaceRequired(source, '      "x-ngeblogging-screenshot-stability": SCREENSHOT_STABILITY_RELEASE,', '      "x-ngeblogging-screenshot-stability": SCREENSHOT_STABILITY_RELEASE,\n      "x-ngeblogging-mobile-auth-interaction": MOBILE_AUTH_INTERACTION_RELEASE,', "worker header v179");
  source = replaceRequired(source, '    && html.includes("ngeblogging-studio-finalization-v178")', '    && html.includes("ngeblogging-studio-finalization-v178")\n    && html.includes("ngeblogging-mobile-auth-interaction-v179")', "worker marker condition v179");
  source = replaceRequired(source, '    `<meta name="ngeblogging-studio-finalization-v178" content="${STUDIO_FINALIZATION_RELEASE}"/>`,', '    `<meta name="ngeblogging-studio-finalization-v178" content="${STUDIO_FINALIZATION_RELEASE}"/>`,\n    `<meta name="ngeblogging-mobile-auth-interaction-v179" content="${MOBILE_AUTH_INTERACTION_RELEASE}"/>`,', "worker marker v179");
  source = source.replaceAll('  headers.set("x-ngeblogging-studio-finalization", STUDIO_FINALIZATION_RELEASE);', '  headers.set("x-ngeblogging-studio-finalization", STUDIO_FINALIZATION_RELEASE);\n  headers.set("x-ngeblogging-mobile-auth-interaction", MOBILE_AUTH_INTERACTION_RELEASE);');
  write(file, source);
}

function patchNetlify() {
  const file = "scripts/write-netlify-redirects.mjs";
  let source = read(file);
  if (source.includes(`const MOBILE_AUTH_INTERACTION_RELEASE = "${WORKER_RELEASE}";`)) return;
  source = replaceRequired(source, 'const STUDIO_FINALIZATION_RELEASE = "studio-finalization-v178-20260731";', `const STUDIO_FINALIZATION_RELEASE = "studio-finalization-v178-20260731";\nconst MOBILE_AUTH_INTERACTION_RELEASE = "${WORKER_RELEASE}";`, "Netlify v178 release");
  source = replaceRequired(source, '  X-Ngeblogging-Studio-Finalization: ${STUDIO_FINALIZATION_RELEASE}', '  X-Ngeblogging-Studio-Finalization: ${STUDIO_FINALIZATION_RELEASE}\n  X-Ngeblogging-Mobile-Auth-Interaction: ${MOBILE_AUTH_INTERACTION_RELEASE}', "Netlify header v179");
  source = replaceRequired(source, '/release-v178.json\n  Cache-Control: no-store, max-age=0\n`,', '/release-v178.json\n  Cache-Control: no-store, max-age=0\n/release-v179.json\n  Cache-Control: no-store, max-age=0\n`,', "Netlify release path v179");
  source = replaceRequired(source, '    studioFinalizationRelease: STUDIO_FINALIZATION_RELEASE,', '    studioFinalizationRelease: STUDIO_FINALIZATION_RELEASE,\n    mobileAuthInteractionRelease: MOBILE_AUTH_INTERACTION_RELEASE,\n    drawerBackdropOutsideOnlyV179: true,\n    naraSmallMediumNonmodalV179: true,\n    oauthAuthorizeDirectTransportV179: true,', "Netlify body v179");
  source = replaceRequired(source, '    || !html.includes(\'name="ngeblogging-studio-finalization-v178"\')', '    || !html.includes(\'name="ngeblogging-studio-finalization-v178"\')\n    || !html.includes(\'name="ngeblogging-mobile-auth-interaction-v179"\')', "Netlify marker condition v179");
  source = replaceRequired(source, '      `<meta name="ngeblogging-studio-finalization-v178" content="${STUDIO_FINALIZATION_RELEASE}">`,', '      `<meta name="ngeblogging-studio-finalization-v178" content="${STUDIO_FINALIZATION_RELEASE}">`,\n      `<meta name="ngeblogging-mobile-auth-interaction-v179" content="${MOBILE_AUTH_INTERACTION_RELEASE}">`,', "Netlify marker v179");
  write(file, source);
}

function verify() {
  const checks = [
    ["src/Studio.jsx", 'import "./studio-interaction-v179.js";'],
    ["src/studio-interaction-v179.js", RELEASE],
    ["src/studio-interaction-v179.css", "--sm179-drawer-width"],
    ["src/lib/supabase.js", "direct-supabase-authorize"],
    ["src/lib/supabase.js", "network-retry-direct"],
    ["src/AuthModal.jsx", "Koneksi login terputus"],
    ["src/NaraAssistant.jsx", "recognition.current?.stop?.()"],
    ["public/sw.js", "ngeblogging-app-v179-mobile-auth-interaction-20260731"],
    ["public/sw.js", "mobile-auth-interaction-cache-v179"],
    ["cloudflare/worker-v69.mjs", '"/release-v179.json"'],
    ["cloudflare/worker-v69.mjs", "x-ngeblogging-mobile-auth-interaction"],
    ["scripts/write-netlify-redirects.mjs", "/release-v179.json"],
    ["scripts/write-netlify-redirects.mjs", "X-Ngeblogging-Mobile-Auth-Interaction"],
  ];
  const missing = checks.filter(([file, marker]) => !read(file).includes(marker));
  if (missing.length) throw new Error(`Patch v179 tidak lengkap: ${missing.map(([file, marker]) => `${file}:${marker}`).join(", ")}`);
}

patchStudioEntry();
patchNara();
patchAuthTransport();
patchAuthUi();
patchServiceWorker();
patchWorker();
patchNetlify();
verify();
console.log(`[${RELEASE}] patch applied exactly once and verified`);
