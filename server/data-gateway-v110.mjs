export const DATA_GATEWAY_RELEASE = "2026.08.04-data-gateway-v255";
const PREFIX = "/api/data-proxy";
const MAX_DECLARED_BODY_BYTES = 96 * 1024 * 1024;
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const ALLOWED_PATH_PREFIXES = ["/rest/v1/", "/storage/v1/"];
const FORWARDED_REQUEST_HEADERS = new Set([
  "accept",
  "accept-profile",
  "apikey",
  "authorization",
  "cache-control",
  "content-profile",
  "content-type",
  "if-match",
  "if-none-match",
  "prefer",
  "range",
  "x-client-info",
  "x-supabase-api-version",
  "x-upsert",
]);
const FORWARDED_RESPONSE_HEADERS = new Set([
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "content-language",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
  "location",
  "preference-applied",
  "www-authenticate",
  "x-supabase-api-version",
]);

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

export function resolveDataGatewayConfig(env = {}, requestUrl = "") {
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

export function dataGatewayConfigured(env = {}, requestUrl = "") {
  const config = resolveDataGatewayConfig(env, requestUrl);
  return Boolean(config.supabaseUrl && config.publishableKey);
}

function allowedOrigin(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:"
      && (hostname === "ngeblogging.com"
        || hostname.endsWith(".ngeblogging.com")
        || hostname.endsWith(".netlify.app")
        || hostname.endsWith(".pages.dev")
        || hostname.endsWith(".workers.dev"));
  } catch {
    return false;
  }
}

function json(status, payload, requestId, configSource = "unknown") {
  return new Response(JSON.stringify({ ...payload, release: DATA_GATEWAY_RELEASE, requestId }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-ngeblogging-data-gateway": DATA_GATEWAY_RELEASE,
      "x-ngeblogging-data-config": configSource,
      "x-request-id": requestId,
    },
  });
}

function targetPath(url) {
  const path = url.pathname.slice(PREFIX.length);
  return ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)) ? path : "";
}

export function isDataGatewayRequest(url) {
  const path = url.pathname.slice(PREFIX.length);
  return url.pathname.startsWith(`${PREFIX}/`)
    && ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function corsHeaders(origin, requestId, configSource = "unknown") {
  return {
    "access-control-allow-origin": origin || "https://ngeblogging.com",
    "access-control-allow-headers": [
      "authorization", "apikey", "content-type", "prefer", "range",
      "accept-profile", "content-profile", "x-client-info", "x-upsert",
      "if-match", "if-none-match", "x-supabase-api-version",
    ].join(", "),
    "access-control-allow-methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-expose-headers": "content-range, preference-applied, location, etag, x-request-id, x-ngeblogging-data-gateway, x-ngeblogging-data-config",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    "x-ngeblogging-data-gateway": DATA_GATEWAY_RELEASE,
    "x-ngeblogging-data-config": configSource,
    "x-request-id": requestId,
  };
}

export async function handleDataGatewayRequest(request, env, requestId) {
  const origin = request.headers.get("origin") || "";
  const sourceUrl = new URL(request.url);
  const config = resolveDataGatewayConfig(env, sourceUrl);
  if (!allowedOrigin(origin)) {
    return json(403, { code: "DATA_ORIGIN_NOT_ALLOWED", error: "Origin data tidak diizinkan." }, requestId, config.source);
  }
  if (!ALLOWED_METHODS.has(request.method)) {
    return json(405, { code: "DATA_METHOD_NOT_ALLOWED", error: "Metode data tidak didukung." }, requestId, config.source);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin, requestId, config.source) });
  }

  const path = targetPath(sourceUrl);
  if (!config.supabaseUrl || !config.publishableKey || !path) {
    return json(503, { code: "DATA_GATEWAY_NOT_READY", error: "Gateway data belum siap." }, requestId, config.source);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_DECLARED_BODY_BYTES) {
    return json(413, { code: "DATA_PAYLOAD_TOO_LARGE", error: "Payload melebihi batas gateway data." }, requestId, config.source);
  }

  const target = new URL(`${path}${sourceUrl.search}`, `${config.supabaseUrl}/`);
  const headers = new Headers();
  for (const [name, value] of request.headers.entries()) {
    if (FORWARDED_REQUEST_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  }
  if (!headers.has("apikey")) headers.set("apikey", config.publishableKey);
  headers.set("cache-control", "no-store");

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });
    const responseHeaders = new Headers(corsHeaders(origin, requestId, config.source));
    for (const [name, value] of upstream.headers.entries()) {
      if (FORWARDED_RESPONSE_HEADERS.has(name.toLowerCase())) responseHeaders.set(name, value);
    }
    responseHeaders.set("x-content-type-options", "nosniff");
    responseHeaders.set("x-ngeblogging-data-gateway", DATA_GATEWAY_RELEASE);
    responseHeaders.set("x-ngeblogging-data-config", config.source);
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return json(502, {
      code: "DATA_UPSTREAM_UNREACHABLE",
      error: "Layanan data belum dapat dijangkau melalui gateway. Sesi pengguna tetap dipertahankan.",
      detail: error?.name || "NetworkError",
    }, requestId, config.source);
  }
}
