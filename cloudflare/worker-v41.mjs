import baseWorker from "./worker-v37.mjs";

const RELEASE = "2026.07.26-custom-domains-v41";

function customDomainReadiness(env) {
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
    bindings,
    ready: Object.values(bindings).every(Boolean),
    serviceRoleRequired: false,
    databaseMode: "user-jwt-rls",
  };
}

async function enrichHealth(response, env) {
  if (!response.ok) return response;
  try {
    const payload = await response.clone().json();
    const domain = customDomainReadiness(env);
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "no-store");
    return new Response(JSON.stringify({
      ...payload,
      domainRelease: RELEASE,
      customDomains: domain.ready,
      customDomainBindings: domain.bindings,
      customDomainDatabaseMode: domain.databaseMode,
      customDomainServiceRoleRequired: domain.serviceRoleRequired,
      customHostnameTarget: String(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET || "").trim().toLowerCase().replace(/\.$/, "") || null,
    }), { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response;
  }
}

export default {
  async fetch(request, env, context) {
    const response = await baseWorker.fetch(request, env, context);
    const url = new URL(request.url);
    if (request.method !== "HEAD" && url.pathname === "/api/health") return enrichHealth(response, env);
    return response;
  },
};
