export const AUTH_GATEWAY_RELEASE = "2026.08.04-auth-gateway-v255";
const PREFIX = "/api/auth-proxy";
const MAX_AUTH_BODY_BYTES = 128 * 1024;
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"]);
const FORWARDED_HEADERS = new Set([
  "accept",
  "apikey",
  "authorization",
  "content-type",
  "x-client-info",
  "x-supabase-api-version",
]);

// Publishable browser credentials are intentionally public. Keeping the same
// fallback on the Worker prevents login buttons from failing only because one
// deployment path forgot to expose a VITE_/Worker binding.
const PRODUCTION_SUPABASE_URL = "https://polvmlrhqoiflumibfqs.supabase.co";
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Jqz6qDzX4IKSunPoDT5zyQ_sk6EK4W-";

function requestHost(value) {
  try { return new URL(String(value || "https://ngeblogging.com")).hostname.toLowerCase(); }
  catch { return ""; }
}

function productionGatewayHost(value) {
  const hostname = requestHost(value);
  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || hostname.endsWith(".workers.dev");
}

export function resolveAuthGatewayConfig(env = {}, requestUrl = "") {
  const configuredUrl = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const configuredKey = String(
    env.SUPABASE_PUBLISHABLE_KEY
    || env.VITE_SUPABASE_PUBLISHABLE_KEY
    || env.VITE_SUPABASE_ANON_KEY
    || "",
  ).trim();
  const productionFallback = productionGatewayHost(requestUrl);
  const supabaseUrl = configuredUrl || (productionFallback ? PRODUCTION_SUPABASE_URL : "");
  const publishableKey = configuredKey || (productionFallback ? PRODUCTION_SUPABASE_PUBLISHABLE_KEY : "");
  return {
    supabaseUrl,
    publishableKey,
    source: configuredUrl && configuredKey
      ? "worker-env"
      : supabaseUrl && publishableKey && productionFallback
        ? "production-public-fallback"
        : "missing",
  };
}

export function authGatewayConfigured(env = {}, requestUrl = "") {
  const config = resolveAuthGatewayConfig(env, requestUrl);
  return Boolean(config.supabaseUrl && config.publishableKey);
}

function configuredOrigins(env) {
  return new Set([
    "https://ngeblogging.com",
    "https://www.ngeblogging.com",
    String(env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, ""),
    ...String(env.PUBLIC_ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim().replace(/\/$/, ""))
      .filter(Boolean),
  ].filter(Boolean));
}

function allowedOrigin(origin, env) {
  if (!origin) return true;
  const normalized = String(origin).trim().replace(/\/$/, "");
  if (configuredOrigins(env).has(normalized)) return true;
  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "[::1]"].includes(hostname)) {
      return ["http:", "https:"].includes(url.protocol);
    }
    return url.protocol === "https:" && (
      hostname === "ngeblogging.com"
      || hostname.endsWith(".ngeblogging.com")
      || hostname.endsWith(".netlify.app")
      || hostname.endsWith(".pages.dev")
      || hostname.endsWith(".workers.dev")
    );
  } catch {
    return false;
  }
}

function corsHeaders(origin, requestId, configSource = "unknown") {
  return {
    "access-control-allow-origin": origin || "https://ngeblogging.com",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
    "access-control-expose-headers": "location, www-authenticate, x-request-id, x-ngeblogging-auth-gateway, x-ngeblogging-auth-config",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    "x-ngeblogging-auth-gateway": AUTH_GATEWAY_RELEASE,
    "x-ngeblogging-auth-config": configSource,
    "x-request-id": requestId,
  };
}

function json(status, payload, requestId, origin = "", configSource = "unknown") {
  return new Response(JSON.stringify({ ...payload, release: AUTH_GATEWAY_RELEASE, requestId }), {
    status,
    headers: {
      ...corsHeaders(origin, requestId, configSource),
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

function targetPath(url) {
  const path = url.pathname.slice(PREFIX.length);
  return path.startsWith("/auth/v1/") ? path : "";
}

export function isAuthGatewayRequest(url) {
  return url.pathname.startsWith(`${PREFIX}/auth/v1/`);
}

export async function handleAuthGatewayRequest(request, env, requestId) {
  const origin = request.headers.get("origin") || "";
  const sourceUrl = new URL(request.url);
  const config = resolveAuthGatewayConfig(env, sourceUrl);
  if (!allowedOrigin(origin, env)) {
    return json(403, { code: "AUTH_ORIGIN_NOT_ALLOWED", error: "Origin autentikasi tidak diizinkan." }, requestId, origin, config.source);
  }
  if (!ALLOWED_METHODS.has(request.method)) {
    return json(405, { code: "AUTH_METHOD_NOT_ALLOWED", error: "Metode autentikasi tidak didukung." }, requestId, origin, config.source);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin, requestId, config.source) });
  }

  const path = targetPath(sourceUrl);
  if (!config.supabaseUrl || !config.publishableKey || !path) {
    return json(503, { code: "AUTH_GATEWAY_NOT_READY", error: "Gateway autentikasi belum siap." }, requestId, origin, config.source);
  }

  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > MAX_AUTH_BODY_BYTES) {
    return json(413, { code: "AUTH_PAYLOAD_TOO_LARGE", error: "Payload autentikasi terlalu besar." }, requestId, origin, config.source);
  }

  const target = new URL(`${path}${sourceUrl.search}`, `${config.supabaseUrl}/`);
  const headers = new Headers();
  for (const [name, value] of request.headers.entries()) {
    if (FORWARDED_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  }
  if (!headers.has("apikey")) headers.set("apikey", config.publishableKey);
  headers.set("cache-control", "no-store");
  headers.set("x-client-info", headers.get("x-client-info") || "ngeblogging-auth-gateway-v255");

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;
  if (body && body.byteLength > MAX_AUTH_BODY_BYTES) {
    return json(413, { code: "AUTH_PAYLOAD_TOO_LARGE", error: "Payload autentikasi terlalu besar." }, requestId, origin, config.source);
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });
    const responseHeaders = new Headers(corsHeaders(origin, requestId, config.source));
    for (const name of ["content-type", "content-language", "location", "www-authenticate", "x-supabase-api-version"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("x-content-type-options", "nosniff");
    responseHeaders.set("x-ngeblogging-auth-gateway", AUTH_GATEWAY_RELEASE);
    responseHeaders.set("x-ngeblogging-auth-config", config.source);
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return json(502, {
      code: "AUTH_UPSTREAM_UNREACHABLE",
      error: "Layanan autentikasi belum dapat dijangkau. Sesi lokal tidak dihapus; coba kembali.",
      detail: error?.name || "NetworkError",
    }, requestId, origin, config.source);
  }
}
