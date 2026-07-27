import baseWorker from "./worker-v41.mjs";
import {
  domainDnsV67Readiness,
  handleDomainDnsV67Request,
} from "../server/domain-dns-v67-handler.mjs";

const RELEASE = "2026.07.27-two-dns-custom-domains-v70";

function enabled(value) {
  return ["1", "true", "yes", "on", "enabled"].includes(String(value || "").trim().toLowerCase());
}

function saasAccountState(env) {
  const saasEnabled = enabled(env.CLOUDFLARE_SAAS_ENABLED);
  return {
    saasEnabled,
    accountActionRequired: !saasEnabled,
    providerBlocker: saasEnabled ? null : {
      code: "CLOUDFLARE_SAAS_NOT_ENABLED",
      message: "Cloudflare for SaaS belum diaktifkan pada zone ngeblogging.com. Aktifkan dari halaman Custom Hostnames Cloudflare, lalu jalankan ulang deployment.",
      cloudflareCode: 100327,
    },
  };
}

function overrideReadiness(payload, env) {
  const account = saasAccountState(env);
  const missing = Array.isArray(payload?.missing) ? [...payload.missing] : [];
  if (!account.saasEnabled && !missing.includes("saasEnablement")) missing.push("saasEnablement");
  return {
    ...payload,
    activationReady: Boolean(payload?.activationReady && account.saasEnabled),
    ready: Boolean(payload?.ready && account.saasEnabled),
    bindings: { ...(payload?.bindings || {}), saasEnabled: account.saasEnabled },
    missing,
    ...account,
  };
}

async function enrichDomainResponse(response, env) {
  try {
    const payload = await response.clone().json();
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "no-store");
    headers.set("x-ngeblogging-domain-engine", RELEASE);
    return new Response(JSON.stringify(overrideReadiness(payload, env)), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return response;
  }
}

async function enrichHealth(response, env) {
  if (!response.ok) return response;
  try {
    const payload = await response.clone().json();
    const readiness = overrideReadiness(domainDnsV67Readiness(env), env);
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
        ready: readiness.ready,
        bindings: readiness.bindings,
        missing: readiness.missing,
        cnameTarget: readiness.cnameTarget,
        saasEnabled: readiness.saasEnabled,
        accountActionRequired: readiness.accountActionRequired,
        providerBlocker: readiness.providerBlocker,
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
      const response = await handleDomainDnsV67Request(request, env, crypto.randomUUID());
      return enrichDomainResponse(response, env);
    }
    const response = await baseWorker.fetch(request, env, context);
    if (request.method !== "HEAD" && url.pathname === "/api/health") {
      return enrichHealth(response, env);
    }
    return response;
  },
};
