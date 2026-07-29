const VERSION = "ngeblogging-app-v144-studio-layout-20260729";
const CACHE_RELEASE = "single-react-layout-authority-v144";
const AUTH_HANDOFF_RELEASE = "auth-route-handoff-v143-20260729";
const SHELL_CACHE = `${VERSION}-${CACHE_RELEASE}-${AUTH_HANDOFF_RELEASE}-shell`;
const ASSET_CACHE = `${VERSION}-${CACHE_RELEASE}-${AUTH_HANDOFF_RELEASE}-assets`;
const APP_SHELL = ["/", "/site.webmanifest", "/favicon.svg"];

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
    || url.pathname.startsWith("/auth/")
    || url.searchParams.has("code")
    || authMode === "callback"
    || authMode === "recovery"
    || authMode === "session-expired"
    || authMode === "callback-error";
}

async function notifyOpenWindows() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(windows.map(async (client) => {
    try {
      const url = new URL(client.url);
      if (url.origin !== self.location.origin || isAuthSurface(url)) return;
      client.postMessage({
        type: "NGE_BLOGGING_FORCE_RELOAD_V77",
        version: VERSION,
        release: CACHE_RELEASE,
        authHandoffRelease: AUTH_HANDOFF_RELEASE,
        reason: "service-worker-activated-studio-layout-v144",
      });
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
    event.source?.postMessage?.({
      type: "NGE_BLOGGING_PWA_VERSION",
      version: VERSION,
      release: CACHE_RELEASE,
      authHandoffRelease: AUTH_HANDOFF_RELEASE,
    });
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
