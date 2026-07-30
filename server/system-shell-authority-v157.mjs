export const SYSTEM_SHELL_RELEASE_V157 = "2026.07.30-system-shell-v157";
export const AUTH_SHELL_RELEASE_V157 = "2026.07.30-auth-shell-v157";

const SYSTEM_HOSTS = new Set(["ngeblogging.com", "www.ngeblogging.com"]);
const AUTH_PATHS = new Set([
  "/login",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/recovery",
]);
const AUTH_MODES = new Set([
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

function isShellPath(url) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || AUTH_PATHS.has(path)) return true;
  return url.searchParams.has("code") || AUTH_MODES.has(url.searchParams.get("auth") || "");
}

function releaseResponse(request) {
  const body = JSON.stringify({
    status: "ok",
    release: SYSTEM_SHELL_RELEASE_V157,
    authRelease: AUTH_SHELL_RELEASE_V157,
    shell: "react-dist-index",
    legacyWhiteR4: false,
  });
  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-ngeblogging-system-shell": SYSTEM_SHELL_RELEASE_V157,
      "x-ngeblogging-auth-shell": AUTH_SHELL_RELEASE_V157,
    },
  });
}

function injectMarkers(html) {
  if (html.includes("ngeblogging-system-shell-v157")) return html;
  const markers = [
    `<meta name="ngeblogging-system-shell" content="${SYSTEM_SHELL_RELEASE_V157}"/>`,
    `<meta name="ngeblogging-auth-shell" content="${AUTH_SHELL_RELEASE_V157}"/>`,
    '<meta name="ngeblogging-legacy-white-r4" content="disabled"/>',
  ].join("");
  return /<head(?:\s[^>]*)?>/i.test(html)
    ? html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${markers}`)
    : `${markers}${html}`;
}

export async function tryServeSystemShellV157(request, env) {
  const url = new URL(request.url);
  if (!isSystemHost(url) || !["GET", "HEAD"].includes(request.method)) return null;
  if (url.pathname === "/release-v157.json") return releaseResponse(request);
  if (url.pathname.startsWith("/api/") || !isShellPath(url)) return null;
  if (!env?.ASSETS?.fetch) return null;

  const shellRequest = new Request(new URL("/index.html", request.url), {
    method: "GET",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });
  const response = await env.ASSETS.fetch(shellRequest);
  if (!response.ok) return null;

  const html = injectMarkers(await response.text());
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store, max-age=0, must-revalidate");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");
  headers.set("x-ngeblogging-system-shell", SYSTEM_SHELL_RELEASE_V157);
  headers.set("x-ngeblogging-auth-shell", AUTH_SHELL_RELEASE_V157);
  headers.set("x-ngeblogging-legacy-white-r4", "disabled");

  return new Response(request.method === "HEAD" ? null : html, {
    status: 200,
    headers,
  });
}
