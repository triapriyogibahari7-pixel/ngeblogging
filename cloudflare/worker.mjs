import { handleRequest } from "../server/nara-runtime.mjs";
import { handleBillingRequest } from "../server/billing-handler.mjs";
import { handlePayPalWebhook } from "../server/paypal-webhook-handler.mjs";
import { handleNaraImage, imageGenerationReady } from "../server/nara-image-handler.mjs";
import { handleDomainRequest } from "../server/domain-handler.mjs";
import { handleDomainRedirectRequest, resolveDomainRedirect } from "../server/domain-redirect-handler.mjs";
import { injectTenantSeo, seoEndpoint } from "../server/seo-handler.mjs";
import { handleWorkersAiNara, workersAiReady, workersVisionReady } from "../server/workers-ai-nara.mjs";

const MAX_REQUEST_BYTES = 20 * 1024 * 1024;
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "OPTIONS"]);
const DEFAULT_SITE_ORIGIN = "https://ngeblogging.com";

function enabled(value) {
  return ["1", "true", "yes", "on", "enabled"].includes(String(value || "").trim().toLowerCase());
}

function qwenKey(env) {
  return String(env.QWEN_API_KEY || env.DASHSCOPE_API_KEY || "").trim();
}

function qwenTextReady(env) {
  const region = String(env.QWEN_REGION || "singapore").trim().toLowerCase();
  const endpointAvailable = Boolean(env.QWEN_API_BASE_URL || env.QWEN_WORKSPACE_ID || region === "singapore");
  return Boolean(qwenKey(env) && endpointAvailable);
}

function naraTextReady(env) {
  return qwenTextReady(env) || workersAiReady(env);
}

function naraImageReady(env) {
  return imageGenerationReady(env);
}

function paypalReady(env) {
  return Boolean(
    env.PAYPAL_CLIENT_ID
    && env.PAYPAL_CLIENT_SECRET
    && env.PAYPAL_WEBHOOK_ID
    && String(env.PAYPAL_ENV || "").toLowerCase() === "live",
  );
}

function localBillingReady(env) {
  if (!env.LOCAL_PAYMENT_GATEWAY_URL || !env.LOCAL_PAYMENT_GATEWAY_SECRET) return false;
  try {
    const prices = JSON.parse(env.LOCAL_PLAN_PRICES_JSON || "{}");
    return Object.values(prices).some((value) => {
      const amount = Number(value?.amount);
      const currency = String(value?.currency || "").toUpperCase();
      return Number.isFinite(amount) && amount > 0 && /^[A-Z]{3}$/.test(currency);
    });
  } catch {
    return false;
  }
}

function brandedEmailReady(env) {
  const sender = String(env.AUTH_EMAIL_FROM || "").trim().toLowerCase();
  const deliveryProbe = String(env.AUTH_EMAIL_DELIVERY_PROBE || "").trim().toLowerCase();
  return enabled(env.AUTH_BRANDED_EMAIL_READY)
    && sender.endsWith("@ngeblogging.com")
    && deliveryProbe === "passed";
}

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
    headers.set("access-control-allow-headers", "content-type, authorization, cache-control");
    headers.set("access-control-allow-methods", "GET, HEAD, POST, OPTIONS");
    headers.set("access-control-expose-headers", "x-request-id, x-ngeblogging-domain-redirect, x-ngeblogging-api-origin");
    headers.set("access-control-max-age", "86400");
    headers.set("vary", "Origin");
  }
  return headers;
}

function jsonResponse(status, body, requestId, method = "GET", corsOrigin = "") {
  const payload = JSON.stringify(body);
  const headers = securityHeaders(requestId, corsOrigin);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-ngeblogging-api-origin", "cloudflare-worker-v60");
  return new Response(method === "HEAD" ? null : payload, { status, headers });
}

function preflightResponse(request, env, requestId) {
  const origin = request.headers.get("origin") || "";
  if (!isAllowedOrigin(origin, env)) {
    return jsonResponse(403, { code: "ORIGIN_NOT_ALLOWED", error: "Origin permintaan tidak diizinkan." }, requestId, request.method);
  }
  const headers = securityHeaders(requestId, origin);
  headers.set("x-ngeblogging-api-origin", "cloudflare-worker-v60");
  return new Response(null, { status: 204, headers });
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

  if (!qwenTextReady(env)) {
    if (workersAiReady(env)) return handleWorkersAiNara(request, env, requestId, origin);
    return jsonResponse(503, { code: "NARA_NOT_CONFIGURED", error: "Mesin Nara belum terhubung pada deployment server." }, requestId, request.method, origin);
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
  responseHeaders.set("x-ngeblogging-api-origin", "cloudflare-worker-v60");
  return new Response(request.method === "HEAD" ? null : result.body || null, { status: result.statusCode, headers: responseHeaders });
}

async function protectedJsonEndpoint(request, env, requestId, handler) {
  const origin = request.headers.get("origin") || "";
  if (!isAllowedOrigin(origin, env)) return jsonResponse(403, { code: "ORIGIN_NOT_ALLOWED", error: "Origin permintaan tidak diizinkan." }, requestId, request.method);
  const result = await handler(request, env, requestId);
  const headers = new Headers(result.headers);
  for (const [name, value] of securityHeaders(requestId, origin).entries()) headers.set(name, value);
  headers.set("x-ngeblogging-api-origin", "cloudflare-worker-v60");
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
  async fetch(request, env, context) {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);
    try {
      if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
        return preflightResponse(request, env, requestId);
      }

      if (url.pathname === "/api/health") {
        const origin = request.headers.get("origin") || "";
        if (!isAllowedOrigin(origin, env)) return jsonResponse(403, { error: "Origin permintaan tidak diizinkan." }, requestId, request.method);
        if (!["GET", "HEAD"].includes(request.method)) return jsonResponse(405, { error: "Metode tidak didukung." }, requestId, request.method, origin);
        const paypal = paypalReady(env);
        const localBilling = localBillingReady(env);
        const nara = naraTextReady(env);
        const imageGeneration = naraImageReady(env);
        return jsonResponse(200, {
          status: "ok",
          service: "ngeblogging-cloudflare",
          release: "2026.07.27-domain-api-v60",
          runtime: env.NARA_RUNTIME || "cloudflare-worker-v60",
          hostname: url.hostname,
          billing: paypal || localBilling,
          billingProviders: { paypal, local: localBilling },
          nara,
          naraProviders: { qwen: qwenTextReady(env), workersAi: workersAiReady(env), vision: workersVisionReady(env) },
          imageGeneration,
          imageProviders: { qwen: Boolean(qwenKey(env) && String(env.QWEN_WORKSPACE_ID || "").trim()), workersAi: workersAiReady(env) },
          customDomains: Boolean(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID && env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY),
          domainRedirects: Boolean((env.SUPABASE_URL || env.VITE_SUPABASE_URL) && (env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)),
          domainApiOrigin: String(env.PUBLIC_API_ORIGIN || "https://api.ngeblogging.com"),
          emailRegistration: brandedEmailReady(env),
          managedSubdomains: true,
          siteLimits: { free: 5, maximum: 12 },
          seo: "tenant-edge",
          timestamp: new Date().toISOString(),
        }, requestId, request.method, origin);
      }

      if (url.pathname === "/api/nara") return await naraResponse(request, env, requestId);
      if (url.pathname === "/api/nara/image") {
        if (!naraImageReady(env)) return jsonResponse(503, { code: "NARA_IMAGE_NOT_CONFIGURED", error: "Generator gambar belum terhubung ke penyedia AI." }, requestId, request.method, request.headers.get("origin") || "");
        return protectedJsonEndpoint(request, env, requestId, handleNaraImage);
      }
      if (url.pathname.startsWith("/api/domain-redirects/")) return protectedJsonEndpoint(request, env, requestId, handleDomainRedirectRequest);
      if (url.pathname.startsWith("/api/domains/")) return protectedJsonEndpoint(request, env, requestId, handleDomainRequest);
      if (url.pathname === "/api/billing/paypal/webhook") return protectedJsonEndpoint(request, env, requestId, handlePayPalWebhook);
      if (url.pathname.startsWith("/api/billing/")) return protectedJsonEndpoint(request, env, requestId, handleBillingRequest);
      if (url.pathname.startsWith("/api/")) return jsonResponse(404, { code: "API_ENDPOINT_NOT_FOUND", error: "Endpoint tidak ditemukan." }, requestId, request.method, request.headers.get("origin") || "");

      const domainRedirect = await resolveDomainRedirect(request, env, context);
      if (domainRedirect) return withSecurity(domainRedirect, requestId);

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
        code: error?.code || "",
      });
      return jsonResponse(500, { code: error?.code || "WORKER_INTERNAL_ERROR", error: error?.message || "Terjadi gangguan sementara pada layanan." }, requestId, request.method, request.headers.get("origin") || "");
    }
  },
};
