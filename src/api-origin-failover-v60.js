const RELEASE = "api-origin-failover-v60-20260727";
const API_ORIGIN = "https://api.ngeblogging.com";
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

function backupRequest(request) {
  const current = new URL(request.url);
  const backup = new URL(`${current.pathname}${current.search}`, API_ORIGIN);
  return new Request(backup, request);
}

async function responseDetails(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const json = contentType.includes("application/json") || contentType.includes("+json");
  return { json, retryable: !json || [404, 405, 502, 503, 504].includes(response.status) };
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

async function resilientFetch(input, init) {
  if (!isApiUrl(input)) return nativeFetch(input, init);

  const primary = requestFor(input, init);
  const primaryUrl = new URL(primary.url);
  const alreadyBackup = primaryUrl.origin === API_ORIGIN;
  let primaryResponse = null;
  let primaryFailure = null;

  try {
    primaryResponse = await nativeFetch(primary.clone());
    const details = await responseDetails(primaryResponse);
    if (!details.retryable || alreadyBackup) return primaryResponse;
  } catch (error) {
    primaryFailure = error;
    if (alreadyBackup) throw error;
  }

  let secondaryResponse = null;
  let secondaryFailure = null;
  try {
    secondaryResponse = await nativeFetch(backupRequest(primary.clone()));
    const details = await responseDetails(secondaryResponse);
    if (details.json) {
      window.dispatchEvent(new CustomEvent("ngeblogging:api-failover", {
        detail: { path: primaryUrl.pathname, from: primaryUrl.origin, to: API_ORIGIN, status: secondaryResponse.status },
      }));
      return secondaryResponse;
    }
  } catch (error) {
    secondaryFailure = error;
  }

  const status = secondaryResponse?.status || primaryResponse?.status || 502;
  const requestId = secondaryResponse?.headers.get("x-request-id") || primaryResponse?.headers.get("x-request-id") || "";
  const message = status === 404 || status === 405
    ? "API domain belum terpasang pada deployment aktif. Sistem sudah mencoba jalur utama dan jalur API cadangan."
    : status === 401
      ? "Sesi masuk tidak diterima oleh layanan domain. Silakan masuk kembali."
      : status === 403
        ? "Layanan domain menolak permintaan ini. Periksa izin akun dan konfigurasi Cloudflare."
        : "Layanan domain belum dapat dijangkau melalui jalur utama maupun jalur API cadangan.";

  return diagnosticResponse(message, status >= 400 && status <= 599 ? status : 502, "DOMAIN_API_ROUTE_UNAVAILABLE", {
    status,
    requestId: requestId || null,
    primaryOrigin: primaryUrl.origin,
    backupOrigin: API_ORIGIN,
    primaryFailure: primaryFailure?.message || null,
    backupFailure: secondaryFailure?.message || null,
  });
}

if (!window.__ngebloggingApiOriginFailoverV60) {
  window.__ngebloggingApiOriginFailoverV60 = RELEASE;
  window.fetch = resilientFetch;
  document.documentElement.dataset.apiOriginFailoverV60 = RELEASE;
}
