const RELEASE = "api-origin-failover-domain-safe-v145-20261030";
const LEGACY_V73_RELEASE = "api-origin-failover-v73-20260727";
const LEGACY_V65_RELEASE = "api-origin-failover-v65-20260727";
const LEGACY_V61_RELEASE = "api-origin-failover-v61-20260727";
const LEGACY_V60_RELEASE = "api-origin-failover-v60-20260727";
const API_ORIGIN = "https://ngeblogging.triapriyogibahari7.workers.dev";
const PRIMARY_TIMEOUT_MS = 8_000;
const BACKUP_TIMEOUT_MS = 10_000;
const MUTATION_TIMEOUT_MS = 30_000;
const nativeFetch = window.fetch.bind(window);

function requestUrl(value) {
  try {
    return value instanceof Request ? new URL(value.url) : new URL(String(value), location.href);
  } catch {
    return null;
  }
}

function isDomainApiUrl(value) {
  const url = requestUrl(value);
  return Boolean(url && (url.origin === location.origin || url.origin === API_ORIGIN) && (
    url.pathname.startsWith("/api/domains/")
    || url.pathname.startsWith("/api/domain-redirects/")
  ));
}

function requestFor(input, init) {
  if (input instanceof Request) return new Request(input, init);
  return new Request(new URL(String(input), location.href), init);
}

function timeoutReason(label, milliseconds) {
  const message = `${label} tidak merespons dalam ${Math.round(milliseconds / 1000)} detik.`;
  try { return new DOMException(message, "TimeoutError"); }
  catch { return Object.assign(new Error(message), { name: "TimeoutError" }); }
}

async function timedNativeFetch(request, milliseconds, label) {
  const controller = new AbortController();
  const sourceSignal = request.signal;
  if (sourceSignal?.aborted) throw sourceSignal.reason || new DOMException("Permintaan dibatalkan.", "AbortError");
  let rejectAbort;
  const aborted = new Promise((_, reject) => { rejectAbort = reject; });
  const abort = (reason) => { controller.abort(reason); rejectAbort(reason); };
  const relayAbort = () => abort(sourceSignal.reason || new DOMException("Permintaan dibatalkan.", "AbortError"));
  sourceSignal?.addEventListener("abort", relayAbort, { once: true });
  const timer = setTimeout(() => abort(timeoutReason(label, milliseconds)), milliseconds);
  try {
    return await Promise.race([
      (async () => {
        const response = await nativeFetch(new Request(request, { signal: controller.signal }));
        const body = request.method === "HEAD" || [204,205,304].includes(response.status) ? null : await response.arrayBuffer();
        const headers = new Headers(response.headers);
        headers.delete("content-encoding");
        headers.delete("content-length");
        return new Response(body, {status:response.status,statusText:response.statusText,headers});
      })(),
      aborted,
    ]);
  } finally {
    clearTimeout(timer);
    sourceSignal?.removeEventListener("abort", relayAbort);
  }
}

function backupRequest(request) {
  const current = new URL(request.url);
  return new Request(new URL(`${current.pathname}${current.search}`, API_ORIGIN), {
    method: request.method,
    headers: new Headers(request.headers),
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    signal: request.signal,
  });
}

async function responseDetails(response) {
  let payload = null;
  try { payload = await response.clone().json(); } catch {}
  const validJson = Boolean(payload && typeof payload === "object" && !Array.isArray(payload));
  const validRegistration = validJson && ["id", "site_id", "hostname"].every(key => typeof payload.domain?.[key] === "string" && payload.domain[key].trim().length > 0);
  return {validJson,validRegistration,usefulError:Boolean(validJson && (payload.error || payload.code || payload.message))};
}

function diagnosticResponse(message, status = 502, code = "DOMAIN_API_UNAVAILABLE", details = {}) {
  const payload = {code,error:message,release:RELEASE,...details};
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
    detail: {path:primaryUrl.pathname,from:primaryUrl.origin,to:API_ORIGIN,status:secondaryResponse.status},
  }));
}

function statusMessage(status) {
  if (status === 400) return "Data domain ditolak karena format permintaan tidak valid.";
  if (status === 401) return "Sesi masuk tidak diterima oleh layanan domain. Silakan masuk kembali.";
  if (status === 403) return "Layanan domain menolak izin permintaan pada jalur aktif.";
  if (status === 404 || status === 405) return "API domain belum tersedia pada jalur yang diperiksa.";
  if (status === 408) return "API domain melewati batas waktu. Subdomain gratis tetap tersedia.";
  if (status === 409) return "Permintaan domain berbenturan dengan status domain yang sudah tersimpan.";
  if (status === 429) return "Layanan domain sedang membatasi permintaan. Coba kembali beberapa saat lagi.";
  return "Layanan domain belum dapat memberikan respons yang dapat diproses.";
}

async function resilientDomainFetch(input, init) {
  // Only domain APIs use this policy. Publication, auth, editor and Nara pass through unchanged.
  if (!isDomainApiUrl(input)) return nativeFetch(input, init);
  const primary = requestFor(input, init);
  if (primary.signal.aborted) throw primary.signal.reason || new DOMException("Permintaan dibatalkan.", "AbortError");
  const primaryUrl = new URL(primary.url);
  const readOnly = ["GET","HEAD"].includes(primary.method);
  const registration = primary.method === "POST" && primaryUrl.pathname === "/api/domains/register";
  const alreadyBackup = primaryUrl.origin === API_ORIGIN;
  let primaryResponse = null, primaryFailure = null;
  try {
    primaryResponse = await timedNativeFetch(primary.clone(), readOnly ? PRIMARY_TIMEOUT_MS : MUTATION_TIMEOUT_MS, "API domain Ngeblogging");
    const details = await responseDetails(primaryResponse);
    const accepted = primaryResponse.ok && (details.validJson || primary.method === "HEAD") && (!registration || details.validRegistration);
    const reportedError = details.usefulError && (!registration || !primaryResponse.ok);
    if (accepted || reportedError) return primaryResponse;
  } catch (error) {
    if (primary.signal.aborted) throw primary.signal.reason || error;
    primaryFailure = error;
  }

  if (!readOnly) {
    const status = primaryFailure?.name === "TimeoutError" ? 408 : primaryResponse?.status >= 400 ? primaryResponse.status : 502;
    return diagnosticResponse(
      "Hasil perubahan domain belum dapat dipastikan. Permintaan tidak dikirim ulang otomatis. Periksa status domain sebelum mencoba menghubungkan kembali; subdomain gratis tetap tersedia.",
      status,
      "DOMAIN_API_MUTATION_UNCERTAIN",
      {status,requestId:primaryResponse?.headers.get("x-request-id") || null,primaryOrigin:primaryUrl.origin,backupOrigin:null,method:primary.method,path:primaryUrl.pathname,mutationOutcome:"unknown",retryAutomatically:false},
    );
  }

  if (alreadyBackup) {
    const status = primaryFailure?.name === "TimeoutError" ? 408 : primaryResponse?.status >= 400 ? primaryResponse.status : 502;
    return diagnosticResponse(statusMessage(status),status,primaryFailure?.name === "TimeoutError" ? "DOMAIN_API_TIMEOUT" : "DOMAIN_API_ROUTE_UNAVAILABLE",{status,requestId:primaryResponse?.headers.get("x-request-id") || null,primaryOrigin:primaryUrl.origin,backupOrigin:API_ORIGIN});
  }

  let secondaryResponse = null, secondaryFailure = null;
  try {
    secondaryResponse = await timedNativeFetch(backupRequest(primary.clone()), BACKUP_TIMEOUT_MS, "Worker cadangan Ngeblogging");
    const details = await responseDetails(secondaryResponse);
    if ((secondaryResponse.ok && (details.validJson || primary.method === "HEAD")) || details.usefulError) {
      dispatchFailover(primaryUrl, secondaryResponse);
      return secondaryResponse;
    }
  } catch (error) {
    if (primary.signal.aborted) throw primary.signal.reason || error;
    secondaryFailure = error;
  }
  const timedOut = primaryFailure?.name === "TimeoutError" || secondaryFailure?.name === "TimeoutError";
  const candidate = secondaryResponse?.status || primaryResponse?.status;
  const status = timedOut ? 408 : candidate >= 400 ? candidate : 502;
  return diagnosticResponse(timedOut ? "Pembacaan status domain melewati batas waktu. Subdomain gratis tetap dapat digunakan." : statusMessage(status),status,timedOut ? "DOMAIN_API_TIMEOUT" : "DOMAIN_API_ROUTE_UNAVAILABLE",{status,requestId:secondaryResponse?.headers.get("x-request-id") || primaryResponse?.headers.get("x-request-id") || null,primaryOrigin:primaryUrl.origin,backupOrigin:API_ORIGIN});
}

if (!window.__ngebloggingApiOriginFailoverV144) {
  window.__ngebloggingApiOriginFailoverV144 = RELEASE;
  window.__ngebloggingApiOriginFailoverV73 = LEGACY_V73_RELEASE;
  window.__ngebloggingApiOriginFailoverV65 = LEGACY_V65_RELEASE;
  window.__ngebloggingApiOriginFailoverV61 = LEGACY_V61_RELEASE;
  window.__ngebloggingApiOriginFailoverV60 = LEGACY_V60_RELEASE;
  window.fetch = resilientDomainFetch;
  document.documentElement.dataset.apiOriginFailoverV144 = RELEASE;
}

export { RELEASE, isDomainApiUrl, resilientDomainFetch };
