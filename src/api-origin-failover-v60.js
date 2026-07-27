const RELEASE = "api-origin-failover-v65-20260727";
const LEGACY_V61_RELEASE = "api-origin-failover-v61-20260727";
const LEGACY_V60_RELEASE = "api-origin-failover-v60-20260727";
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
    bodyPreview = text.slice(0, 320);
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  const validJson = Boolean(payload && typeof payload === "object" && !Array.isArray(payload));
  const usefulError = Boolean(validJson && (payload.error || payload.code || payload.message));
  const retryableStatus = [404, 405, 408, 425, 429, 500, 502, 503, 504].includes(response.status);
  return {
    claimsJson,
    validJson,
    usefulError,
    payload,
    bodyPreview,
    retryable: !response.ok && (!validJson || !usefulError || retryableStatus),
  };
}

function diagnosticResponse(message, status = 502, code = "DOMAIN_API_UNAVAILABLE", details = {}) {
  const payload = {
    code,
    error: message,
    release: RELEASE,
    ...details,
  };
  window.__ngebloggingLastDomainDiagnostic = payload;
  window.dispatchEvent(new CustomEvent("ngeblogging:domain-api-diagnostic", { detail: payload }));
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
    },
  }));
}

function statusMessage(status) {
  if (status === 400) return "Data domain ditolak karena format permintaan tidak valid.";
  if (status === 401) return "Sesi masuk tidak diterima oleh layanan domain. Silakan masuk kembali.";
  if (status === 403) return "Layanan domain menolak izin permintaan pada jalur aktif.";
  if (status === 404 || status === 405) return "API domain belum terpasang pada jalur situs aktif maupun Worker cadangan.";
  if (status === 409) return "Permintaan domain berbenturan dengan status domain yang sudah tersimpan.";
  if (status === 429) return "Layanan domain sedang membatasi permintaan. Coba kembali beberapa saat lagi.";
  return "Layanan domain belum dapat memberikan respons yang dapat diproses.";
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

    if (primaryResponse.ok) return primaryResponse;
    if (primaryDetails.usefulError) return primaryResponse;

    if (alreadyBackup) {
      const requestId = primaryResponse.headers.get("x-request-id") || "";
      return diagnosticResponse(
        statusMessage(primaryResponse.status),
        primaryResponse.status >= 400 && primaryResponse.status <= 599 ? primaryResponse.status : 502,
        "DOMAIN_API_EMPTY_ERROR",
        {
          status: primaryResponse.status,
          requestId: requestId || null,
          primaryOrigin: primaryUrl.origin,
          backupOrigin: API_ORIGIN,
          primaryBodyPreview: primaryDetails.bodyPreview || null,
        },
      );
    }
  } catch (error) {
    primaryFailure = error;
    if (alreadyBackup) {
      return diagnosticResponse(
        "Worker API domain tidak dapat dijangkau.",
        502,
        "DOMAIN_API_NETWORK_ERROR",
        {
          status: 502,
          requestId: null,
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
    secondaryResponse = await nativeFetch(await backupRequest(primary.clone()));
    secondaryDetails = await responseDetails(secondaryResponse);

    if (secondaryResponse.ok || secondaryDetails.usefulError) {
      dispatchFailover(primaryUrl, secondaryResponse);
      return secondaryResponse;
    }
  } catch (error) {
    secondaryFailure = error;
  }

  const status = secondaryResponse?.status || primaryResponse?.status || 502;
  const requestId = secondaryResponse?.headers.get("x-request-id")
    || primaryResponse?.headers.get("x-request-id")
    || "";

  return diagnosticResponse(
    statusMessage(status),
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

if (!window.__ngebloggingApiOriginFailoverV65) {
  window.__ngebloggingApiOriginFailoverV65 = RELEASE;
  window.__ngebloggingApiOriginFailoverV61 = LEGACY_V61_RELEASE;
  window.__ngebloggingApiOriginFailoverV60 = LEGACY_V60_RELEASE;
  window.fetch = resilientFetch;
  document.documentElement.dataset.apiOriginFailoverV65 = RELEASE;
}
