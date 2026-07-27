import baseWorker from "./worker-v37.mjs";
import { freeDomainReadiness, handleFreeDomainRequest } from "../server/free-domain-handler.mjs";
import { handleQuickDomainDetach } from "../server/quick-domain-detach-handler.mjs";
import { canonicalDomainRedirect } from "../server/canonical-domain-redirect.mjs";

const RELEASE = "2026.07.27-full-zone-domains-v65";
const REGISTRATION_RECOVERY_RELEASE = "2026.07.27-domain-registration-recovery-v65";
const REVERSIBLE_DETACH_RELEASE = "2026.07.27-reversible-domain-detach-v64";
const CANONICAL_DOMAIN_RELEASE = "2026.07.27-canonical-custom-domain-v65";
const LEGACY_FULL_ZONE_RELEASE = "2026.07.27-full-zone-domains-v62";
const LEGACY_DOMAIN_RELEASE = "2026.07.26-custom-domains-v41";

function databaseAccessReady(env) {
  return Boolean(
    String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim()
    && String(
      env.SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_ANON_KEY
      || "",
    ).trim(),
  );
}

function fullZoneDomainReadiness(env) {
  const dedicatedDomainToken = String(env.CLOUDFLARE_DOMAIN_API_TOKEN || "").trim();
  const deploymentToken = String(env.CLOUDFLARE_API_TOKEN || "").trim();
  const effectiveToken = dedicatedDomainToken || deploymentToken;
  const bindings = {
    apiToken: Boolean(effectiveToken),
    domainApiToken: Boolean(dedicatedDomainToken),
    accountId: /^[0-9a-f]{32}$/i.test(String(env.CLOUDFLARE_ACCOUNT_ID || "").trim()),
    workerService: Boolean(String(env.CLOUDFLARE_WORKER_SERVICE || "ngeblogging").trim()),
    databaseAccess: databaseAccessReady(env),
  };

  const ready = bindings.apiToken
    && bindings.accountId
    && bindings.workerService
    && bindings.databaseAccess;

  return {
    provider: "cloudflare-full-zone",
    mode: "full-zone-nameserver",
    automation: true,
    bindings,
    ready,
    enabled: ready,
    serviceRoleRequired: false,
    databaseMode: "user-jwt-rls",
    cnameTarget: null,
    apexTarget: null,
  };
}

function cloudflareSaasReadiness(env) {
  const bindings = {
    apiToken: Boolean(String(env.CLOUDFLARE_API_TOKEN || "").trim()),
    zoneId: Boolean(String(env.CLOUDFLARE_ZONE_ID || "").trim()),
    cnameTarget: Boolean(String(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET || "").trim()),
    databaseAccess: databaseAccessReady(env),
    providerApi: String(env.CLOUDFLARE_CUSTOM_HOSTNAMES_READY || "").trim().toLowerCase() === "true",
  };

  const ready = Object.values(bindings).every(Boolean);

  return {
    provider: "cloudflare-custom-hostnames",
    mode: "cloudflare-for-saas",
    automation: true,
    bindings,
    ready,
    enabled: ready,
    serviceRoleRequired: false,
    databaseMode: "user-jwt-rls",
    cnameTarget: String(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET || "").trim().toLowerCase().replace(/\.$/, ""),
    apexTarget: null,
  };
}

function selectedDomainProvider(env) {
  const requested = String(env.CUSTOM_DOMAIN_PROVIDER || "auto").trim().toLowerCase();
  const fullZone = fullZoneDomainReadiness(env);
  const cloudflareSaas = cloudflareSaasReadiness(env);
  const netlify = freeDomainReadiness(env);

  if (requested === "cloudflare-full-zone") return fullZone;
  if (requested === "cloudflare" || requested === "cloudflare-custom-hostnames") return cloudflareSaas;
  if (requested === "netlify") return { ...netlify, ready: netlify.enabled };
  if (fullZone.ready) return fullZone;
  if (cloudflareSaas.ready) return cloudflareSaas;
  return netlify.enabled ? { ...netlify, ready: true } : fullZone;
}

async function enrichHealth(response, env) {
  if (!response.ok) return response;

  try {
    const payload = await response.clone().json();
    const domain = selectedDomainProvider(env);
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "no-store");

    return new Response(JSON.stringify({
      ...payload,
      domainRelease: RELEASE,
      domainReleaseCurrent: RELEASE,
      domainRegistrationRecovery: REGISTRATION_RECOVERY_RELEASE,
      reversibleDomainDetach: REVERSIBLE_DETACH_RELEASE,
      canonicalCustomDomain: CANONICAL_DOMAIN_RELEASE,
      domainReleaseCompatibility: [LEGACY_FULL_ZONE_RELEASE, LEGACY_DOMAIN_RELEASE],
      customDomains: Boolean(domain.ready || domain.enabled),
      customDomainProvider: domain.provider,
      customDomainMode: domain.mode,
      customDomainAutomation: Boolean(domain.automation),
      customDomainBindings: domain.bindings,
      customDomainDatabaseMode: domain.databaseMode,
      customDomainServiceRoleRequired: domain.serviceRoleRequired,
      customHostnameTarget: domain.cnameTarget || null,
      customDomainApexTarget: domain.apexTarget || null,
      customDomainPaidSaasRequired: false,
      customDomainCapacity: {
        architecture: "one-zone-per-root-domain",
        testedTarget: 100,
        canonicalRedirect: true,
        freeSubdomainFallback: true,
      },
    }), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return response;
  }
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function isFullZoneRegistration(request, url, domain) {
  return request.method === "POST"
    && url.pathname === "/api/domains/register"
    && domain.provider === "cloudflare-full-zone"
    && domain.enabled;
}

function isFullZoneRemoval(request, url, domain) {
  return request.method === "POST"
    && url.pathname === "/api/domains/remove"
    && domain.provider === "cloudflare-full-zone"
    && domain.enabled;
}

async function registrationFailureDetails(response) {
  let payload = null;
  try {
    payload = await response.clone().json();
  } catch {
    payload = null;
  }

  const code = String(payload?.code || "");
  const retryableCode = new Set([
    "FULL_ZONE_NAMESERVERS_UNAVAILABLE",
    "INVALID_CLOUDFLARE_RESPONSE",
    "DOMAIN_ERROR",
    "WORKER_INTERNAL_ERROR",
    "DOMAIN_DATABASE_ERROR",
    "FULL_ZONE_STORAGE_FAILED",
  ]).has(code);

  const terminalCode = new Set([
    "CLOUDFLARE_ZONE_CREATE_PERMISSION_REQUIRED",
    "CLOUDFLARE_DOMAIN_TOKEN_INVALID",
    "CUSTOM_DOMAIN_NOT_CONFIGURED",
    "AUTH_REQUIRED",
    "INVALID_SESSION",
    "SITE_MANAGER_REQUIRED",
    "DOMAIN_ALREADY_USED",
    "INVALID_ROOT_DOMAIN",
    "INVALID_DOMAIN",
    "INVALID_SITE",
  ]).has(code);

  return {
    payload,
    retry: !terminalCode && (
      retryableCode
      || [408, 425, 429, 500, 502, 503, 504].includes(response.status)
      || !payload
      || !(payload.error || payload.code)
    ),
  };
}

function withReleaseHeader(response, name, value) {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function domainErrorMessage(status) {
  if (status === 400) return "Data domain tidak valid. Masukkan domain akar tanpa https://, www, path, atau parameter.";
  if (status === 401) return "Sesi pengguna sudah tidak berlaku. Silakan masuk kembali.";
  if (status === 403) return "Akun ini belum memiliki izin untuk mengelola domain pada situs tersebut.";
  if (status === 409) return "Domain berbenturan dengan domain atau zone yang sudah terhubung.";
  if (status === 429) return "Cloudflare sedang membatasi permintaan. Coba kembali beberapa saat lagi.";
  return "Layanan domain belum mengembalikan respons yang lengkap.";
}

async function normalizeDomainApiResponse(response, request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/domains/") || response.ok) return response;

  const requestId = response.headers.get("x-request-id") || crypto.randomUUID();
  const text = await response.clone().text().catch(() => "");
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-request-id", requestId);
  headers.set("x-ngeblogging-domain-normalized-error", RELEASE);

  if (payload && typeof payload === "object" && !Array.isArray(payload) && (payload.error || payload.code)) {
    return new Response(JSON.stringify({
      ...payload,
      requestId: payload.requestId || requestId,
      status: payload.status || response.status,
    }), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return new Response(JSON.stringify({
    code: "DOMAIN_API_EMPTY_ERROR",
    error: domainErrorMessage(response.status),
    status: response.status,
    requestId,
    release: RELEASE,
    bodyPreview: text.slice(0, 240) || null,
  }), {
    status: response.status >= 400 && response.status <= 599 ? response.status : 502,
    headers,
  });
}

async function activateRegistrationWhenZoneIsAlreadyActive(response, originalRequest, env, context) {
  if (!response.ok) return response;

  let payload = null;
  try {
    payload = await response.clone().json();
  } catch {
    return response;
  }

  const domainId = String(payload?.domain?.id || "").trim();
  const zoneActive = payload?.zone?.active === true
    || String(payload?.zone?.status || "").toLowerCase() === "active";

  if (!zoneActive || !/^[0-9a-f-]{36}$/i.test(domainId)) return response;

  const headers = new Headers(originalRequest.headers);
  headers.set("content-type", "application/json");
  headers.set("accept", "application/json");

  const refreshRequest = new Request(
    new URL("/api/domains/refresh", originalRequest.url),
    {
      method: "POST",
      headers,
      body: JSON.stringify({ domainId }),
    },
  );

  try {
    const refreshed = await baseWorker.fetch(refreshRequest, env, context);
    if (!refreshed.ok) return response;
    return withReleaseHeader(
      refreshed,
      "x-ngeblogging-domain-reattach",
      REVERSIBLE_DETACH_RELEASE,
    );
  } catch {
    return response;
  }
}

async function finalizeRegistrationResponse(response, request, env, context, recovered = false) {
  const normalized = await normalizeDomainApiResponse(response, request);
  const activated = await activateRegistrationWhenZoneIsAlreadyActive(
    normalized,
    request,
    env,
    context,
  );

  return recovered
    ? withReleaseHeader(
        activated,
        "x-ngeblogging-domain-registration-recovery",
        REGISTRATION_RECOVERY_RELEASE,
      )
    : activated;
}

async function runRegistrationWithRecovery(request, env, context) {
  const delays = [0, 700, 1400, 2800, 5000, 8000];
  const attempts = delays.map(() => request.clone());
  let lastResponse = null;
  let lastError = null;

  for (let index = 0; index < attempts.length; index += 1) {
    if (delays[index]) await wait(delays[index]);

    try {
      const response = await baseWorker.fetch(attempts[index], env, context);
      lastResponse = response;
      if (response.ok) {
        return finalizeRegistrationResponse(response, request, env, context, index > 0);
      }

      const details = await registrationFailureDetails(response);
      if (!details.retry || index === attempts.length - 1) {
        return finalizeRegistrationResponse(response, request, env, context, index > 0);
      }
    } catch (error) {
      lastError = error;
      if (index === attempts.length - 1) break;
    }
  }

  if (lastResponse) return finalizeRegistrationResponse(lastResponse, request, env, context, true);

  const requestId = crypto.randomUUID();
  return new Response(JSON.stringify({
    code: "DOMAIN_REGISTRATION_RETRY_EXHAUSTED",
    error: lastError?.message || "Cloudflare belum dapat menyelesaikan pendaftaran domain setelah beberapa percobaan.",
    status: 503,
    requestId,
    release: RELEASE,
  }), {
    status: 503,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": requestId,
      "x-ngeblogging-domain-registration-recovery": REGISTRATION_RECOVERY_RELEASE,
    },
  });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const domain = selectedDomainProvider(env);

    if (!url.pathname.startsWith("/api/")) {
      const canonical = await canonicalDomainRedirect(request, env).catch(() => null);
      if (canonical) return canonical;
    }

    if (
      url.pathname.startsWith("/api/domains/")
      && domain.provider === "netlify"
      && domain.enabled
    ) {
      return normalizeDomainApiResponse(
        await handleFreeDomainRequest(request, env, crypto.randomUUID()),
        request,
      );
    }

    if (isFullZoneRemoval(request, url, domain)) {
      const detached = await handleQuickDomainDetach(
        request.clone(),
        env,
        crypto.randomUUID(),
      );
      if (detached) {
        return withReleaseHeader(
          await normalizeDomainApiResponse(detached, request),
          "x-ngeblogging-reversible-domain-detach",
          REVERSIBLE_DETACH_RELEASE,
        );
      }
    }

    const response = isFullZoneRegistration(request, url, domain)
      ? await runRegistrationWithRecovery(request, env, context)
      : await baseWorker.fetch(request, env, context);

    if (request.method !== "HEAD" && url.pathname === "/api/health") {
      return enrichHealth(response, env);
    }

    return normalizeDomainApiResponse(response, request);
  },
};
