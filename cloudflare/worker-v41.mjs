import baseWorker from "./worker-v37.mjs";
import { freeDomainReadiness, handleFreeDomainRequest } from "../server/free-domain-handler.mjs";

const RELEASE = "2026.07.26-free-domains-v51";
const LEGACY_DOMAIN_RELEASE = "2026.07.26-custom-domains-v41";

function cloudflareDomainReadiness(env) {
  const bindings = {
    apiToken: Boolean(String(env.CLOUDFLARE_API_TOKEN || "").trim()),
    zoneId: Boolean(String(env.CLOUDFLARE_ZONE_ID || "").trim()),
    cnameTarget: Boolean(String(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET || "").trim()),
    databaseAccess: Boolean(
      String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim()
      && String(env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "").trim()
    ),
    providerApi: String(env.CLOUDFLARE_CUSTOM_HOSTNAMES_READY || "").trim().toLowerCase() === "true",
  };
  return {
    provider: "cloudflare",
    mode: "cloudflare-for-saas",
    automation: true,
    bindings,
    ready: Object.values(bindings).every(Boolean),
    enabled: Object.values(bindings).every(Boolean),
    serviceRoleRequired: false,
    databaseMode: "user-jwt-rls",
    cnameTarget: String(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET || "").trim().toLowerCase().replace(/\.$/, ""),
    apexTarget: null,
  };
}

function selectedDomainProvider(env) {
  const requested = String(env.CUSTOM_DOMAIN_PROVIDER || "auto").trim().toLowerCase();
  const cloudflare = cloudflareDomainReadiness(env);
  const netlify = freeDomainReadiness(env);
  if (requested === "cloudflare") return cloudflare;
  if (requested === "netlify") return { ...netlify, ready: netlify.enabled };
  if (cloudflare.ready) return cloudflare;
  return netlify.enabled ? { ...netlify, ready: true } : cloudflare;
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
      domainReleaseCompatibility: LEGACY_DOMAIN_RELEASE,
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
    }), { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response;
  }
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const domain = selectedDomainProvider(env);
    if (url.pathname.startsWith("/api/domains/") && domain.provider === "netlify" && domain.enabled) {
      return handleFreeDomainRequest(request, env, crypto.randomUUID());
    }
    const response = await baseWorker.fetch(request, env, context);
    if (request.method !== "HEAD" && url.pathname === "/api/health") return enrichHealth(response, env);
    return response;
  },
};
