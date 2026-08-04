const VERSION = "ngeblogging-app-v265-studio-stability-20260804";
const CACHE_RELEASE = "studio-stability-cache-v265";
const STUDIO_STABILITY_RELEASE_V265 = "studio-stability-v265-20260804";
const STUDIO_STABILITY_RELEASE_V260 = "studio-stability-v260-20260804-r3";
const STUDIO_SIX_MODE_RELEASE_V259 = "studio-six-mode-authority-v259-20260804";
const ROUTE_RECOVERY_COMPAT_VERSION = "ngeblogging-app-v168-route-recovery-20260730";
const AUTH_EDITOR_COMPAT_VERSION = "ngeblogging-app-v162-auth-editor-20260730";
const CONTENT_WORKFLOW_COMPAT_VERSION = "ngeblogging-app-v161-content-workflow-20260730";
const STUDIO_UI_COMPAT_VERSION = "ngeblogging-app-v159-studio-ui-contract-20260730";
const PRODUCTION_ENTRY_COMPAT_VERSION = "ngeblogging-app-v154-production-entry-20260730";
const LEGACY_VERSION = "ngeblogging-app-v153-auth-production-20260730";
const STUDIO_COMPLETION_COMPAT_VERSION = "ngeblogging-app-v151-studio-completion-20260729";
const ROUTE_RECOVERY_COMPAT_RELEASE = "route-recovery-cache-v168";
const AUTH_EDITOR_COMPAT_RELEASE = "auth-editor-cache-v162";
const CONTENT_WORKFLOW_COMPAT_RELEASE = "content-workflow-cache-v161";
const STUDIO_UI_COMPAT_RELEASE = "studio-ui-contract-cache-v159";
const PRODUCTION_ENTRY_COMPAT_RELEASE = "production-entry-cache-v154";
const LEGACY_CACHE_RELEASE = "auth-production-cache-v153";
const STUDIO_COMPLETION_COMPAT_RELEASE = "studio-completion-cache-v151";
const STUDIO_COMPLETION_COMPAT_UI = "studio-completion-v151";
const AUTH_EDITOR_COMPAT_STALE_REASON = "service-worker-stale-shell-v162";
const AUTH_EDITOR_COMPAT_ACTIVATION_REASON = "service-worker-activated-auth-editor-v162";
const LEGACY_ACTIVATION_REASON = "service-worker-activated-auth-production-v153";
const PRODUCTION_ENTRY_COMPAT_REASON = "service-worker-activated-production-entry-v154";
const PRODUCTION_ENTRY_COMPAT_STALE_REASON = "service-worker-stale-shell-v154";
const AUTH_HANDOFF_RELEASE = "auth-entry-v154-20260730";
const UI_CONTRACT_RELEASE = "studio-ui-contract-v159-20260730";
const CONTENT_WORKFLOW_RELEASE = "studio-content-workflow-v161-20260730";
const AUTH_CALLBACK_RELEASE = "auth-callback-v162-20260730";
const CONTENT_EDITOR_RELEASE = "content-editor-v162-20260730";
const PRODUCTION_RECOVERY_RELEASE = "production-route-recovery-v168-20260730";
const FIRST_SITE_RELEASE = "first-site-onboarding-v169-20260730";
const SITE_POLICY_RELEASE = "site-policy-v169-20260730";
const FORCE_REFRESH_QUERY = "ngeblogging_release";
const FORCE_REFRESH_VALUE = "first-site-v169";
const ACTIVE_VERSION_V258 = "ngeblogging-app-v258-theme-right4-20260804";
const ACTIVE_CACHE_RELEASE_V258 = "studio-theme-right4-cache-v258";
const ACTIVE_VERSION_V259 = "ngeblogging-app-v259-six-mode-authority-20260804";
const ACTIVE_CACHE_RELEASE_V259 = "studio-six-mode-cache-v259";
const ACTIVE_VERSION_V260 = VERSION;
const ACTIVE_CACHE_RELEASE_V260 = CACHE_RELEASE;
const SHELL_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${AUTH_HANDOFF_RELEASE}-shell`;
const ASSET_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${AUTH_HANDOFF_RELEASE}-assets`;
const APP_SHELL = ["/", "/studio", "/site.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(APP_SHELL.map((asset) => cache.add(new Request(asset, { cache: "reload" }))));
    await self.skipWaiting();
  })());
});

function isAuthSurface(url) {
  const authMode = url.searchParams.get("auth") || "";
  return url.pathname === "/login"
    || url.pathname === "/signup"
    || url.pathname === "/signin"
    || url.pathname === "/forgot-password"
    || url.pathname === "/reset-password"
    || url.pathname.startsWith("/auth/")
    || url.searchParams.has("code")
    || url.searchParams.has("error")
    || authMode === "signin"
    || authMode === "signup"
    || authMode === "callback"
    || authMode === "recovery"
    || authMode === "session-expired"
    || authMode === "callback-error";
}

async function refreshStaleWindow(client, url) {
  if (url.searchParams.get(FORCE_REFRESH_QUERY) === FORCE_REFRESH_VALUE) return;
  url.searchParams.set(FORCE_REFRESH_QUERY, FORCE_REFRESH_VALUE);
  url.searchParams.set("recovery_reason", "service-worker-stale-shell-v169");
  try {
    await client.navigate(url.href);
  } catch {
    // Compatibility-only helper. The active worker never invokes it from activate.
  }
}

function versionPayload(type) {
  return {
    type,
    version: VERSION,
    studioStabilityReleaseV265: STUDIO_STABILITY_RELEASE_V265,
    studioStabilityReleaseV260: STUDIO_STABILITY_RELEASE_V260,
    studioSixModeReleaseV259: STUDIO_SIX_MODE_RELEASE_V259,
    activeVersionV260: ACTIVE_VERSION_V260,
    activeCacheReleaseV260: ACTIVE_CACHE_RELEASE_V260,
    routeRecoveryCompatVersion: ROUTE_RECOVERY_COMPAT_VERSION,
    authEditorCompatVersion: AUTH_EDITOR_COMPAT_VERSION,
    contentWorkflowCompatVersion: CONTENT_WORKFLOW_COMPAT_VERSION,
    studioUiCompatVersion: STUDIO_UI_COMPAT_VERSION,
    productionEntryCompatVersion: PRODUCTION_ENTRY_COMPAT_VERSION,
    legacyVersion: LEGACY_VERSION,
    studioCompletionCompatVersion: STUDIO_COMPLETION_COMPAT_VERSION,
    release: CACHE_RELEASE,
    routeRecoveryCompatRelease: ROUTE_RECOVERY_COMPAT_RELEASE,
    authEditorCompatRelease: AUTH_EDITOR_COMPAT_RELEASE,
    authEditorCompatStaleReason: AUTH_EDITOR_COMPAT_STALE_REASON,
    authEditorCompatActivationReason: AUTH_EDITOR_COMPAT_ACTIVATION_REASON,
    contentWorkflowCompatRelease: CONTENT_WORKFLOW_COMPAT_RELEASE,
    studioUiCompatRelease: STUDIO_UI_COMPAT_RELEASE,
    productionEntryCompatRelease: PRODUCTION_ENTRY_COMPAT_RELEASE,
    legacyRelease: LEGACY_CACHE_RELEASE,
    studioCompletionCompatRelease: STUDIO_COMPLETION_COMPAT_RELEASE,
    studioCompletionCompatUi: STUDIO_COMPLETION_COMPAT_UI,
    legacyActivationReason: LEGACY_ACTIVATION_REASON,
    productionEntryCompatReason: PRODUCTION_ENTRY_COMPAT_REASON,
    productionEntryCompatStaleReason: PRODUCTION_ENTRY_COMPAT_STALE_REASON,
    authHandoffRelease: AUTH_HANDOFF_RELEASE,
    uiContractRelease: UI_CONTRACT_RELEASE,
    contentWorkflowRelease: CONTENT_WORKFLOW_RELEASE,
    authCallbackRelease: AUTH_CALLBACK_RELEASE,
    contentEditorRelease: CONTENT_EDITOR_RELEASE,
    productionRecoveryRelease: PRODUCTION_RECOVERY_RELEASE,
    firstSiteRelease: FIRST_SITE_RELEASE,
    sitePolicyRelease: SITE_POLICY_RELEASE,
  };
}

async function notifyOpenWindows() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(windows.map(async (client) => {
    try {
      const url = new URL(client.url);
      if (url.origin !== self.location.origin || isAuthSurface(url)) return;
      client.postMessage({
        ...versionPayload("NGE_BLOGGING_UPDATE_AVAILABLE_V265"),
        reason: "service-worker-activated-studio-stability-v265",
        reloadRequired: false,
      });
      // Deliberately no client.navigate(): avoids a second loading pass and preserves sessions.
    } catch {
      // Satu tab bermasalah tidak boleh memblokir pembaruan tab lainnya.
    }
  }));
}

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => ![SHELL_CACHE, ASSET_CACHE].includes(key))
      .map((key) => caches.delete(key)));
    await self.clients.claim();
    await notifyOpenWindows();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage?.(versionPayload("NGE_BLOGGING_PWA_VERSION"));
  }
});

async function networkFirst(request, fallback = null) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    const url = new URL(request.url);
    if (response.ok && response.type === "basic" && !isAuthSurface(url)) {
      const cache = await caches.open(request.mode === "navigate" ? SHELL_CACHE : ASSET_CACHE);
      await cache.put(request.mode === "navigate" ? "/" : request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request))
      || (fallback ? await caches.match(fallback) : null)
      || new Response("Ngeblogging sedang offline.", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
  }
}

async function cacheFirstImmutable(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  if (url.pathname.startsWith("/assets/")
    && /-[a-zA-Z0-9_-]{6,}\.(?:js|css|woff2?|png|jpg|jpeg|webp|avif|svg)$/i.test(url.pathname)) {
    event.respondWith(cacheFirstImmutable(request));
    return;
  }

  if (/\.(?:js|css|json|webmanifest)$/i.test(url.pathname) || url.pathname.startsWith("/src/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (/\.(?:svg|png|jpg|jpeg|webp|avif|woff2?)$/i.test(url.pathname)) {
    event.respondWith(cacheFirstImmutable(request));
  }
});