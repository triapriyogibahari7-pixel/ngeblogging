import baseWorker from "./worker-v37.mjs";

const UI_RELEASE = "2026.07.26-production-v39";

function domainReadiness(env) {
  const missing = [];
  if (!String(env.CLOUDFLARE_API_TOKEN || "").trim()) missing.push("CLOUDFLARE_API_TOKEN");
  if (!String(env.CLOUDFLARE_ZONE_ID || "").trim()) missing.push("CLOUDFLARE_ZONE_ID");
  if (!String(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET || "").trim()) missing.push("CLOUDFLARE_CUSTOM_HOSTNAME_TARGET");
  if (!String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim()) missing.push("SUPABASE_URL");
  if (!String(env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "").trim()) missing.push("SUPABASE_PUBLISHABLE_KEY");
  return {
    ready: missing.length === 0,
    missing,
    target: String(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET || "").trim().toLowerCase().replace(/\.$/, ""),
  };
}

async function enrichHealth(response, env) {
  if (!response.ok) return response;
  try {
    const payload = await response.clone().json();
    const domain = domainReadiness(env);
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "no-store");
    return new Response(JSON.stringify({
      ...payload,
      uiRelease: UI_RELEASE,
      customDomains: domain.ready,
      customDomainMissing: domain.missing,
      customHostnameTarget: domain.target || null,
      customDomainDatabaseMode: "user-jwt-rls",
      widgetCount: 26,
      responsiveLayout: "desktop-tablet-mobile-v39",
    }), { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response;
  }
}

export default {
  async fetch(request, env, context) {
    const response = await baseWorker.fetch(request, env, context);
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method !== "HEAD") return enrichHealth(response, env);
    return response;
  },
};
