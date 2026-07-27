import baseWorker from "./worker-v41.mjs";
import {
  domainDnsV67Readiness,
  handleDomainDnsV67Request,
} from "../server/domain-dns-v67-handler.mjs";

const RELEASE = "2026.07.27-two-dns-custom-domains-v67";

function selectedProvider(env) {
  return String(env.CUSTOM_DOMAIN_PROVIDER || "").trim().toLowerCase();
}

async function enrichHealth(response, env) {
  if (!response.ok) return response;
  try {
    const payload = await response.clone().json();
    const readiness = domainDnsV67Readiness(env);
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "no-store");
    headers.set("x-ngeblogging-domain-engine", RELEASE);
    return new Response(JSON.stringify({
      ...payload,
      domainRelease: RELEASE,
      domainReleaseCurrent: RELEASE,
      customDomains: readiness.activationReady,
      customDomainProvider: readiness.provider,
      customDomainMode: readiness.providerMode,
      customDomainDnsMode: readiness.dnsMode,
      customDomainAutomation: true,
      customDomainBindings: readiness.bindings,
      customDomainDatabaseMode: readiness.databaseMode,
      customDomainServiceRoleRequired: false,
      customHostnameTarget: readiness.cnameTarget,
      customDomainPaidSaasRequired: false,
      customDomainCapacity: {
        architecture: "shared-cloudflare-for-saas-edge",
        dnsRecordsPerHostname: 2,
        durableRegistration: true,
        idempotentActivation: true,
        canonicalRedirect: true,
        freeSubdomainFallback: true,
        sslActivationRequired: true,
      },
    }), { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response;
  }
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (
      url.pathname.startsWith("/api/domains/")
      && selectedProvider(env) === "cloudflare-custom-hostnames"
    ) {
      return handleDomainDnsV67Request(request, env, crypto.randomUUID());
    }
    const response = await baseWorker.fetch(request, env, context);
    if (request.method !== "HEAD" && url.pathname === "/api/health") {
      return enrichHealth(response, env);
    }
    return response;
  },
};
