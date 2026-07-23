import { handleRequest } from "../server/nara-runtime.mjs";
import { handleBillingRequest } from "../server/billing-handler.mjs";
import { handlePayPalWebhook } from "../server/paypal-webhook-handler.mjs";
import { handleNaraImage } from "../server/nara-image-handler.mjs";
import { injectTenantSeo, seoEndpoint } from "../server/seo-handler.mjs";

const MAX_REQUEST_BYTES = 20 * 1024 * 1024;
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "OPTIONS"]);
const DEFAULT_SITE_ORIGIN = "https://ngeblogging.com";

function configuredOrigins(env) {
  return new Set([
    DEFAULT_SITE_ORIGIN,
    "https://www.ngeblogging.com",
    String(env.PUBLIC_SITE_URL || "").replace(/\/$/, ""),
    ...String(env.PUBLIC_ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim().replace(/\/$/, ""))
      .filter(Boolean),
  ].filter(Boolean));
}

function isAllowedOrigin(origin, env) {
  if (!origin) return true;
  if (configuredOrigins(env).has(origin.replace(/\/$/, ""))) return true;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol === "https:" && (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com"))) return true;
  if (parsed.protocol === "https:" && /(?:^|\.)(?:pages|workers)\.dev$/.test(hostname)) return true;
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname) && ["http:", "https:"].includes(parsed.protocol);
}

function securityHeaders(requestId, corsOrigin = "") {
  const headers = new Headers({
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(self), microphone=(self), geolocation=(self), payment=(self)",
    "cross-origin-resource-policy": "same-site",
    "x-frame-options": "SAMEORIGIN",
    "x-request-id": requestId,
  });
  if (corsOrigin) {
    headers.set("access-control-allow-origin", corsOrigin);
    headers.set("access-control-allow-headers", "content-type, authorization");
    headers.set("access-control-allow-methods", "GET, HEAD, POST, OPTIONS");
    headers.set("access-control-max-age", "86400");
    headers.set("vary", "Origin");
  }
  return headers;
}

function jsonResponse(status, body, requestId, method = "GET", corsOrigin = "") {
  const payload = JSON.stringify(body);
  const headers = securityHeaders(requestId, corsOrigin);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(method === "HEAD" ? null : payload, { status, headers });
}

function clientAddress(request) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "cloudflare-guest";
}

async function naraResponse(request, env, requestId) {
  const origin = request.headers.get("origin") || "";
  if (!isAllowedOrigin(origin, env)) {
    return jsonResponse(403, { code: "ORIGIN_NOT_ALLOWED", error: "Origin permintaan tidak diizinkan." }, requestId, request.method);
  }
  if (!ALLOWED_METHODS.has(request.method)) {
    return jsonResponse(405, { code: "METHOD_NOT_ALLOWED", error: "Metode tidak didukung." }, requestId, request.method, origin);
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) {
    return jsonResponse(413, { code: "PAYLOAD_TOO_LARGE", error: "Lampiran atau payload terlalu besar." }, requestId, request.method, origin);
  }
  const headers = Object.fromEntries(request.headers.entries());
  const address = clientAddress(request).slice(0, 80);
  headers["x-client-ip"] = address;
  headers["x-forwarded-for"] = address;
  headers["x-request-id"] = requestId;
  if (origin) headers.origin = String(env.PUBLIC_SITE_URL || DEFAULT_SITE_ORIGIN).replace(/\/$/, "");
  const body = ["GET", "HEAD", "OPTIONS"].includes(request.method) ? "" : await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
    return jsonResponse(413, { code: "PAYLOAD_TOO_LARGE", error: "Lampiran atau payload terlalu besar." }, requestId, request.method, origin);
  }
  const result = await handleRequest({ httpMethod: request.method, headers, body }, env);
  const responseHeaders = new Headers(result.headers || {});
  for (const [name, value] of securityHeaders(requestId, origin).entries()) responseHeaders.set(name, value);
  return new Response(request.method === "HEAD" ? null : result.body || null, { status: result.statusCode, headers: responseHeaders });
}

async function protectedJsonEndpoint(request, env, requestId, handler) {
  const origin = request.headers.get("origin") || "";
  if (!isAllowedOrigin(origin, env)) return jsonResponse(403, { error: "Origin permintaan tidak diizinkan." }, requestId, request.method);
  const result = await handler(request, env, requestId);
  const headers = new Headers(result.headers);
  for (const [name, value] of securityHeaders(requestId, origin).entries()) headers.set(name, value);
  return new Response(result.body, { status: result.status, headers });
}

function withSecurity(response, requestId) {
  const headers = new Headers(response.headers);
  for (const [name, value] of securityHeaders(requestId).entries()) {
    if (!["cache-control", "cross-origin-resource-policy", "x-frame-options"].includes(name) || !headers.has(name)) headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/health") {
        const origin = request.headers.get("origin") || "";
        if (!isAllowedOrigin(origin, env)) return jsonResponse(403, { error: "Origin permintaan tidak diizinkan." }, requestId, request.method);
        if (!["GET", "HEAD"].includes(request.method)) return jsonResponse(405, { error: "Metode tidak didukung." }, requestId, request.method, origin);
        return jsonResponse(200, {
          status: "ok",
          service: "ngeblogging-cloudflare",
          runtime: env.NARA_RUNTIME || "cloudflare-worker-v3",
          hostname: url.hostname,
          billing: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET),
          billingWebhook: Boolean(env.PAYPAL_WEBHOOK_ID),
          imageGeneration: Boolean((env.QWEN_API_KEY || env.DASHSCOPE_API_KEY) && env.QWEN_WORKSPACE_ID),
          seo: "tenant-edge",
          timestamp: new Date().toISOString(),
        }, requestId, request.method, origin);
      }

      if (url.pathname === "/api/nara") return await naraResponse(request, env, requestId);
      if (url.pathname === "/api/nara/image") return protectedJsonEndpoint(request, env, requestId, handleNaraImage);
      if (url.pathname === "/api/billing/paypal/webhook") return protectedJsonEndpoint(request, env, requestId, handlePayPalWebhook);
      if (url.pathname.startsWith("/api/billing/")) return protectedJsonEndpoint(request, env, requestId, handleBillingRequest);
      if (url.pathname.startsWith("/api/")) return jsonResponse(404, { error: "Endpoint tidak ditemukan." }, requestId, request.method);

      const discovery = await seoEndpoint(request, env);
      if (discovery) return withSecurity(discovery, requestId);

      const assetResponse = await env.ASSETS.fetch(request);
      const enhanced = await injectTenantSeo(request, assetResponse, env);
      return withSecurity(enhanced, requestId);
    } catch (error) {
      console.error("Cloudflare Worker request failed", {
        requestId,
        path: url.pathname,
        ray: request.headers.get("cf-ray") || "",
        name: error?.name || "Error",
      });
      return jsonResponse(500, { code: "WORKER_INTERNAL_ERROR", error: "Terjadi gangguan sementara pada layanan." }, requestId, request.method);
    }
  },
};
