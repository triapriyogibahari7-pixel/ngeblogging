import baseWorker from "./worker-v67.mjs";

export const PRODUCTION_ENTRY_RELEASE = "2026.07.30-production-authority-v160";
export const AUTH_ENTRY_RELEASE = "2026.07.30-auth-entry-v158";
export const STUDIO_ROUTE_RELEASE = "2026.07.30-studio-route-v160";
export const UI_CONTRACT_RELEASE = "2026.07.30-studio-ui-contract-v160";
export const CONTENT_WORKFLOW_RELEASE = "2026.07.30-studio-content-workflow-v161";
export const AUTH_EDITOR_RELEASE = "2026.07.30-auth-editor-v162";
export const AUTH_CALLBACK_RELEASE = "auth-callback-singleflight-v162-20260730";
export const AUTH_CALLBACK_COMPAT_RELEASE = "auth-callback-v162-20260730";
export const AUTH_CAPACITY_RELEASE = "auth-capacity-model-v162-20260730";
export const PRODUCTION_ROUTE_COMPAT_RELEASE = "2026.07.30-production-route-authority-v163";
export const PRODUCTION_CUSTOM_DOMAIN_COMPAT_RELEASE = "2026.07.30-production-custom-domain-authority-v164";
export const PRODUCTION_DOMAIN_ATTACH_COMPAT_RELEASE = "2026.07.30-production-domain-attach-v165";
export const PRODUCTION_RECOVERY_RELEASE = "2026.07.30-production-route-recovery-v168";
export const PRODUCTION_ROUTE_RELEASE = PRODUCTION_RECOVERY_RELEASE;

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
  "/release-v161.json",
  "/release-v162.json",
  "/release-v163.json",
  "/release-v164.json",
  "/release-v165.json",
  "/release-v168.json",
]);
const DIAGNOSTIC_ASSET_PATHS = new Set([
  "/auth-capacity-v162.json",
  "/auth-capacity-v162.html",
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
    release: PRODUCTION_RECOVERY_RELEASE,
    productionEntryRelease: PRODUCTION_ENTRY_RELEASE,
    authEntryRelease: AUTH_ENTRY_RELEASE,
    studioRouteRelease: STUDIO_ROUTE_RELEASE,
    uiContractRelease: UI_CONTRACT_RELEASE,
    contentWorkflowRelease: CONTENT_WORKFLOW_RELEASE,
    authEditorRelease: AUTH_EDITOR_RELEASE,
    authCallbackRelease: AUTH_CALLBACK_RELEASE,
    authCallbackCompatibility: AUTH_CALLBACK_COMPAT_RELEASE,
    authCapacityRelease: AUTH_CAPACITY_RELEASE,
    productionRouteCompatibility: PRODUCTION_ROUTE_COMPAT_RELEASE,
    productionCustomDomainCompatibility: PRODUCTION_CUSTOM_DOMAIN_COMPAT_RELEASE,
    productionDomainAttachCompatibility: PRODUCTION_DOMAIN_ATTACH_COMPAT_RELEASE,
    productionRecoveryRelease: PRODUCTION_RECOVERY_RELEASE,
    contentEditorRelease: "content-editor-v162-20260730",
    studioRoutes: ["/studio", "/dashboard", "/workspace"],
    responsiveFamilies: ["application", "phone", "mobile", "compact", "tablet", "desktop"],
    desktopVariants: ["laptop", "computer"],
    summaryRealCounts: true,
    previewPublishedOnly: true,
    duplicateCreatesDraft: true,
    pagesUseSameWorkflow: true,
    pkceExplicitExchange: true,
    pkceSingleFlight: true,
    callbackProcessors: 1,
    emailPasswordSessionHandoff: true,
    sessionPersistsUntilExplicitLogout: true,
    capacityModelOnly: true,
    capacityVisualization: "/auth-capacity-v162.html",
    mobileEditorMinimumWidth: 320,
    wordLimit: 5000,
    routeAuthority: "cloudflare-route-takeover-v168",
    routePatterns: ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"],
    apexRouteTakeover: true,
    wwwRouteTakeover: true,
    tenantWildcardPreserved: true,
    shell: "react-dist-index",
    workerAuthority: "worker-v69-route-recovery-v168",
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
      "x-ngeblogging-content-workflow": CONTENT_WORKFLOW_RELEASE,
      "x-ngeblogging-auth-editor": AUTH_EDITOR_RELEASE,
      "x-ngeblogging-auth-callback": AUTH_CALLBACK_RELEASE,
      "x-ngeblogging-auth-capacity": AUTH_CAPACITY_RELEASE,
      "x-ngeblogging-production-route": PRODUCTION_RECOVERY_RELEASE,
      "x-ngeblogging-production-authority": PRODUCTION_RECOVERY_RELEASE,
      "x-ngeblogging-production-recovery": PRODUCTION_RECOVERY_RELEASE,
      "x-ngeblogging-worker-authority": "worker-v69-route-recovery-v168",
    },
  });
}

function injectReleaseMarker(html) {
  if (
    html.includes("ngeblogging-production-route-recovery-v168")
    && html.includes("ngeblogging-auth-callback-singleflight-v162")
  ) return html;
  const marker = [
    `<meta name="ngeblogging-production-entry" content="${PRODUCTION_ENTRY_RELEASE}"/>`,
    `<meta name="ngeblogging-auth-entry" content="${AUTH_ENTRY_RELEASE}"/>`,
    `<meta name="ngeblogging-studio-route" content="${STUDIO_ROUTE_RELEASE}"/>`,
    `<meta name="ngeblogging-ui-contract" content="${UI_CONTRACT_RELEASE}"/>`,
    `<meta name="ngeblogging-studio-content-v161" content="${CONTENT_WORKFLOW_RELEASE}"/>`,
    `<meta name="ngeblogging-auth-editor-v162" content="${AUTH_EDITOR_RELEASE}"/>`,
    `<meta name="ngeblogging-auth-callback-singleflight-v162" content="${AUTH_CALLBACK_RELEASE}"/>`,
    `<meta name="ngeblogging-auth-capacity-v162" content="${AUTH_CAPACITY_RELEASE}"/>`,
    `<meta name="ngeblogging-production-route-v163" content="${PRODUCTION_ROUTE_COMPAT_RELEASE}"/>`,
    `<meta name="ngeblogging-production-custom-domain-v164" content="${PRODUCTION_CUSTOM_DOMAIN_COMPAT_RELEASE}"/>`,
    `<meta name="ngeblogging-production-domain-attach-v165" content="${PRODUCTION_DOMAIN_ATTACH_COMPAT_RELEASE}"/>`,
    `<meta name="ngeblogging-production-route-recovery-v168" content="${PRODUCTION_RECOVERY_RELEASE}"/>`,
    '<meta name="ngeblogging-worker-authority" content="worker-v69-route-recovery-v168"/>',
    '<meta name="ngeblogging-legacy-white-r4" content="disabled"/>',
  ].join("");
  return /<head(?:\s[^>]*)?>/i.test(html)
    ? html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${marker}`)
    : `${marker}${html}`;
}

async function serveStaticDiagnostic(request, env) {
  if (!env?.ASSETS?.fetch) return null;
  const response = await env.ASSETS.fetch(request);
  if (!response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, max-age=0, must-revalidate");
  headers.set("x-ngeblogging-auth-capacity", AUTH_CAPACITY_RELEASE);
  headers.set("x-ngeblogging-production-authority", PRODUCTION_RECOVERY_RELEASE);
  headers.set("x-ngeblogging-production-recovery", PRODUCTION_RECOVERY_RELEASE);
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    headers,
  });
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
  headers.set("x-ngeblogging-content-workflow", CONTENT_WORKFLOW_RELEASE);
  headers.set("x-ngeblogging-auth-editor", AUTH_EDITOR_RELEASE);
  headers.set("x-ngeblogging-auth-callback", AUTH_CALLBACK_RELEASE);
  headers.set("x-ngeblogging-auth-capacity", AUTH_CAPACITY_RELEASE);
  headers.set("x-ngeblogging-production-route", PRODUCTION_RECOVERY_RELEASE);
  headers.set("x-ngeblogging-production-authority", PRODUCTION_RECOVERY_RELEASE);
  headers.set("x-ngeblogging-production-recovery", PRODUCTION_RECOVERY_RELEASE);
  headers.set("x-ngeblogging-shell", "react-dist-index");
  headers.set("x-ngeblogging-worker-authority", "worker-v69-route-recovery-v168");
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

    if (isSystemHost(url) && DIAGNOSTIC_ASSET_PATHS.has(url.pathname)) {
      const diagnostic = await serveStaticDiagnostic(request, env);
      if (diagnostic) return diagnostic;
    }

    if (isSystemShellRequest(request, url)) {
      return serveReactShell(request, env, context);
    }

    return baseWorker.fetch(request, env, context);
  },
};
