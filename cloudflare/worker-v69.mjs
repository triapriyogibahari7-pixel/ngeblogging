import baseWorker from "./worker-v67.mjs";

export const PRODUCTION_ENTRY_RELEASE = "2026.07.30-production-authority-v160";
export const AUTH_ENTRY_RELEASE = "2026.07.30-auth-entry-v158";
export const STUDIO_ROUTE_RELEASE = "2026.07.30-studio-route-v160";
export const UI_CONTRACT_RELEASE = "2026.07.30-studio-ui-contract-v160";

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
const RELEASE_PATHS = new Set([
  "/release-v154.json",
  "/release-v158.json",
  "/release-v159.json",
  "/release-v160.json",
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
    uiContractRelease: UI_CONTRACT_RELEASE,
    studioRoutes: ["/studio", "/dashboard", "/workspace"],
    responsiveFamilies: ["application", "phone", "mobile", "compact", "tablet", "desktop"],
    desktopVariants: ["laptop", "computer"],
    shell: "react-dist-index",
    customDomainAuthority: "worker-v69",
    legacyWhiteR4: false,
    generatedAt: new Date().toISOString(),
  });
  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0, must-revalidate",
      "x-ngeblogging-production-entry": PRODUCTION_ENTRY_RELEASE,
      "x-ngeblogging-auth-entry": AUTH_ENTRY_RELEASE,
      "x-ngeblogging-studio-route": STUDIO_ROUTE_RELEASE,
      "x-ngeblogging-ui-contract": UI_CONTRACT_RELEASE,
      "x-ngeblogging-custom-domain-authority": "worker-v69",
    },
  });
}

function injectReleaseMarker(html) {
  if (html.includes("ngeblogging-production-authority-v160")) return html;
  const marker = [
    `<meta name="ngeblogging-production-entry" content="${PRODUCTION_ENTRY_RELEASE}"/>`,
    `<meta name="ngeblogging-auth-entry" content="${AUTH_ENTRY_RELEASE}"/>`,
    `<meta name="ngeblogging-studio-route" content="${STUDIO_ROUTE_RELEASE}"/>`,
    `<meta name="ngeblogging-ui-contract" content="${UI_CONTRACT_RELEASE}"/>`,
    '<meta name="ngeblogging-custom-domain-authority" content="worker-v69"/>',
    '<meta name="ngeblogging-legacy-white-r4" content="disabled"/>',
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
  headers.set("x-ngeblogging-ui-contract", UI_CONTRACT_RELEASE);
  headers.set("x-ngeblogging-shell", "react-dist-index");
  headers.set("x-ngeblogging-custom-domain-authority", "worker-v69");
  headers.set("x-ngeblogging-legacy-white-r4", "disabled");

  return new Response(request.method === "HEAD" ? null : html, {
    status: 200,
    headers,
  });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (isSystemHost(url) && RELEASE_PATHS.has(url.pathname)) {
      return releaseResponse(request);
    }

    if (isSystemShellRequest(request, url)) {
      return serveReactShell(request, env, context);
    }

    return baseWorker.fetch(request, env, context);
  },
};
