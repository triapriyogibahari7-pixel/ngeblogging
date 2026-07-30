import baseWorker from "./worker-v67.mjs";

export const PRODUCTION_ENTRY_RELEASE = "2026.07.30-production-entry-v154";
export const AUTH_ENTRY_RELEASE = "2026.07.30-auth-entry-v154";
export const STUDIO_ROUTE_RELEASE = "2026.07.30-auth-studio-route-v158";

const SYSTEM_HOSTS = new Set(["ngeblogging.com", "www.ngeblogging.com"]);
const SYSTEM_SHELL_PATHS = new Set([
  "/studio",
  "/dashboard",
  "/workspace",
  "/login",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/recovery",
]);
const AUTH_QUERY_MODES = new Set([
  "signin",
  "signup",
  "callback",
  "recovery",
  "session-expired",
  "callback-error",
]);

function isSystemHost(url) {
  return SYSTEM_HOSTS.has(url.hostname.toLowerCase());
}

function isSystemShellRequest(request, url) {
  if (!["GET", "HEAD"].includes(request.method) || !isSystemHost(url)) return false;
  if (url.pathname.startsWith("/api/")) return false;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || SYSTEM_SHELL_PATHS.has(path)) return true;
  return url.searchParams.has("code") || AUTH_QUERY_MODES.has(url.searchParams.get("auth") || "");
}

function releaseResponse(request) {
  const body = JSON.stringify({
    status: "ok",
    release: PRODUCTION_ENTRY_RELEASE,
    authEntryRelease: AUTH_ENTRY_RELEASE,
    studioRouteRelease: STUDIO_ROUTE_RELEASE,
    studioRoutes: ["/studio", "/dashboard", "/workspace"],
    shell: "react-dist-index",
    legacyWhiteR4: false,
    generatedAt: new Date().toISOString(),
  });
  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-ngeblogging-production-entry": PRODUCTION_ENTRY_RELEASE,
      "x-ngeblogging-auth-entry": AUTH_ENTRY_RELEASE,
      "x-ngeblogging-studio-route": STUDIO_ROUTE_RELEASE,
    },
  });
}

function injectReleaseMarker(html) {
  if (html.includes("ngeblogging-studio-route-v158")) return html;
  const marker = [
    `<meta name="ngeblogging-production-entry" content="${PRODUCTION_ENTRY_RELEASE}"/>`,
    `<meta name="ngeblogging-auth-entry" content="${AUTH_ENTRY_RELEASE}"/>`,
    `<meta name="ngeblogging-studio-route" content="${STUDIO_ROUTE_RELEASE}"/>`,
    `<meta name="ngeblogging-legacy-white-r4" content="disabled"/>`,
  ].join("");
  return /<head(?:\s[^>]*)?>/i.test(html)
    ? html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${marker}`)
    : `${marker}${html}`;
}

async function serveReactShell(request, env, context) {
  if (!env?.ASSETS?.fetch) return baseWorker.fetch(request, env, context);

  const shellUrl = new URL("/index.html", request.url);
  const shellRequest = new Request(shellUrl, {
    method: "GET",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });
  const asset = await env.ASSETS.fetch(shellRequest);
  if (!asset.ok) return baseWorker.fetch(request, env, context);

  const html = injectReleaseMarker(await asset.text());
  const headers = new Headers(asset.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store, max-age=0, must-revalidate");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");
  headers.set("vary", "Accept-Encoding");
  headers.set("x-ngeblogging-production-entry", PRODUCTION_ENTRY_RELEASE);
  headers.set("x-ngeblogging-auth-entry", AUTH_ENTRY_RELEASE);
  headers.set("x-ngeblogging-studio-route", STUDIO_ROUTE_RELEASE);
  headers.set("x-ngeblogging-shell", "react-dist-index");
  headers.set("x-ngeblogging-legacy-white-r4", "disabled");

  return new Response(request.method === "HEAD" ? null : html, {
    status: 200,
    headers,
  });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (isSystemHost(url) && ["/release-v154.json", "/release-v158.json"].includes(url.pathname)) {
      return releaseResponse(request);
    }

    if (isSystemShellRequest(request, url)) {
      return serveReactShell(request, env, context);
    }

    return baseWorker.fetch(request, env, context);
  },
};
