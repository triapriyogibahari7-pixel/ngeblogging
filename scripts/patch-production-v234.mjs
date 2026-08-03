import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v234-data-gateway-safe-20260803";

function replaceFunction(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error("V234_DATA_GATEWAY_FUNCTION_ANCHOR_MISSING");
  return `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
}

async function patchTransport() {
  const path = "src/lib/supabase.js";
  let source = await read(path);

  if (!source.includes("DATA_GATEWAY_DEADLINE_V234")) {
    const anchor = "const GATEWAY_FALLBACK_STATUSES = new Set([404, 502, 503, 504]);";
    if (!source.includes(anchor)) throw new Error("V234_DATA_GATEWAY_CONSTANT_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\nconst DATA_GATEWAY_DEADLINE_V234 = 2800;\nconst AUTH_GATEWAY_DEADLINE_V234 = 4200;\nconst DATA_TRANSPORT_RELEASE_V234 = "${RELEASE}";`);
  }

  const replacement = `async function gatewayFirstV190(input, init, proxy, kind) {
  const directInput = directRequestV190(input);
  const requestSignal = init?.signal || (typeof Request !== "undefined" && input instanceof Request ? input.signal : null);
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  let callerAborted = Boolean(requestSignal?.aborted);
  let timedOut = false;
  const abortFromCaller = () => {
    callerAborted = true;
    controller?.abort();
  };
  if (requestSignal && !requestSignal.aborted) requestSignal.addEventListener("abort", abortFromCaller, { once: true });

  const timeoutMs = kind === "data" ? DATA_GATEWAY_DEADLINE_V234 : AUTH_GATEWAY_DEADLINE_V234;
  const timer = controller ? globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs) : 0;

  let fallbackReason = "";
  try {
    if (callerAborted) throw requestSignal?.reason || new Error("Request dibatalkan oleh pemanggil.");
    const gatewayInit = controller ? { ...(init || {}), signal: controller.signal } : init;
    const response = await nativeFetch(proxyRequestV190(input, proxy), gatewayInit);
    const gatewayHeader = kind === "auth"
      ? response.headers.get("x-ngeblogging-auth-gateway")
      : response.headers.get("x-ngeblogging-data-gateway");
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const staleUnauthorized = [401, 403].includes(response.status) && !gatewayHeader;
    const staleHtmlShell = response.ok && !gatewayHeader && contentType.includes("text/html");
    const retryableStatus = GATEWAY_FALLBACK_STATUSES.has(response.status);

    if (!retryableStatus && !staleUnauthorized && !staleHtmlShell) {
      if (typeof document !== "undefined") {
        if (kind === "auth") document.documentElement.dataset.authTransportV190 = "same-origin-gateway";
        else document.documentElement.dataset.dataTransportV190 = "same-origin-data-gateway";
        document.documentElement.dataset.dataTransportV234 = kind + "-gateway-confirmed";
      }
      return response;
    }

    fallbackReason = staleUnauthorized
      ? "stale-" + kind + "-unauthorized-" + response.status
      : staleHtmlShell
        ? "stale-" + kind + "-html-shell"
        : kind + "-gateway-" + response.status;
  } catch (error) {
    if (callerAborted) throw error;
    fallbackReason = timedOut ? kind + "-gateway-timeout" : kind + "-gateway-network-error";
    console.warn("Gateway " + kind + " belum dapat dipakai; mencoba Supabase langsung.", error);
  } finally {
    if (timer) globalThis.clearTimeout(timer);
    requestSignal?.removeEventListener?.("abort", abortFromCaller);
  }

  if (typeof document !== "undefined") {
    if (kind === "auth") document.documentElement.dataset.authTransportV190 = "direct-supabase-fallback";
    else document.documentElement.dataset.dataTransportV190 = "direct-supabase-fallback";
    document.documentElement.dataset.dataTransportV234 = "direct-fallback:" + (fallbackReason || kind);
  }
  return nativeFetch(directInput, init);
}`;

  source = replaceFunction(
    source,
    "async function gatewayFirstV190(input, init, proxy, kind) {",
    "async function authAwareFetch(input, init) {",
    replacement,
  );

  if (!source.includes("dataTransportReleaseV234")) {
    const anchor = "  document.documentElement.dataset.dataTransportReleaseV190 = DATA_TRANSPORT_RELEASE_V190;";
    if (!source.includes(anchor)) throw new Error("V234_DATASET_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n  document.documentElement.dataset.dataTransportReleaseV234 = DATA_TRANSPORT_RELEASE_V234;`);
  }

  for (const marker of [
    RELEASE,
    "DATA_GATEWAY_DEADLINE_V234 = 2800",
    "AUTH_GATEWAY_DEADLINE_V234 = 4200",
    "staleUnauthorized",
    "staleHtmlShell",
    "gateway-timeout",
    "direct-supabase-fallback",
    "persistSession: true",
    "autoRefreshToken: true",
    "DATA_TRANSPORT_RELEASE_V190",
    "direct-fallback-v186",
    "direct-supabase-oauth-v186",
  ]) if (!source.includes(marker)) throw new Error(`V234_VERIFY_FAILED:${marker}`);

  const gatewayStart = source.indexOf("async function gatewayFirstV190(input, init, proxy, kind) {");
  const gatewayEnd = source.indexOf("async function authAwareFetch(input, init) {", gatewayStart);
  const gatewaySection = source.slice(gatewayStart, gatewayEnd);
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(gatewaySection)) {
    throw new Error("V234_DESTRUCTIVE_SESSION_ACTION");
  }

  await write(path, source);
}

async function verifyPreservedV232() {
  const [runtime, css, nara, theme] = await Promise.all([
    read("src/studio-production-v232.js"),
    read("src/studio-production-v232.css"),
    read("src/NaraAssistant.jsx"),
    read("src/ThemeStudio.jsx"),
  ]);
  for (const [source, marker] of [
    [runtime, "studio-production-v232-single-n-theme-actions-20260803"],
    [css, 'data-v232-family="large"'],
    [css, 'data-v232-family="small"'],
    [nara, "Kamera"], [nara, "Foto"], [nara, "File teks"],
    [theme, 'data-v226-layout-source="native-green-reference"'],
  ]) if (!source.includes(marker)) throw new Error(`V234_V232_COMPAT_MISSING:${marker}`);
}

await patchTransport();
await verifyPreservedV232();
console.log(`Applied ${RELEASE}; only the data/auth gateway fallback changed and v232 UI authority remains intact.`);
