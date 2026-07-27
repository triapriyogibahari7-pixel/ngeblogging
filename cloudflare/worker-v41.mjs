import baseWorker from "./worker-v37.mjs";
import { freeDomainReadiness, handleFreeDomainRequest } from "../server/free-domain-handler.mjs";

const RELEASE = "2026.07.27-full-zone-domains-v62";
const REGISTRATION_RECOVERY_RELEASE = "2026.07.27-domain-registration-recovery-v63";
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

function markRecovered(response) {
  const headers = new Headers(response.headers);
  headers.set("x-ngeblogging-domain-registration-recovery", REGISTRATION_RECOVERY_RELEASE);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function runRegistrationWithRecovery(request, env, context) {
  const firstRequest = request.clone();
  const retryRequest = request.clone();
  let firstResponse;

  try {
    firstResponse = await baseWorker.fetch(firstRequest, env, context);
  } catch {
    await wait(2800);
    return markRecovered(await baseWorker.fetch(retryRequest, env, context));
  }

  if (firstResponse.ok) return firstResponse;

  const details = await registrationFailureDetails(firstResponse);
  if (!details.retry) return firstResponse;

  /*
   * Cloudflare dapat membuat zone lebih dahulu lalu baru menerbitkan dua
   * nameserver beberapa detik sesudahnya. Percobaan kedua aman karena
   * getOrCreateFullZone menggunakan kembali zone yang sudah dibuat.
   */
  await wait(2800);
  const retryResponse = await baseWorker.fetch(retryRequest, env, context);
  return markRecovered(retryResponse);
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

    const response = isFullZoneRegistration(request, url, domain)
      ? await runRegistrationWithRecovery(request, env, context)
      : await baseWorker.fetch(request, env, context);

    if (request.method !== "HEAD" && url.pathname === "/api/health") {
      return enrichHealth(response, env);
    }

    return response;
  },
};