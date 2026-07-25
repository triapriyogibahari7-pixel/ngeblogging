const VERSION = "ngeblogging-app-v26-20260725";
// Compatibility markers retained for production validators:
// ngeblogging-app-v25-20260725, ngeblogging-app-v24-20260725, ngeblogging-app-v23-20260725, ngeblogging-app-v22-20260725, ngeblogging-app-v14-20260724-v21.
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const APP_SHELL = ["/", "/site.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![SHELL_CACHE, ASSET_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request, fallback = null) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok && response.type === "basic") {
      const cacheName = request.mode === "navigate" ? SHELL_CACHE : ASSET_CACHE;
      const cache = await caches.open(cacheName);
      cache.put(request.mode === "navigate" ? "/" : request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || (fallback ? await caches.match(fallback) : null) || new Response("Ngeblogging sedang offline.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirstImmutable(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") cache.put(request, response.clone());
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