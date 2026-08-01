import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-real-device-v190-20260801";

function replaceRange(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`V190_${label}_RANGE_MISSING`);
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-real-device-v190.js";')) {
    const anchor = 'import "./studio-production-mobile-v189-fix.css";';
    if (!source.includes(anchor)) throw new Error("V190_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\nimport "./studio-real-device-v190.js";`);
  }
  await write(path, source);
}

async function patchAuthAndDataTransport() {
  const path = "src/lib/supabase.js";
  let source = await read(path);
  if (!source.includes("DATA_TRANSPORT_RELEASE_V190")) {
    source = source.replace(
      'const AUTH_GATEWAY_PREFIX = "/api/auth-proxy";',
      'const AUTH_GATEWAY_PREFIX = "/api/auth-proxy";\nconst DATA_GATEWAY_PREFIX = "/api/data-proxy";\nconst DATA_TRANSPORT_RELEASE_V190 = "studio-data-gateway-v190-20260801";\nconst DATA_GATEWAY_PATHS_V190 = ["/rest/v1/", "/storage/v1/"];',
    );
  }

  if (!source.includes("function proxiedDataUrlV190")) {
    const anchor = "async function authAwareFetch(input, init) {";
    const index = source.indexOf(anchor);
    if (index < 0) throw new Error("V190_AUTH_FETCH_ANCHOR_MISSING");
    const helpers = `function requestUrlV190(value) {
  try {
    return new URL(value instanceof Request ? value.url : String(value), typeof window === "undefined" ? undefined : window.location.origin);
  } catch {
    return null;
  }
}

function proxiedDataUrlV190(value) {
  if (!gatewayHost() || typeof window === "undefined") return null;
  const target = requestUrlV190(value);
  if (!target || target.origin !== supabaseOrigin()) return null;
  if (!DATA_GATEWAY_PATHS_V190.some((prefix) => target.pathname.startsWith(prefix))) return null;
  return new URL(\`${"${DATA_GATEWAY_PREFIX}"}${"${target.pathname}"}${"${target.search}"}\`, window.location.origin);
}

function proxyRequestV190(input, target) {
  return input instanceof Request ? new Request(target.toString(), input.clone()) : target.toString();
}

function directRequestV190(input) {
  return input instanceof Request ? input.clone() : input;
}

async function gatewayFirstV190(input, init, proxy, kind) {
  const directInput = directRequestV190(input);
  try {
    const response = await nativeFetch(proxyRequestV190(input, proxy), init);
    const gatewayHeader = kind === "auth"
      ? response.headers.get("x-ngeblogging-auth-gateway")
      : response.headers.get("x-ngeblogging-data-gateway");
    const staleUnauthorized = kind === "auth" && [401, 403].includes(response.status) && !gatewayHeader;
    if (!GATEWAY_FALLBACK_STATUSES.has(response.status) && !staleUnauthorized) {
      if (typeof document !== "undefined") {
        if (kind === "auth") document.documentElement.dataset.authTransportV190 = "same-origin-gateway";
        else document.documentElement.dataset.dataTransportV190 = "same-origin-data-gateway";
      }
      return response;
    }
    console.warn(\`Gateway ${"${kind}"} mengembalikan ${"${response.status}"}; mencoba Supabase langsung.\`);
  } catch (error) {
    console.warn(\`Gateway ${"${kind}"} tidak terjangkau; mencoba Supabase langsung.\`, error);
  }
  if (typeof document !== "undefined") {
    if (kind === "auth") document.documentElement.dataset.authTransportV190 = "direct-supabase-fallback";
    else document.documentElement.dataset.dataTransportV190 = "direct-supabase-fallback";
  }
  return nativeFetch(directInput, init);
}

`;
    source = `${source.slice(0, index)}${helpers}${source.slice(index)}`;
  }

  const fetchStart = "async function authAwareFetch(input, init) {";
  const fetchEnd = "\n}\n\nexport const supabase";
  if (!source.includes("dataProxyV190")) {
    const replacement = `async function authAwareFetch(input, init) {
  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada browser ini.");
  const dataProxyV190 = proxiedDataUrlV190(input);
  if (dataProxyV190) return gatewayFirstV190(input, init, dataProxyV190, "data");
  const authProxyV190 = proxiedAuthUrl(input);
  if (authProxyV190) return gatewayFirstV190(input, init, authProxyV190, "auth");
  return nativeFetch(input, init);
}`;
    source = replaceRange(source, fetchStart, fetchEnd, replacement, "AUTH_FETCH");
  }

  if (!source.includes("dataTransportV190")) throw new Error("V190_DATA_TRANSPORT_NOT_PATCHED");
  await write(path, source);
}

async function patchOnboardingContinuity() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);
  if (!source.includes('const ACTIVE_SITE_SNAPSHOT_V190 = "ngeblogging-active-site-snapshot-v190";')) {
    const anchor = 'const ACTIVE_SITE_SNAPSHOT_V186 = "ngeblogging-active-site-snapshot-v186";';
    if (!source.includes(anchor)) throw new Error("V190_REQUIRES_V186_ONBOARDING_PATCH");
    source = source.replace(anchor, `${anchor}\nconst ACTIVE_SITE_SNAPSHOT_V190 = "ngeblogging-active-site-snapshot-v190";`);
  }

  if (!source.includes("function cachedActiveSiteV190")) {
    const anchor = "function cachedActiveSiteV186() {";
    const index = source.indexOf(anchor);
    if (index < 0) throw new Error("V190_CACHED_SITE_ANCHOR_MISSING");
    const helper = `function cachedActiveSiteV190(userId) {
  if (!userId) return null;
  try {
    for (const key of [ACTIVE_SITE_SNAPSHOT_V190, ACTIVE_SITE_SNAPSHOT_V186, "ngeblogging-active-site-snapshot-v185", "ngeblogging-active-site-snapshot-v183"]) {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      const boundUserId = cached?.__ngebloggingUserId || cached?.owner_id || cached?.user_id || "";
      if (cached?.id && boundUserId === userId) return cached;
    }
  } catch { /* snapshot bersifat opsional */ }
  return null;
}

`;
    source = `${source.slice(0, index)}${helper}${source.slice(index)}`;
  }

  source = source.replace("function publishActiveSite(site) {", "function publishActiveSite(site, userId = \"\") {");
  if (!source.includes("ACTIVE_SITE_SNAPSHOT_V190, JSON.stringify")) {
    const anchor = "  setActiveSiteId(site.id);";
    const replacement = `${anchor}\n  try {\n    if (userId) localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V190, JSON.stringify({ ...site, __ngebloggingUserId: userId }));\n  } catch { /* snapshot opsional */ }`;
    source = source.replace(anchor, replacement);
  }

  source = source
    .replace("publishActiveSite(selected);\n      onCreated(selected);", "publishActiveSite(selected, user?.id);\n      onCreated(selected);")
    .replace("if (site) { publishActiveSite(site); setPhase(\"ready\"); }", "if (site) { publishActiveSite(site, props.user.id); setPhase(\"ready\"); }")
    .replace("const cached = transient ? cachedActiveSiteV186() : null;", "const cached = transient ? cachedActiveSiteV190(props.user.id) : null;")
    .replace("publishActiveSite(cached);\n            document.documentElement.dataset.studioStartupV186", "publishActiveSite(cached, props.user.id);\n            document.documentElement.dataset.studioStartupV186");

  if (!source.includes("cachedActiveSiteV190(props.user.id)")) throw new Error("V190_ONBOARDING_BOUND_FALLBACK_MISSING");
  await write(path, source);
}

async function patchFastGate() {
  const path = "src/StudioFastGate.jsx";
  let source = await read(path);
  if (!source.includes('"ngeblogging-active-site-snapshot-v190"')) {
    source = source.replace(
      "const SNAPSHOT_KEYS = [",
      'const SNAPSHOT_KEYS = [\n  "ngeblogging-active-site-snapshot-v190",',
    );
  }
  await write(path, source);
}

async function patchNaraClose() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);
  if (!source.includes("recognition.current?.stop?.();\n    recognition.current = null;\n    setListening(false);\n    stopSpeech();\n    setOpen(false);")) {
    const oldClose = `  const closeNara = () => {
    stopSpeech();
    setOpen(false);
  };`;
    const nextClose = `  const closeNara = () => {
    recognition.current?.stop?.();
    recognition.current = null;
    setListening(false);
    stopSpeech();
    setAttachmentMenu(false);
    setOpen(false);
  };`;
    if (!source.includes(oldClose)) throw new Error("V190_NARA_CLOSE_ANCHOR_MISSING");
    source = source.replace(oldClose, nextClose);
  }
  if (!source.includes('aria-modal={size === "full"}')) throw new Error("V190_REQUIRES_NONMODAL_NARA_SOURCE");
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v190-real-device-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "real-device-cache-v190";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "real-device-v190";');
  if (!source.includes("REAL_DEVICE_RELEASE_V190")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, '$1const REAL_DEVICE_RELEASE_V190 = "studio-real-device-v190-20260801";\n');
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V189", "NGE_BLOGGING_UPDATE_AVAILABLE_V190");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V190_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V190_SESSION_DESTRUCTIVE_ACTION_FOUND");
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-real-device-v190.js"],
    ["src/studio-real-device-v190.js", "studio-real-device-v190-20260801"],
    ["src/studio-real-device-v190.js", "studioViewportCalibrationV190"],
    ["src/studio-real-device-v190.css", "data-studio-physical-mobile-v190"],
    ["src/studio-real-device-v190.css", "background: transparent !important"],
    ["src/lib/supabase.js", "DATA_TRANSPORT_RELEASE_V190"],
    ["src/lib/supabase.js", "proxiedDataUrlV190"],
    ["src/lib/supabase.js", "same-origin-data-gateway"],
    ["src/StudioOnboardingGate.jsx", "cachedActiveSiteV190(props.user.id)"],
    ["src/StudioOnboardingGate.jsx", "__ngebloggingUserId"],
    ["src/StudioFastGate.jsx", "ngeblogging-active-site-snapshot-v190"],
    ["src/NaraAssistant.jsx", "recognition.current = null"],
    ["public/sw.js", "ngeblogging-app-v190-real-device-20260801"],
    ["public/sw.js", "real-device-cache-v190"],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V190_VERIFY_FAILED:${path}:${marker}`);
  }
  const runtime = await read("src/studio-real-device-v190.js");
  if (runtime.includes('body.style.setProperty("width", `${state.physicalWidth}px`')) throw new Error("V190_BODY_PHYSICAL_WIDTH_REINTRODUCED");
}

await patchStudioEntry();
await patchAuthAndDataTransport();
await patchOnboardingContinuity();
await patchFastGate();
await patchNaraClose();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
