const RELEASE = "api-origin-failover-v130-20260729";
const LEGACY_V73_RELEASE = "api-origin-failover-v73-20260727";
const LEGACY_V65_RELEASE = "api-origin-failover-v65-20260727";
const LEGACY_V61_RELEASE = "api-origin-failover-v61-20260727";
const LEGACY_V60_RELEASE = "api-origin-failover-v60-20260727";
const API_ORIGIN = "https://ngeblogging.triapriyogibahari7.workers.dev";
const nativeFetch = window.fetch.bind(window);
const RETRYABLE_STATUS = new Set([404, 405, 408, 425, 429, 500, 502, 503, 504]);

function isApiUrl(value) {
  try {
    const url = value instanceof Request ? new URL(value.url) : new URL(String(value), location.href);
    return url.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function requestFor(input, init) {
  if (input instanceof Request) return new Request(input, init);
  return new Request(new URL(String(input), location.href), init);
}

function timeoutFor(pathname, backup = false) {
  if (pathname === "/api/nara") return backup ? 48_000 : 4_500;
  if (pathname.startsWith("/api/domains/")) return backup ? 14_000 : 7_000;
  return backup ? 12_000 : 7_000;
}

function timeoutReason(label, milliseconds) {
  const message = `${label} tidak merespons dalam ${Math.round(milliseconds / 1000)} detik.`;
  try {
    return new DOMException(message, "TimeoutError");
  } catch {
    return Object.assign(new Error(message), { name: "TimeoutError" });
  }
}

async function timedNativeFetch(request, milliseconds, label) {
  const controller = new AbortController();
  const sourceSignal = request.signal;
  const relayAbort = () => controller.abort(sourceSignal?.reason);
  if (sourceSignal?.aborted) relayAbort();
  else sourceSignal?.addEventListener("abort", relayAbort, { once: true });
  const timer = setTimeout(() => controller.abort(timeoutReason(label, milliseconds)), milliseconds);
  try {
    return await nativeFetch(new Request(request, { signal: controller.signal, cache: "no-store" }));
  } finally {
    clearTimeout(timer);
    sourceSignal?.removeEventListener("abort", relayAbort);
  }
}

async function backupRequest(request) {
  const current = new URL(request.url);
  const backup = new URL(`${current.pathname}${current.search}`, API_ORIGIN);
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.clone().arrayBuffer() : undefined;
  return new Request(backup, {
    method: request.method,
    headers: new Headers(request.headers),
    body,
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    redirect: request.redirect,
    referrerPolicy: request.referrerPolicy,
    keepalive: request.keepalive,
    signal: request.signal,
  });
}

async function responseDetails(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const claimsJson = contentType.includes("application/json") || contentType.includes("+json");
  let payload = null;
  let bodyPreview = "";
  try {
    const text = await response.clone().text();
    bodyPreview = text.slice(0, 420);
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  const validJson = Boolean(payload && typeof payload === "object" && !Array.isArray(payload));
  const usefulError = Boolean(validJson && (payload.error || payload.code || payload.message));
  return { claimsJson, validJson, usefulError, payload, bodyPreview };
}

function endpointLabel(pathname) {
  if (pathname === "/api/nara") return "Nara AI";
  if (pathname.startsWith("/api/domains/")) return "Domain";
  if (pathname === "/api/health") return "kesehatan platform";
  return "API Ngeblogging";
}

function diagnosticMessage(pathname, timedOut) {
  const label = endpointLabel(pathname);
  if (timedOut) return `${label} melewati batas waktu pada jalur utama dan Worker cadangan. Silakan coba lagi.`;
  if (pathname === "/api/nara") return "Nara belum menerima respons yang dapat diproses dari jalur utama maupun Worker AI cadangan.";
  if (pathname.startsWith("/api/domains/")) return "Layanan Domain belum memberikan respons yang dapat diproses. Subdomain gratis tetap tersedia.";
  return `${label} belum dapat dijangkau melalui jalur utama maupun Worker cadangan.`;
}

function diagnosticResponse(pathname, message, status = 502, code = "API_ROUTE_UNAVAILABLE", details = {}) {
  const payload = {
    code,
    error: message,
    path: pathname,
    release: RELEASE,
    retryable: true,
    ...details,
  };
  window.__ngebloggingLastApiDiagnostic = payload;
  window.dispatchEvent(new CustomEvent("ngeblogging:api-diagnostic", { detail: payload }));
  if (pathname.startsWith("/api/domains/")) {
    window.__ngebloggingLastDomainDiagnostic = payload;
    window.dispatchEvent(new CustomEvent("ngeblogging:domain-api-diagnostic", { detail: payload }));
  }
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-ngeblogging-api-failover": RELEASE,
      ...(details.requestId ? { "x-request-id": String(details.requestId) } : {}),
    },
  });
}

function dispatchFailover(primaryUrl, secondaryResponse) {
  window.dispatchEvent(new CustomEvent("ngeblogging:api-failover", {
    detail: {
      path: primaryUrl.pathname,
      from: primaryUrl.origin,
      to: API_ORIGIN,
      status: secondaryResponse.status,
      release: RELEASE,
    },
  }));
}

function shouldRetry(response, details) {
  if (response.ok) return false;
  if (RETRYABLE_STATUS.has(response.status)) return true;
  if (!details.claimsJson || !details.validJson) return true;
  return false;
}

async function resilientFetch(input, init) {
  if (!isApiUrl(input)) return nativeFetch(input, init);

  const primary = requestFor(input, init);
  const primaryUrl = new URL(primary.url);
  const pathname = primaryUrl.pathname;
  const alreadyBackup = primaryUrl.origin === API_ORIGIN;
  let primaryResponse = null;
  let primaryDetails = null;
  let primaryFailure = null;

  try {
    primaryResponse = await timedNativeFetch(
      primary.clone(),
      timeoutFor(pathname, false),
      `${endpointLabel(pathname)} utama`,
    );
    primaryDetails = await responseDetails(primaryResponse);
    if (primaryResponse.ok || !shouldRetry(primaryResponse, primaryDetails)) return primaryResponse;
    if (alreadyBackup) return primaryResponse;
  } catch (error) {
    primaryFailure = error;
    if (primary.signal.aborted) throw primary.signal.reason || error;
    if (alreadyBackup) {
      const timedOut = error?.name === "TimeoutError";
      return diagnosticResponse(
        pathname,
        diagnosticMessage(pathname, timedOut),
        timedOut ? 408 : 502,
        timedOut ? "API_TIMEOUT" : "API_NETWORK_ERROR",
        {
          primaryOrigin: primaryUrl.origin,
          backupOrigin: API_ORIGIN,
          primaryFailure: error?.message || null,
        },
      );
    }
  }

  let secondaryResponse = null;
  let secondaryDetails = null;
  let secondaryFailure = null;
  try {
    const secondaryRequest = await backupRequest(primary.clone());
    secondaryResponse = await timedNativeFetch(
      secondaryRequest,
      timeoutFor(pathname, true),
      `${endpointLabel(pathname)} Worker cadangan`,
    );
    secondaryDetails = await responseDetails(secondaryResponse);
    if (secondaryResponse.ok || secondaryDetails.usefulError || secondaryDetails.validJson) {
      dispatchFailover(primaryUrl, secondaryResponse);
      return secondaryResponse;
    }
  } catch (error) {
    secondaryFailure = error;
    if (primary.signal.aborted) throw primary.signal.reason || error;
  }

  const timedOut = primaryFailure?.name === "TimeoutError" || secondaryFailure?.name === "TimeoutError";
  const status = timedOut ? 408 : secondaryResponse?.status || primaryResponse?.status || 502;
  const requestId = secondaryResponse?.headers.get("x-request-id")
    || primaryResponse?.headers.get("x-request-id")
    || "";

  return diagnosticResponse(
    pathname,
    diagnosticMessage(pathname, timedOut),
    status >= 400 && status <= 599 ? status : 502,
    timedOut ? "API_TIMEOUT" : "API_ROUTE_UNAVAILABLE",
    {
      status,
      requestId: requestId || null,
      primaryOrigin: primaryUrl.origin,
      backupOrigin: API_ORIGIN,
      primaryFailure: primaryFailure?.message || null,
      backupFailure: secondaryFailure?.message || null,
      primaryBodyPreview: primaryDetails?.bodyPreview || null,
      backupBodyPreview: secondaryDetails?.bodyPreview || null,
    },
  );
}

if (!window.__ngebloggingApiOriginFailoverV130) {
  window.__ngebloggingApiOriginFailoverV130 = RELEASE;
  window.__ngebloggingApiOriginFailoverV73 = LEGACY_V73_RELEASE;
  window.__ngebloggingApiOriginFailoverV65 = LEGACY_V65_RELEASE;
  window.__ngebloggingApiOriginFailoverV61 = LEGACY_V61_RELEASE;
  window.__ngebloggingApiOriginFailoverV60 = LEGACY_V60_RELEASE;
  window.fetch = resilientFetch;
  document.documentElement.dataset.apiOriginFailoverV130 = RELEASE;
}
