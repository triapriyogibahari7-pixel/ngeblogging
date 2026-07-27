import baseWorker from "./worker-v41.mjs";
import {
  domainDnsV67Readiness,
  handleDomainDnsV67Request,
} from "../server/domain-dns-v67-handler.mjs";

const RELEASE = "2026.07.27-two-dns-custom-domains-v67";

function enabled(value) {
  return ["1", "true", "yes", "on", "enabled"].includes(String(value || "").trim().toLowerCase());
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
      customDomainDnsV67: {
        enabled: enabled(env.CUSTOM_DOMAIN_DNS_V67),
        release: RELEASE,
        provider: readiness.provider,
        mode: readiness.providerMode,
        dnsMode: readiness.dnsMode,
        activationReady: readiness.activationReady,
        bindings: readiness.bindings,
        cnameTarget: readiness.cnameTarget,
        durableRegistration: true,
        idempotentActivation: true,
        canonicalRedirect: true,
        freeSubdomainFallback: true,
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
      request.method !== "OPTIONS"
      && url.pathname.startsWith("/api/domains/")
      && enabled(env.CUSTOM_DOMAIN_DNS_V67)
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
