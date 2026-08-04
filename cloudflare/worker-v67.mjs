import baseWorker from "./worker-v41.mjs";
import {
  domainDnsV67Readiness,
  handleDomainDnsV67Request,
} from "../server/domain-dns-v67-handler.mjs";
import {
  commentsReady,
  handleCommentsRequest,
  injectPublicComments,
} from "../server/comments-handler-v93.mjs";
import {
  AUTH_GATEWAY_RELEASE,
  AUTH_GATEWAY_PUBLIC_FALLBACK_RELEASE,
  handleAuthGatewayRequest,
  isAuthGatewayRequest,
  resolveAuthGatewayConfig,
} from "../server/auth-gateway-v108.mjs";
import {
  DATA_GATEWAY_RELEASE,
  DATA_GATEWAY_PUBLIC_FALLBACK_RELEASE,
  handleDataGatewayRequest,
  isDataGatewayRequest,
  resolveDataGatewayConfig,
} from "../server/data-gateway-v110.mjs";

const RELEASE = "2026.08.04-production-order-data-v256";
const FULL_ZONE_PROVIDER = "cloudflare-full-zone";
const SAAS_PROVIDERS = new Set(["cloudflare", "cloudflare-custom-hostnames"]);

function enabled(value) {
  return ["1", "true", "yes", "on", "enabled"].includes(String(value || "").trim().toLowerCase());
}

function selectedProvider(env) {
  return String(env.CUSTOM_DOMAIN_PROVIDER || FULL_ZONE_PROVIDER).trim().toLowerCase();
}

function saasAccountState(env) {
  const requested = SAAS_PROVIDERS.has(selectedProvider(env));
  const engineEnabled = enabled(env.CUSTOM_DOMAIN_DNS_V67);
  const saasEnabled = enabled(env.CLOUDFLARE_SAAS_ENABLED);
  return {
    requested,
    engineEnabled,
    saasEnabled,
    active: requested && engineEnabled && saasEnabled,
    accountActionRequired: requested && !saasEnabled,
    providerBlocker: requested && !saasEnabled ? {
      code: "CLOUDFLARE_SAAS_NOT_ENABLED",
      message: "Cloudflare for SaaS belum diaktifkan. Produksi Ngeblogging memakai mode Full Zone gratis sehingga fitur berbayar ini tidak diperlukan.",
      cloudflareCode: 100327,
    } : null,
  };
}

function shouldUseSaasDomainEngine(url, env) {
  const state = saasAccountState(env);
  return url.pathname.startsWith("/api/domains/") && state.active;
}

async function enrichSaasDomainResponse(response, env) {
  try {
    const payload = await response.clone().json();
    const readiness = domainDnsV67Readiness(env);
    const state = saasAccountState(env);
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "no-store");
    headers.set("x-ngeblogging-domain-engine", RELEASE);
    return new Response(JSON.stringify({
      ...payload,
      activationReady: Boolean(readiness.activationReady && state.active),
      ready: Boolean(readiness.ready && state.active),
      saasEnabled: state.saasEnabled,
      accountActionRequired: state.accountActionRequired,
      providerBlocker: state.providerBlocker,
      release: RELEASE,
    }), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return response;
  }
}

async function enrichHealth(response, env, requestUrl) {
  if (!response.ok) return response;
  try {
    const payload = await response.clone().json();
    const provider = selectedProvider(env);
    const state = saasAccountState(env);
    const fullZone = provider === FULL_ZONE_PROVIDER;
    const comments = commentsReady(env);
    const authConfig = resolveAuthGatewayConfig(env, requestUrl);
    const dataConfig = resolveDataGatewayConfig(env, requestUrl);
    const authConfigured = authConfig.ready;
    const dataConfigured = dataConfig.ready;
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "no-store");
    headers.set("x-ngeblogging-domain-engine", RELEASE);
    headers.set("x-ngeblogging-comments", comments ? "comments-v93" : "comments-not-configured");
    headers.set("x-ngeblogging-auth-gateway", AUTH_GATEWAY_RELEASE);
    headers.set("x-ngeblogging-auth-fallback", AUTH_GATEWAY_PUBLIC_FALLBACK_RELEASE);
    headers.set("x-ngeblogging-auth-config", authConfig.source);
    headers.set("x-ngeblogging-data-gateway", DATA_GATEWAY_RELEASE);
    headers.set("x-ngeblogging-data-fallback", DATA_GATEWAY_PUBLIC_FALLBACK_RELEASE);
    headers.set("x-ngeblogging-data-config", dataConfig.source);
    headers.set("x-ngeblogging-release", String(env.APP_RELEASE || RELEASE));
    return new Response(JSON.stringify({
      ...payload,
      release: String(env.APP_RELEASE || RELEASE),
      appRelease: String(env.APP_RELEASE || RELEASE),
      uiAuthorityRelease: String(env.UI_AUTHORITY_RELEASE || ""),
      workerRelease: RELEASE,
      domainReleaseCurrent: RELEASE,
      comments,
      commentsRelease: "comments-v93-20260728",
      authGateway: authConfigured,
      authGatewayRelease: AUTH_GATEWAY_RELEASE,
      authGatewayFallbackRelease: AUTH_GATEWAY_PUBLIC_FALLBACK_RELEASE,
      authConfigSource: authConfig.source,
      authProduction: authConfigured,
      authTransport: authConfig.source === "production-public-fallback"
        ? "same-origin-gateway-public-fallback"
        : authConfigured ? "same-origin-gateway" : "not-configured",
      authMethods: {
        emailPassword: authConfigured,
        magicLink: authConfigured,
        google: authConfigured,
        linkedin: authConfigured,
        github: authConfigured,
        providerConfigurationExternal: true,
      },
      dataGateway: dataConfigured,
      dataGatewayRelease: DATA_GATEWAY_RELEASE,
      dataGatewayFallbackRelease: DATA_GATEWAY_PUBLIC_FALLBACK_RELEASE,
      dataConfigSource: dataConfig.source,
      dataTransport: dataConfig.source === "production-public-fallback"
        ? "same-origin-data-gateway-public-fallback"
        : dataConfigured ? "same-origin-data-gateway" : "not-configured",
      dataGatewayServices: dataConfigured ? ["rest", "storage"] : [],
      commentsArchitecture: {
        database: "supabase-postgres-rls",
        publicSubmission: true,
        moderationDashboard: true,
        threadedAdminReplies: true,
        emojiAndReactions: true,
        perContentToggle: true,
      },
      customDomainProvider: payload.customDomainProvider || provider,
      customDomainMode: payload.customDomainMode || (fullZone ? "full-zone-nameserver" : "cloudflare-for-saas"),
      customDomainPaidSaasRequired: false,
      customDomainArchitecture: {
        provider: fullZone ? FULL_ZONE_PROVIDER : provider,
        mode: fullZone ? "full-zone-nameserver" : "cloudflare-for-saas",
        freeSubdomainPersistent: true,
        freeSubdomainDeletedOnCustomDomain: false,
        canonicalRedirect: true,
        redirectStatus: 308,
        pathAndQueryPreserved: true,
        emergencyFreePreview: true,
        automaticHttps: true,
        paidSaasRequired: false,
      },
      cloudflareForSaasOptional: {
        requested: state.requested,
        enabled: state.saasEnabled,
        active: state.active,
        accountActionRequired: state.accountActionRequired,
        providerBlocker: state.providerBlocker,
      },
      customDomainDnsV67: {
        enabled: state.active,
        optional: true,
        release: RELEASE,
        provider: "cloudflare-custom-hostnames",
        mode: "cloudflare-for-saas",
      },
    }), { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response;
  }
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (isAuthGatewayRequest(url)) {
      return handleAuthGatewayRequest(request, env, crypto.randomUUID());
    }

    if (isDataGatewayRequest(url)) {
      return handleDataGatewayRequest(request, env, crypto.randomUUID());
    }

    if (url.pathname.startsWith("/api/comments/")) {
      return handleCommentsRequest(request, env, crypto.randomUUID());
    }

    // Full Zone is the production default. Never let the optional SaaS engine
    // intercept its /api/domains/* registration, nameserver, refresh, or remove flow.
    if (request.method !== "OPTIONS" && shouldUseSaasDomainEngine(url, env)) {
      const response = await handleDomainDnsV67Request(request, env, crypto.randomUUID());
      return enrichSaasDomainResponse(response, env);
    }

    const response = await baseWorker.fetch(request, env, context);
    if (request.method !== "HEAD" && url.pathname === "/api/health") {
      return enrichHealth(response, env, url);
    }
    if (request.method === "HEAD") return response;
    return injectPublicComments(request, response, env);
  },
};
