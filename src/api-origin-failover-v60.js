const RELEASE = "api-origin-failover-v61-20260727";
// Compatibility marker: api-origin-failover-v60-20260727
const API_ORIGIN = "https://ngeblogging.triapriyogibahari7.workers.dev";
const nativeFetch = window.fetch.bind(window);

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
    integrity: request.integrity,
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
    bodyPreview = text.slice(0, 240);
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  const validJson = Boolean(payload && typeof payload === "object");
  const retryableStatus = [404, 405, 502, 503, 504].includes(response.status);
  return {
    claimsJson,
    validJson,
    payload,
    bodyPreview,
    retryable: !validJson || retryableStatus,
  };
}

function diagnosticResponse(message, status = 502, code = "DOMAIN_API_UNAVAILABLE", details = {}) {
  return new Response(JSON.stringify({
    code,
    error: message,
    release: RELEASE,
    ...details,
  }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-ngeblogging-api-failover": RELEASE,
    },
  });
}

function usefulErrorPayload(details) {
  const payload = details?.payload;
  return Boolean(payload && (payload.error || payload.code));
}

async function resilientFetch(input, init) {
  if (!isApiUrl(input)) return nativeFetch(input, init);

  const primary = requestFor(input, init);
  const primaryUrl = new URL(primary.url);
  const alreadyBackup = primaryUrl.origin === API_ORIGIN;
  let primaryResponse = null;
  let primaryDetails = null;
  let primaryFailure = null;

  try {
    primaryResponse = await nativeFetch(primary.clone());
    primaryDetails = await responseDetails(primaryResponse);
    if (!primaryDetails.retryable || alreadyBackup || usefulErrorPayload(primaryDetails)) {
      return primaryResponse;
    }
  } catch (error) {
    primaryFailure = error;
    if (alreadyBackup) throw error;
  }

  let secondaryResponse = null;
  let secondaryDetails = null;
  let secondaryFailure = null;
  try {
    secondaryResponse = await nativeFetch(await backupRequest(primary.clone()));
    secondaryDetails = await responseDetails(secondaryResponse);
    if (secondaryDetails.validJson) {
      window.dispatchEvent(new CustomEvent("ngeblogging:api-failover", {
        detail: {
          path: primaryUrl.pathname,
          from: primaryUrl.origin,
          to: API_ORIGIN,
          status: secondaryResponse.status,
        },
      }));
      return secondaryResponse;
    }
  } catch (error) {
    secondaryFailure = error;
  }

  const status = secondaryResponse?.status || primaryResponse?.status || 502;
  const requestId = secondaryResponse?.headers.get("x-request-id")
    || primaryResponse?.headers.get("x-request-id")
    || "";
  const message = status === 404 || status === 405
    ? "API domain belum terpasang pada jalur situs aktif maupun Worker cadangan."
    : status === 401
      ? "Sesi masuk tidak diterima oleh layanan domain. Silakan masuk kembali."
      : status === 403
        ? "Layanan domain menolak permintaan. Sistem akan menampilkan izin Cloudflare yang diperlukan setelah respons JSON tersedia."
        : "Layanan domain belum dapat dijangkau melalui jalur situs maupun Worker API cadangan.";

  return diagnosticResponse(
    message,
    status >= 400 && status <= 599 ? status : 502,
    "DOMAIN_API_ROUTE_UNAVAILABLE",
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

if (!window.__ngebloggingApiOriginFailoverV61) {
  window.__ngebloggingApiOriginFailoverV61 = RELEASE;
  window.__ngebloggingApiOriginFailoverV60 = RELEASE;
  window.fetch = resilientFetch;
  document.documentElement.dataset.apiOriginFailoverV61 = RELEASE;
}
