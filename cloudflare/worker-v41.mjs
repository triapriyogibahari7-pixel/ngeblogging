import baseWorker from "./worker-v37.mjs";
import { freeDomainReadiness, handleFreeDomainRequest } from "../server/free-domain-handler.mjs";
import { handleQuickDomainDetach } from "../server/quick-domain-detach-handler.mjs";

const RELEASE = "2026.07.27-full-zone-domains-v62";
const REGISTRATION_RECOVERY_RELEASE = "2026.07.27-domain-registration-recovery-v63";
const REVERSIBLE_DETACH_RELEASE = "2026.07.27-reversible-domain-detach-v64";
const LEGACY_FULL_ZONE_RELEASE = "2026.07.26-full-zone-domains-v55";
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
  ]).has(code);

  const permissionFailure = new Set([
    "CLOUDFLARE_ZONE_CREATE_PERMISSION_REQUIRED",
    "CLOUDFLARE_DOMAIN_TOKEN_INVALID",
    "CUSTOM_DOMAIN_NOT_CONFIGURED",
    "AUTH_REQUIRED",
    "INVALID_SESSION",
    "SITE_MANAGER_REQUIRED",
    "DOMAIN_ALREADY_USED",
  ]).has(code);

  return {
    payload,
    retry: !permissionFailure && (retryableCode || [500, 502, 503, 504].includes(response.status) || !payload),
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

async function activateRegistrationWhenZoneIsAlreadyActive(
  response,
  originalRequest,
  env,
  context,
) {
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

async function finalizeRegistrationResponse(
  response,
  request,
  env,
  context,
  recovered = false,
) {
  const activated = await activateRegistrationWhenZoneIsAlreadyActive(
    response,
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
  const firstRequest = request.clone();
  const retryRequest = request.clone();
  let firstResponse;

  try {
    firstResponse = await baseWorker.fetch(firstRequest, env, context);
  } catch {
    await wait(2800);
    const retryResponse = await baseWorker.fetch(retryRequest, env, context);
    return finalizeRegistrationResponse(retryResponse, request, env, context, true);
  }

  if (firstResponse.ok) {
    return finalizeRegistrationResponse(firstResponse, request, env, context, false);
  }

  const details = await registrationFailureDetails(firstResponse);
  if (!details.retry) return firstResponse;

  /*
   * Cloudflare dapat membuat zone lebih dahulu lalu baru menerbitkan dua
   * nameserver beberapa detik sesudahnya. Percobaan kedua aman karena
   * getOrCreateFullZone menggunakan kembali zone yang sudah dibuat.
   */
  await wait(2800);
  const retryResponse = await baseWorker.fetch(retryRequest, env, context);
  return finalizeRegistrationResponse(retryResponse, request, env, context, true);
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const domain = selectedDomainProvider(env);

    if (
      url.pathname.startsWith("/api/domains/")
      && domain.provider === "netlify"
      && domain.enabled
    ) {
      return handleFreeDomainRequest(request, env, crypto.randomUUID());
    }

    if (isFullZoneRemoval(request, url, domain)) {
      const detached = await handleQuickDomainDetach(
        request.clone(),
        env,
        crypto.randomUUID(),
      );
      if (detached) {
        return withReleaseHeader(
          detached,
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

    return response;
  },
};