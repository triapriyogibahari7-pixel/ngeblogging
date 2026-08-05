import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const worker = read("cloudflare/worker-v70.mjs");
const wrangler = read("wrangler.production.jsonc");
const publicData = read("src/lib/public-data.js");
const publicSite = read("src/PublicSiteNext.jsx");
const seo = read("server/seo-handler.mjs");
const canonical = read("server/canonical-domain-redirect.mjs");

test("v282 is the production Worker authority and keeps v281 Studio UI authority", () => {
  assert.match(worker, /public-edge-request-dedup-v282-20260805/);
  assert.match(wrangler, /"main": "\.\/cloudflare\/worker-v70\.mjs"/);
  assert.match(wrangler, /"PUBLIC_EDGE_RELEASE": "public-edge-request-dedup-v282-20260805"/);
  assert.match(wrangler, /"CURRENT_STUDIO_UI_RELEASE": "studio-native-controls-v281-20260805"/);
});

test("static assets bypass historical tenant DB-resolution chain", () => {
  assert.match(worker, /url\.pathname\.startsWith\("\/assets\/"\)/);
  assert.match(worker, /STATIC_EXTENSION\.test\(url\.pathname\)/);
  assert.match(worker, /DIRECT_STATIC_PATHS\.has\(url\.pathname\)/);
  assert.match(worker, /RELEASE_MANIFEST\.test\(url\.pathname\)/);
  assert.match(worker, /const staticResponse = await serveStaticAsset\(request, env\)/);
  assert.ok(worker.indexOf("serveStaticAsset(request, env)") < worker.indexOf("baseWorker.fetch(request, env, context)"));
  assert.match(worker, /x-ngeblogging-static-fast-path/);
});

test("dynamic SEO routes are never bypassed by the static fast path", () => {
  for (const path of ["/robots.txt","/sitemap.xml","/sitemap-posts.xml","/feed.xml","/rss.xml","/atom.xml","/llms.txt","/manifest.webmanifest"]) {
    assert.ok(worker.includes(`"${path}"`), `missing dynamic SEO path ${path}`);
  }
  assert.match(worker, /SEO_DYNAMIC_PATHS\.has\(url\.pathname\)/);
  assert.match(seo, /resolveSeoSite/);
});

test("unknown static paths cannot receive the SPA HTML shell", () => {
  assert.match(worker, /contentType\.includes\("text\/html"\)/);
  assert.match(worker, /x-ngeblogging-static-fallback-blocked/);
  assert.match(worker, /status: 404/);
});

test("service worker and release manifest are network-fresh while hashed assets are immutable", () => {
  assert.match(worker, /url\.pathname === "\/sw\.js"[\s\S]*no-cache, no-store, must-revalidate/);
  assert.match(worker, /RELEASE_MANIFEST\.test\(url\.pathname\)[\s\S]*no-store, max-age=0, must-revalidate/);
  assert.match(worker, /max-age=31536000, immutable/);
});

test("public-site React bootstrap remains atomic and production data stays real", () => {
  assert.match(publicSite, /PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218/);
  assert.match(publicSite, /setSite\(resolved\)/);
  assert.match(publicData, /\.eq\("status","published"\)/);
  assert.match(publicData, /\.eq\("visibility","public"\)/);
  assert.match(canonical, /status:\s*308/);
});
