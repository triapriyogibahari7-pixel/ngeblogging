export const AUTH_GATEWAY_RELEASE = "2026.07.29-auth-gateway-v114";
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

function allowedOrigin(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:"
      && (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com"));
  } catch {
    return false;
  }
}

function corsHeaders(origin, requestId) {
  return {
    "access-control-allow-origin": origin || "https://ngeblogging.com",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
    "access-control-expose-headers": "location, www-authenticate, x-request-id, x-ngeblogging-auth-gateway",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    "x-ngeblogging-auth-gateway": AUTH_GATEWAY_RELEASE,
    "x-request-id": requestId,
  };
}

function json(status, payload, requestId, origin = "") {
  return new Response(JSON.stringify({ ...payload, release: AUTH_GATEWAY_RELEASE, requestId }), {
    status,
    headers: {
      ...corsHeaders(origin, requestId),
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
  if (!allowedOrigin(origin)) {
    return json(403, { code: "AUTH_ORIGIN_NOT_ALLOWED", error: "Origin autentikasi tidak diizinkan." }, requestId, origin);
  }
  if (!ALLOWED_METHODS.has(request.method)) {
    return json(405, { code: "AUTH_METHOD_NOT_ALLOWED", error: "Metode autentikasi tidak didukung." }, requestId, origin);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin, requestId) });
  }

  const supabaseUrl = String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const publishableKey = String(
    env.SUPABASE_PUBLISHABLE_KEY
    || env.VITE_SUPABASE_PUBLISHABLE_KEY
    || env.VITE_SUPABASE_ANON_KEY
    || "",
  ).trim();
  const sourceUrl = new URL(request.url);
  const path = targetPath(sourceUrl);
  if (!supabaseUrl || !publishableKey || !path) {
    return json(503, { code: "AUTH_GATEWAY_NOT_READY", error: "Gateway autentikasi belum siap." }, requestId, origin);
  }

  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > MAX_AUTH_BODY_BYTES) {
    return json(413, { code: "AUTH_PAYLOAD_TOO_LARGE", error: "Payload autentikasi terlalu besar." }, requestId, origin);
  }

  const target = new URL(`${path}${sourceUrl.search}`, `${supabaseUrl}/`);
  const headers = new Headers();
  for (const [name, value] of request.headers.entries()) {
    if (FORWARDED_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  }
  if (!headers.has("apikey")) headers.set("apikey", publishableKey);
  headers.set("cache-control", "no-store");

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;
  if (body && body.byteLength > MAX_AUTH_BODY_BYTES) {
    return json(413, { code: "AUTH_PAYLOAD_TOO_LARGE", error: "Payload autentikasi terlalu besar." }, requestId, origin);
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });
    const responseHeaders = new Headers(corsHeaders(origin, requestId));
    for (const name of ["content-type", "content-language", "location", "www-authenticate", "x-supabase-api-version"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("x-content-type-options", "nosniff");
    responseHeaders.set("x-ngeblogging-auth-gateway", AUTH_GATEWAY_RELEASE);
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
    }, requestId, origin);
  }
}
