import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v233-data-session-bootstrap-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v233-data-session-bootstrap-20260803";
const ACTIVE_CACHE = "data-session-bootstrap-cache-v233";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V233_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`V233_${label}_ANCHOR_MISSING`);
  return `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
}

async function patchDataTransport() {
  const path = "src/lib/supabase.js";
  let source = await read(path);

  if (!source.includes("DATA_GATEWAY_DEADLINE_V233")) {
    const anchor = "const GATEWAY_FALLBACK_STATUSES = new Set([404, 502, 503, 504]);";
    if (!source.includes(anchor)) throw new Error("V233_DATA_GATEWAY_CONSTANT_ANCHOR_MISSING");
    source = source.replace(
      anchor,
      `${anchor}\nconst DATA_GATEWAY_DEADLINE_V233 = 2800;\nconst AUTH_GATEWAY_DEADLINE_V233 = 4200;\nconst DATA_TRANSPORT_RELEASE_V233 = "${RELEASE}";`,
    );
  }

  const replacement = `async function gatewayFirstV190(input, init, proxy, kind) {
  const directInput = directRequestV190(input);
  const callerSignal = init?.signal || (input instanceof Request ? input.signal : null);
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  let callerAborted = Boolean(callerSignal?.aborted);
  const onCallerAbort = () => {
    callerAborted = true;
    try { controller?.abort(callerSignal?.reason); } catch { controller?.abort(); }
  };
  if (callerSignal && !callerSignal.aborted) callerSignal.addEventListener("abort", onCallerAbort, { once: true });
  const deadline = kind === "data" ? DATA_GATEWAY_DEADLINE_V233 : AUTH_GATEWAY_DEADLINE_V233;
  let deadlineTimer = 0;
  if (controller) deadlineTimer = globalThis.setTimeout(() => {
    if (!callerAborted) {
      try { controller.abort(new DOMException("Gateway timeout", "TimeoutError")); }
      catch { controller.abort(); }
    }
  }, deadline);

  let fallbackReason = "";
  try {
    if (callerAborted) throw callerSignal?.reason || new DOMException("Request dibatalkan.", "AbortError");
    const gatewayInit = controller ? { ...(init || {}), signal: controller.signal } : init;
    const response = await nativeFetch(proxyRequestV190(input, proxy), gatewayInit);
    const gatewayHeader = kind === "auth"
      ? response.headers.get("x-ngeblogging-auth-gateway")
      : response.headers.get("x-ngeblogging-data-gateway");
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const staleUnauthorized = [401, 403].includes(response.status) && !gatewayHeader;
    const staleHtmlShell = response.ok && !gatewayHeader && contentType.includes("text/html");
    const retryableGatewayStatus = GATEWAY_FALLBACK_STATUSES.has(response.status);

    if (!retryableGatewayStatus && !staleUnauthorized && !staleHtmlShell) {
      if (typeof document !== "undefined") {
        if (kind === "auth") document.documentElement.dataset.authTransportV190 = "same-origin-gateway";
        else document.documentElement.dataset.dataTransportV190 = "same-origin-data-gateway";
        document.documentElement.dataset.dataTransportV233 = `${kind}-gateway-confirmed`;
      }
      return response;
    }

    fallbackReason = staleUnauthorized
      ? `stale-${kind}-unauthorized-${response.status}`
      : staleHtmlShell
        ? `stale-${kind}-html-shell`
        : `${kind}-gateway-${response.status}`;
    console.warn(`Gateway ${kind} belum dapat dipakai (${fallbackReason}); mencoba Supabase langsung.`);
  } catch (error) {
    if (callerAborted) throw error;
    fallbackReason = error?.name === "TimeoutError" || controller?.signal?.aborted
      ? `${kind}-gateway-timeout`
      : `${kind}-gateway-network-error`;
    console.warn(`Gateway ${kind} tidak terjangkau (${fallbackReason}); mencoba Supabase langsung.`, error);
  } finally {
    if (deadlineTimer) globalThis.clearTimeout(deadlineTimer);
    if (callerSignal) callerSignal.removeEventListener?.("abort", onCallerAbort);
  }

  if (typeof document !== "undefined") {
    if (kind === "auth") document.documentElement.dataset.authTransportV190 = "direct-supabase-fallback";
    else document.documentElement.dataset.dataTransportV190 = "direct-supabase-fallback";
    document.documentElement.dataset.dataTransportV233 = `direct-fallback:${fallbackReason || kind}`;
  }
  return nativeFetch(directInput, init);
}`;

  source = replaceBetween(
    source,
    "async function gatewayFirstV190(input, init, proxy, kind) {",
    "async function authAwareFetch(input, init) {",
    replacement,
    "GATEWAY_FUNCTION",
  );

  if (!source.includes("document.documentElement.dataset.dataTransportReleaseV233")) {
    const anchor = "  document.documentElement.dataset.dataTransportReleaseV190 = DATA_TRANSPORT_RELEASE_V190;";
    if (!source.includes(anchor)) throw new Error("V233_DATASET_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n  document.documentElement.dataset.dataTransportReleaseV233 = DATA_TRANSPORT_RELEASE_V233;`);
  }

  for (const marker of [
    "DATA_GATEWAY_DEADLINE_V233",
    "staleUnauthorized",
    "staleHtmlShell",
    "gateway-timeout",
    "direct-supabase-fallback",
    "dataTransportReleaseV233",
    "persistSession: true",
    "autoRefreshToken: true",
  ]) if (!source.includes(marker)) throw new Error(`V233_DATA_TRANSPORT_VERIFY_FAILED:${marker}`);

  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  for (const line of [
    `const ACTIVE_VERSION_V233 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V233 = "${ACTIVE_CACHE}";`,
    `const STUDIO_PRODUCTION_RELEASE_V233 = "${RELEASE}";`,
  ]) source = insertAfterVersion(source, line);

  const oldShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V232}-${ACTIVE_CACHE_RELEASE_V232}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const nextShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V233}-${ACTIVE_CACHE_RELEASE_V233}-${AUTH_HANDOFF_RELEASE}-shell`;';
  if (!source.includes(nextShell)) {
    if (!source.includes(oldShell)) throw new Error("V233_SHELL_CACHE_V232_ANCHOR_MISSING");
    source = source.replace(oldShell, nextShell);
  }
  const oldAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V232}-${ACTIVE_CACHE_RELEASE_V232}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const nextAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V233}-${ACTIVE_CACHE_RELEASE_V233}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(nextAsset)) {
    if (!source.includes(oldAsset)) throw new Error("V233_ASSET_CACHE_V232_ANCHOR_MISSING");
    source = source.replace(oldAsset, nextAsset);
  }

  source = source
    .replace("    version: ACTIVE_VERSION_V232,", "    version: ACTIVE_VERSION_V233,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V232,", "    release: ACTIVE_CACHE_RELEASE_V233,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V232", "NGE_BLOGGING_UPDATE_AVAILABLE_V233")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v233 announces a fresh data transport shell without force navigation or logout.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V233_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V233_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  for (const marker of [ACTIVE_VERSION, ACTIVE_CACHE, RELEASE, nextShell, nextAsset]) {
    if (!source.includes(marker)) throw new Error(`V233_SW_MARKER_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const [transport, gate, fastGate, worker, v232Runtime, v232Css, release] = await Promise.all([
    read("src/lib/supabase.js"),
    read("src/StudioOnboardingGate.jsx"),
    read("src/StudioFastGate.jsx"),
    read("public/sw.js"),
    read("src/studio-production-v232.js"),
    read("src/studio-production-v232.css"),
    read("public/release-v233.json"),
  ]);

  const checks = [
    [transport, RELEASE],
    [transport, "DATA_GATEWAY_DEADLINE_V233"],
    [transport, "staleUnauthorized"],
    [transport, "gateway-timeout"],
    [transport, "persistSession: true"],
    [transport, "autoRefreshToken: true"],
    [gate, "recoverStudioMembershipV196"],
    [gate, "tidak ada logout otomatis"],
    [fastGate, "hasKnownSite"],
    [worker, ACTIVE_VERSION],
    [worker, ACTIVE_CACHE],
    [worker, RELEASE],
    [v232Runtime, "studio-production-v232-single-n-theme-actions-20260803"],
    [v232Css, 'data-v232-family="large"'],
    [v232Css, 'data-v232-family="small"'],
    [release, RELEASE],
  ];
  for (const [source, marker] of checks) if (!source.includes(marker)) throw new Error(`V233_VERIFY_FAILED:${marker}`);
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(transport)) throw new Error("V233_DESTRUCTIVE_TRANSPORT_SESSION_ACTION");
}

await patchDataTransport();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}; data gateway now fails over quickly to direct Supabase on timeout, stale 401/403 or stale HTML shell while preserving the authenticated session.`);
