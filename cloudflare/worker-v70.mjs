import { domainPaymentNotificationResponse } from "../server/domain-payment-notification-handler.mjs";
import { domainQuotePreviewResponse } from "../server/domain-quote-preview-handler.mjs";
import { domainOrderPreviewResponse } from "../server/domain-order-preview-handler.mjs";
import { registrarDiagnosticResponse } from "../server/registrar-diagnostic-handler.mjs";
import { stage5PreviewResponse } from "./domain-stage5-preview-router.mjs";
import baseWorker from "./worker-v69.mjs";
import { paymentDiagnosticPage } from "../server/payment-diagnostic-page.mjs";
import { handleMidtrans, paths as midtransPaths } from "../server/midtrans-catalog-api.mjs";
import { legalResponse, legalDiscovery } from "../server/legal-pages.mjs";
export const PUBLIC_EDGE_RELEASE_V282 = "public-edge-request-dedup-v282-20260805";
const SYSTEM_HOSTS = new Set(["ngeblogging.com", "www.ngeblogging.com"]);
const SEO_DYNAMIC_PATHS = new Set(["/robots.txt", "/sitemap.xml", "/sitemap-posts.xml", "/feed.xml", "/rss.xml", "/atom.xml", "/llms.txt", "/manifest.webmanifest"]);
const DIRECT_STATIC_PATHS = new Set(["/sw.js", "/favicon.svg", "/favicon.ico", "/apple-touch-icon.png", "/browserconfig.xml"]);
const REGISTRAR_DIAGNOSTIC_ASSETS = new Set(["/assets/registrar-diagnostic-stage6", "/assets/registrar-diagnostic-stage6.html", "/assets/registrar-diagnostic-stage6.mjs"]);
const RELEASE_MANIFEST = /^\/release-v\d+\.json$/i;
const STATIC_EXTENSION = /\.(?:m?js|css|map|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|m4a|wav|ogg|pdf)$/i;
const HASHED_ASSET = /(?:^|\/)[^/]*[-_.][a-f0-9]{8,}\.[a-z0-9]+$/i;
function isDirectStaticRequest(request, url) {
  if (!["GET", "HEAD"].includes(request.method)) return false;
  if (url.pathname.startsWith("/api/") || SEO_DYNAMIC_PATHS.has(url.pathname)) return false;
  if (url.pathname.startsWith("/assets/")) return true;
  if (DIRECT_STATIC_PATHS.has(url.pathname) || RELEASE_MANIFEST.test(url.pathname)) return true;
  return STATIC_EXTENSION.test(url.pathname) && !url.pathname.startsWith("/.well-known/");
}
function cachePolicy(url) {
  if (REGISTRAR_DIAGNOSTIC_ASSETS.has(url.pathname)) return "no-store, max-age=0, must-revalidate";
  if (url.pathname === "/sw.js") return "no-cache, no-store, must-revalidate";
  if (RELEASE_MANIFEST.test(url.pathname)) return "no-store, max-age=0, must-revalidate";
  if (HASHED_ASSET.test(url.pathname) || url.pathname.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  return "public, max-age=3600, s-maxage=86400";
}
async function serveStaticAsset(request, env) {
  if (!env?.ASSETS?.fetch) return null;
  const response = await env.ASSETS.fetch(request);
  const url = new URL(request.url);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html") && !/\.html?$/i.test(url.pathname) && url.pathname !== "/assets/registrar-diagnostic-stage6") {
    return new Response(request.method === "HEAD" ? null : "Asset not found", {status:404,headers:{"content-type":"text/plain; charset=utf-8","cache-control":"no-store","x-ngeblogging-public-edge":PUBLIC_EDGE_RELEASE_V282,"x-ngeblogging-static-fallback-blocked":"true"}});
  }
  const headers = new Headers(response.headers);
  headers.set("cache-control", cachePolicy(url));
  headers.set("x-ngeblogging-public-edge", PUBLIC_EDGE_RELEASE_V282);
  headers.set("x-ngeblogging-static-fast-path", "true");
  headers.set("x-content-type-options", "nosniff");
  if (request.method === "HEAD") return new Response(null, {status:response.status,statusText:response.statusText,headers});
  return new Response(response.body, {status:response.status,statusText:response.statusText,headers});
}
export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const domainPayment = await domainPaymentNotificationResponse(request, env);
    if (domainPayment) return domainPayment;
    const domainQuote = await domainQuotePreviewResponse(request, env);
    if (domainQuote) return domainQuote;
    const domainOrder = await domainOrderPreviewResponse(request, env);
    if (domainOrder) return domainOrder;
    const registrarDiagnostic = await registrarDiagnosticResponse(request, env);
    if (registrarDiagnostic) return registrarDiagnostic;
    const stage5 = await stage5PreviewResponse(request);
    if (stage5) return stage5;
    const paymentDiagnostic = await paymentDiagnosticPage(request, env);
    if (paymentDiagnostic) return paymentDiagnostic;
    const legal = legalResponse(request);
    if (legal) return legal;
    if (midtransPaths.has(url.pathname)) return handleMidtrans(request, env);
    if (isDirectStaticRequest(request, url)) {
      const staticResponse = await serveStaticAsset(request, env);
      if (staticResponse) return staticResponse;
    }
    const response = await legalDiscovery(request, await baseWorker.fetch(request, env, context));
    const headers = new Headers(response.headers);
    headers.set("x-ngeblogging-public-edge", PUBLIC_EDGE_RELEASE_V282);
    if (SYSTEM_HOSTS.has(url.hostname.toLowerCase()) && url.pathname === "/api/health") headers.set("x-ngeblogging-static-fast-path", "enabled");
    return new Response(response.body, {status:response.status,statusText:response.statusText,headers});
  },
};
