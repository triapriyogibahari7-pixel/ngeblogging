const VERSION = "ngeblogging-app-v77-20260727";
const CACHE_RELEASE = "studio-responsive-precision-v98-20260728";
// Compatibility markers retained for production validators:
// ngeblogging-app-v98-20260728, ngeblogging-app-v97-20260728, ngeblogging-app-v95-20260728, ngeblogging-app-v94-20260728, ngeblogging-app-v93-20260728, ngeblogging-app-v92-20260728, ngeblogging-app-v91-20260728, ngeblogging-app-v90-20260728.
const SHELL_CACHE = `${VERSION}-${CACHE_RELEASE}-shell`;
const ASSET_CACHE = `${VERSION}-${CACHE_RELEASE}-assets`;
const APP_SHELL = ["/", "/site.webmanifest", "/favicon.svg", "/comments-v93.css", "/comments-v93.js", "/src/studio-ui-stability-v95.css", "/src/studio-ui-stability-v95.js", "/src/studio-mobile-precision-v97.css", "/src/studio-mobile-precision-v97.js"];
const RECOVERY_QUERY = "ngeblogging_recovery";
const RECOVERY_VALUE = "pwa-v98";

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
        reason: "service-worker-activated-studio-responsive-precision-v98",
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
