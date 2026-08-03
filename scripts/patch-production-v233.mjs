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

async function patchSupabaseTransport() {
  const path = "src/lib/supabase.js";
  let source = await read(path);

  if (!source.includes("DATA_TRANSPORT_RELEASE_V233")) {
    const anchor = 'const DATA_REAUTH_RELEASE_V224 = "data-reauth-v224-20260803";';
    if (!source.includes(anchor)) throw new Error("V233_V224_REAUTH_RELEASE_ANCHOR_MISSING");
    source = source.replace(
      anchor,
      `${anchor}\nconst DATA_TRANSPORT_RELEASE_V233 = "${RELEASE}";\nconst DATA_GATEWAY_DEADLINE_V233 = 2800;\nconst AUTH_GATEWAY_DEADLINE_V233 = 4200;`,
    );
  }

  if (!source.includes("async function fetchGatewayWithDeadlineV233")) {
    const anchor = "async function gatewayFirstV190(input, init, proxy, kind) {";
    if (!source.includes(anchor)) throw new Error("V233_GATEWAY_FUNCTION_ANCHOR_MISSING");
    const helper = `async function fetchGatewayWithDeadlineV233(input, init, kind) {\n  const callerSignal = init?.signal || (input instanceof Request ? input.signal : null);\n  if (callerSignal?.aborted) {\n    const error = callerSignal.reason instanceof Error ? callerSignal.reason : new DOMException("Request dibatalkan.", "AbortError");\n    error.v233CallerAbort = true;\n    throw error;\n  }\n  if (typeof AbortController !== "function") return nativeFetch(input, init);\n  const controller = new AbortController();\n  const deadline = kind === "data" ? DATA_GATEWAY_DEADLINE_V233 : AUTH_GATEWAY_DEADLINE_V233;\n  let callerAborted = false;\n  const onCallerAbort = () => {\n    callerAborted = true;\n    try { controller.abort(callerSignal?.reason); } catch { controller.abort(); }\n  };\n  callerSignal?.addEventListener?.("abort", onCallerAbort, { once: true });\n  const timer = globalThis.setTimeout(() => {\n    if (!callerAborted) controller.abort();\n  }, deadline);\n  try {\n    return await nativeFetch(input, { ...(init || {}), signal: controller.signal });\n  } catch (error) {\n    if (callerAborted || callerSignal?.aborted) {\n      error.v233CallerAbort = true;\n      throw error;\n    }\n    if (controller.signal.aborted) {\n      const timeout = new Error("Gateway " + kind + " melewati batas waktu v233.");\n      timeout.name = "TimeoutError";\n      timeout.code = "V233_GATEWAY_TIMEOUT";\n      throw timeout;\n    }\n    throw error;\n  } finally {\n    globalThis.clearTimeout(timer);\n    callerSignal?.removeEventListener?.("abort", onCallerAbort);\n  }\n}\n\n`;
    source = source.replace(anchor, `${helper}${anchor}`);
  }

  const oldFetch = "    const response = await nativeFetch(proxyRequestV190(input, proxy), init);";
  const newFetch = "    const response = await fetchGatewayWithDeadlineV233(proxyRequestV190(input, proxy), init, kind);";
  if (!source.includes(newFetch)) {
    if (!source.includes(oldFetch)) throw new Error("V233_GATEWAY_FETCH_ANCHOR_MISSING");
    source = source.replace(oldFetch, newFetch);
  }

  const oldCondition = `    const staleUnauthorized = kind === "auth" && [401, 403].includes(response.status) && !gatewayHeader;\n    const dataUnauthorizedV224 = kind === "data" && [401, 403].includes(response.status);\n    if (dataUnauthorizedV224) {\n      const recovered = await retryDataAfterReauthV224(directInput, init);\n      if (recovered) return recovered;\n      return response;\n    }\n    if (!GATEWAY_FALLBACK_STATUSES.has(response.status) && !staleUnauthorized) {`;
  const newCondition = `    const staleUnauthorized = kind === "auth" && [401, 403].includes(response.status) && !gatewayHeader;\n    const dataUnauthorizedV224 = kind === "data" && [401, 403].includes(response.status);\n    const staleDataUnauthorizedV233 = dataUnauthorizedV224 && !gatewayHeader;\n    const contentTypeV233 = String(response.headers.get("content-type") || "").toLowerCase();\n    const staleHtmlShellV233 = response.ok && !gatewayHeader && contentTypeV233.includes("text/html");\n    if (dataUnauthorizedV224) {\n      const recovered = await retryDataAfterReauthV224(directInput, init);\n      if (recovered?.ok) return recovered;\n      if (!staleDataUnauthorizedV233) return recovered || response;\n      console.warn("Data gateway 401/403 tanpa identitas gateway; v233 memakai fallback Supabase langsung.");\n    }\n    if (!GATEWAY_FALLBACK_STATUSES.has(response.status) && !staleUnauthorized && !staleDataUnauthorizedV233 && !staleHtmlShellV233) {`;
  if (!source.includes("const staleDataUnauthorizedV233")) {
    if (!source.includes(oldCondition)) throw new Error("V233_V224_DATA_CONDITION_ANCHOR_MISSING");
    source = source.replace(oldCondition, newCondition);
  }

  const oldCatch = `  } catch (error) {\n    console.warn(\`Gateway \${kind} tidak terjangkau; mencoba Supabase langsung.\`, error);\n  }`;
  const newCatch = `  } catch (error) {\n    if (error?.v233CallerAbort) throw error;\n    const reasonV233 = error?.code === "V233_GATEWAY_TIMEOUT" ? "timeout" : "network";\n    console.warn("Gateway " + kind + " " + reasonV233 + "; mencoba Supabase langsung.", error);\n  }`;
  if (!source.includes("const reasonV233")) {
    if (!source.includes(oldCatch)) throw new Error("V233_GATEWAY_CATCH_ANCHOR_MISSING");
    source = source.replace(oldCatch, newCatch);
  }

  if (!source.includes("dataTransportReleaseV233")) {
    const anchor = "  document.documentElement.dataset.dataReauthReleaseV224 = DATA_REAUTH_RELEASE_V224;";
    if (!source.includes(anchor)) throw new Error("V233_DATASET_V224_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n  document.documentElement.dataset.dataTransportReleaseV233 = DATA_TRANSPORT_RELEASE_V233;`);
  }

  if (!source.includes("DATA_TRANSPORT_RELEASE_V233,")) {
    const anchor = "  DATA_REAUTH_RELEASE_V224,\n  AUTH_V186_COMPAT,";
    if (!source.includes(anchor)) throw new Error("V233_EXPORT_V224_ANCHOR_MISSING");
    source = source.replace(anchor, "  DATA_REAUTH_RELEASE_V224,\n  DATA_TRANSPORT_RELEASE_V233,\n  AUTH_V186_COMPAT,");
  }

  const markers = [
    RELEASE,
    "DATA_REAUTH_RELEASE_V224",
    "retryDataAfterReauthV224",
    "fetchGatewayWithDeadlineV233",
    "DATA_GATEWAY_DEADLINE_V233 = 2800",
    "AUTH_GATEWAY_DEADLINE_V233 = 4200",
    "staleDataUnauthorizedV233",
    "staleHtmlShellV233",
    "V233_GATEWAY_TIMEOUT",
    "direct-supabase-fallback",
    "return nativeFetch(directInput, init)",
    "persistSession: true",
    "autoRefreshToken: true",
  ];
  for (const marker of markers) if (!source.includes(marker)) throw new Error(`V233_DATA_TRANSPORT_VERIFY_FAILED:${marker}`);

  const start = source.indexOf("async function fetchGatewayWithDeadlineV233");
  const end = source.indexOf("async function authAwareFetch", start);
  const section = source.slice(start, end);
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(section)) throw new Error("V233_DESTRUCTIVE_TRANSPORT_ACTION");
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
    if (!source.includes(oldShell)) throw new Error("V233_SHELL_V232_ANCHOR_MISSING");
    source = source.replace(oldShell, nextShell);
  }
  const oldAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V232}-${ACTIVE_CACHE_RELEASE_V232}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const nextAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V233}-${ACTIVE_CACHE_RELEASE_V233}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(nextAsset)) {
    if (!source.includes(oldAsset)) throw new Error("V233_ASSET_V232_ANCHOR_MISSING");
    source = source.replace(oldAsset, nextAsset);
  }
  source = source
    .replace("    version: ACTIVE_VERSION_V232,", "    version: ACTIVE_VERSION_V233,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V232,", "    release: ACTIVE_CACHE_RELEASE_V233,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V232", "NGE_BLOGGING_UPDATE_AVAILABLE_V233")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v233 publishes a fresh data transport shell without forced navigation.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V233_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V233_DESTRUCTIVE_SW_ACTION");
  await write(path, source);
}

async function verifyPreservedAuthorities() {
  const [transport, runtime, css, release] = await Promise.all([
    read("src/lib/supabase.js"),
    read("src/studio-production-v232.js"),
    read("src/studio-production-v232.css"),
    read("public/release-v233.json"),
  ]);
  if (!transport.includes("dataReauthReleaseV224") || !transport.includes("dataTransportReleaseV233")) throw new Error("V233_V224_HANDOFF_MISSING");
  if (!runtime.includes("studio-production-v232-single-n-theme-actions-20260803")) throw new Error("V233_V232_RUNTIME_MISSING");
  if (!css.includes('data-v232-family="large"') || !css.includes('data-v232-family="small"')) throw new Error("V233_V232_LAYOUT_MISSING");
  if (!release.includes(RELEASE)) throw new Error("V233_RELEASE_CONTRACT_MISSING");
}

await patchSupabaseTransport();
await patchServiceWorker();
await verifyPreservedAuthorities();
console.log(`Applied ${RELEASE}; v224 session refresh remains active, while v233 adds bounded gateway failover and stale-route recovery without automatic logout.`);
