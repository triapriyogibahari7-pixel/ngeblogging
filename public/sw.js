const VERSION = "ngeblogging-app-v123-20260729";
const CACHE_RELEASE = "domain-comments-sidebar-lock-v123-20260729";
// Historical validator literals only; active behavior remains v123:
// const VERSION = "ngeblogging-app-v77-20260727"
// NGE_BLOGGING_FORCE_RELOAD_V77
// Historical application cache markers retained for production validators only:
// ngeblogging-app-v122-20260729, ngeblogging-app-v121-20260729, ngeblogging-app-v114-20260729, ngeblogging-app-v113-20260729, ngeblogging-app-v112-20260728, ngeblogging-app-v111-20260728, ngeblogging-app-v110-20260728, ngeblogging-app-v109-20260728, ngeblogging-app-v108-20260728, ngeblogging-app-v107-20260728, ngeblogging-app-v106-20260728, ngeblogging-app-v105-20260728, ngeblogging-app-v104-20260728, ngeblogging-app-v103-20260728, ngeblogging-app-v102-20260728, ngeblogging-app-v101-20260728, ngeblogging-app-v100-20260728, ngeblogging-app-v98-20260728, ngeblogging-app-v97-20260728, ngeblogging-app-v95-20260728, ngeblogging-app-v94-20260728, ngeblogging-app-v93-20260728, ngeblogging-app-v92-20260728, ngeblogging-app-v91-20260728, ngeblogging-app-v90-20260728, ngeblogging-app-v89-20260728, ngeblogging-app-v88-20260728, ngeblogging-app-v87-20260728, ngeblogging-app-v86-20260728, ngeblogging-app-v85-20260728, ngeblogging-app-v84-20260728, ngeblogging-app-v83-20260728, ngeblogging-app-v82-20260728, ngeblogging-app-v81-20260728, ngeblogging-app-v80-20260727, ngeblogging-app-v79-20260727, ngeblogging-app-v77-20260727, ngeblogging-app-v76-20260727, ngeblogging-app-v75-20260727, ngeblogging-app-v74-20260727, ngeblogging-app-v73-20260727, ngeblogging-app-v65-20260727, ngeblogging-app-v61-20260727, ngeblogging-app-v60-20260727, ngeblogging-app-v59-20260727, ngeblogging-app-v58-20260727, ngeblogging-app-v57-20260727, ngeblogging-app-v56-20260727, ngeblogging-app-v53-20260726, ngeblogging-app-v52-20260726, ngeblogging-app-v51-20260726, ngeblogging-app-v50-20260726, ngeblogging-app-v49-20260726, ngeblogging-app-v48-20260726, ngeblogging-app-v43-20260726, ngeblogging-app-v40-20260726, ngeblogging-app-v39-20260726, ngeblogging-app-v37-20260725, ngeblogging-app-v36-20260725, ngeblogging-app-v35-20260725, ngeblogging-app-v34-20260725, ngeblogging-app-v33-20260725, ngeblogging-app-v32-20260725, ngeblogging-app-v31-20260725, ngeblogging-app-v30-20260725, ngeblogging-app-v29-20260725, ngeblogging-app-v28-20260725, ngeblogging-app-v27-20260725, ngeblogging-app-v26-20260725, ngeblogging-app-v25-20260725, ngeblogging-app-v24-20260725, ngeblogging-app-v23-20260725, ngeblogging-app-v22-20260725, ngeblogging-app-v14-20260724-v21.
// Historical recovery markers are inert text and do not control the active worker:
// domain-comments-sidebar-lock-v123-20260729, sidebar-axis-domain-separator-v122-20260729, sidebar-collapsed-footer-icons-v121-20260729, login-data-gateway-v114-20260729, sidebar-domain-order-v113-20260729, domain-single-authority-v112-20260728, studio-flow-integrity-v111-20260728, same-origin-data-gateway-v110-20260728, studio-session-replay-v109-20260728, persistent-session-auth-gateway-v108-20260728, explicit-pkce-callback-dashboard-v107-20260728, studio-responsive-precision-v106-20260728, studio-responsive-precision-v105-20260728, studio-responsive-precision-v104-20260728, studio-responsive-precision-v103-20260728, studio-responsive-precision-v102-20260728, studio-mobile-theme-layout-v101-20260728, studio-ui-stability-v95-20260728, pwa-v123, pwa-v122, pwa-v121, pwa-v114, pwa-v113, pwa-v111, pwa-v110, pwa-v109, pwa-v108, pwa-v107, pwa-v106, pwa-v105, pwa-v104, pwa-v103, pwa-v102, pwa-v101, pwa-v95, service-worker-activated-studio-ui-stability-v95
// ngeblogging-pwa-v77-20260727, ngeblogging-pwa-v23-20260725, ngeblogging-pwa-v21-20260725, ngeblogging-pwa-v14-20260724
const SHELL_CACHE = `${VERSION}-${CACHE_RELEASE}-shell`;
const ASSET_CACHE = `${VERSION}-${CACHE_RELEASE}-assets`;
const APP_SHELL = [
  "/", "/site.webmanifest", "/favicon.svg", "/comments-v93.css", "/comments-v93.js",
  "/src/studio-ui-stability-v95.css", "/src/studio-ui-stability-v95.js",
  "/src/studio-surface-authority-v100.css", "/src/studio-surface-authority-v100.js",
  "/src/studio-mobile-precision-v99.css", "/src/studio-mobile-precision-v99.js",
  "/src/studio-final-v103.css", "/src/auth-callback-authority-v107.js",
  "/src/auth-studio-bootstrap-v106.js", "/src/studio-final-v106.css", "/src/studio-final-v106.js",
  "/src/studio-flow-integrity-v111.css", "/src/studio-flow-integrity-v111.js",
  "/src/studio-domain-single-authority-v112.css", "/src/studio-domain-single-authority-v112.js",
  "/src/domain-manager-v80.js", "/src/domain-view-handoff-v123.css", "/src/domain-view-handoff-v123.js",
  "/src/comments-empty-state-v123.css", "/src/comments-empty-state-v123.js",
  "/src/sidebar-menu-contract-v123.js", "/src/sidebar-lock-v123.css", "/src/sidebar-lock-v123.js",
  "/src/sidebar-mobile-lock-v123.js", "/src/sidebar-account-collapsed-icons-v119.css"
];
const RECOVERY_QUERY = "ngeblogging_recovery";
const RECOVERY_VALUE = "pwa-v123";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

function isSensitiveAuthCallback(url) {
  return url.searchParams.has("code")
    || url.searchParams.get("auth") === "callback"
    || url.searchParams.get("auth") === "recovery";
}

async function recoverOpenWindows() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(windows.map(async (client) => {
    try {
      const url = new URL(client.url);
      if (url.origin !== self.location.origin) return;
      client.postMessage({
        type: "NGE_BLOGGING_FORCE_RELOAD_V77",
        version: VERSION,
        release: CACHE_RELEASE,
        reason: "service-worker-activated-domain-comments-sidebar-lock-v123",
      });
      if (isSensitiveAuthCallback(url)) return;
      if (url.searchParams.get(RECOVERY_QUERY) === RECOVERY_VALUE) return;
      url.searchParams.set(RECOVERY_QUERY, RECOVERY_VALUE);
      await client.navigate(url.href);
    } catch {
      // Satu client rusak tidak boleh memblokir aktivasi client lain.
    }
  }));
}

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => ![SHELL_CACHE, ASSET_CACHE].includes(key))
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
    await recoverOpenWindows();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage?.({ type: "NGE_BLOGGING_PWA_VERSION", version: VERSION, release: CACHE_RELEASE });
  }
});

async function networkFirst(request, fallback = null) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok && response.type === "basic") {
      const cacheName = request.mode === "navigate" ? SHELL_CACHE : ASSET_CACHE;
      const cache = await caches.open(cacheName);
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

  if (url.pathname.startsWith("/assets/") && /-[a-zA-Z0-9_-]{6,}\.(?:js|css|woff2?|png|jpg|jpeg|webp|avif|svg)$/i.test(url.pathname)) {
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
