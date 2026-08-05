import baseWorker from "./worker-v69.mjs";

export const PUBLIC_EDGE_RELEASE_V282 = "public-edge-request-dedup-v282-20260805";

const SYSTEM_HOSTS = new Set(["ngeblogging.com", "www.ngeblogging.com"]);
const SEO_DYNAMIC_PATHS = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-posts.xml",
  "/feed.xml",
  "/rss.xml",
  "/atom.xml",
  "/llms.txt",
  "/manifest.webmanifest",
]);
const DIRECT_STATIC_PATHS = new Set([
  "/sw.js",
  "/favicon.svg",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/browserconfig.xml",
]);
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

  // Wrangler SPA fallback can return index.html for an unknown asset. Never send
  // the React HTML shell as JavaScript/CSS/image/release JSON; that causes retries,
  // parser errors, and the apparent second page load reported on tenant sites.
  if (contentType.includes("text/html") && !/\.html?$/i.test(url.pathname)) {
    return new Response(request.method === "HEAD" ? null : "Asset not found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-ngeblogging-public-edge": PUBLIC_EDGE_RELEASE_V282,
        "x-ngeblogging-static-fallback-blocked": "true",
      },
    });
  }

  const headers = new Headers(response.headers);
  headers.set("cache-control", cachePolicy(url));
  headers.set("x-ngeblogging-public-edge", PUBLIC_EDGE_RELEASE_V282);
  headers.set("x-ngeblogging-static-fast-path", "true");
  headers.set("x-content-type-options", "nosniff");
  if (request.method === "HEAD") return new Response(null, { status: response.status, statusText: response.statusText, headers });
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    // Static files never need tenant canonical-domain lookup, tenant SEO resolution,
    // comment injection, or analytics HTML injection. Bypass the historical worker
    // chain so one page load does not query Supabase again for every JS/CSS/icon.
    if (isDirectStaticRequest(request, url)) {
      const staticResponse = await serveStaticAsset(request, env);
      if (staticResponse) return staticResponse;
    }

    const response = await baseWorker.fetch(request, env, context);
    const headers = new Headers(response.headers);
    headers.set("x-ngeblogging-public-edge", PUBLIC_EDGE_RELEASE_V282);
    if (SYSTEM_HOSTS.has(url.hostname.toLowerCase()) && url.pathname === "/api/health") {
      headers.set("x-ngeblogging-static-fast-path", "enabled");
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
