import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const PRODUCTION_ROUTE_CUTOVER_RELEASE = "production-route-cutover-v182-20260731";
const ROUTE_AUTHORITY = "cloudflare-zone-route-cutover-v182";
const FILES = ["wrangler.jsonc", "wrangler.production.jsonc"];
const ROUTES = Object.freeze([
  { pattern: "ngeblogging.com/*", zone_name: "ngeblogging.com" },
  { pattern: "www.ngeblogging.com/*", zone_name: "ngeblogging.com" },
  { pattern: "*.ngeblogging.com/*", zone_name: "ngeblogging.com" },
]);

function applyAuthority(config) {
  const next = structuredClone(config);
  next.routes = ROUTES.map((route) => ({ ...route }));
  next.vars = {
    ...(next.vars || {}),
    APP_RELEASE: PRODUCTION_ROUTE_CUTOVER_RELEASE,
    PRODUCTION_ROUTE_AUTHORITY: ROUTE_AUTHORITY,
    PRODUCTION_ROUTE_CUTOVER_RELEASE,
    PRODUCTION_CUSTOM_DOMAIN_RELEASE: "2026.07.30-production-custom-domain-v172",
  };
  if (next.env?.production) {
    next.env.production.routes = ROUTES.map((route) => ({ ...route }));
    next.env.production.vars = {
      ...(next.env.production.vars || {}),
      APP_RELEASE: PRODUCTION_ROUTE_CUTOVER_RELEASE,
      PRODUCTION_ROUTE_AUTHORITY: ROUTE_AUTHORITY,
      PRODUCTION_ROUTE_CUTOVER_RELEASE,
      PRODUCTION_CUSTOM_DOMAIN_RELEASE: "2026.07.30-production-custom-domain-v172",
    };
  }
  return next;
}

for (const filename of FILES) {
  const path = resolve(filename);
  const source = JSON.parse(await readFile(path, "utf8"));
  const next = applyAuthority(source);
  const patterns = next.routes.map((route) => route.pattern);
  if (JSON.stringify(patterns) !== JSON.stringify(ROUTES.map((route) => route.pattern))) {
    throw new Error(`V182_ROUTE_PATCH_FAILED:${filename}`);
  }
  if (next.routes.some((route) => route.custom_domain === true)) {
    throw new Error(`V182_STALE_CUSTOM_DOMAIN_REMAINS:${filename}`);
  }
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({
  status: "ok",
  release: PRODUCTION_ROUTE_CUTOVER_RELEASE,
  authority: ROUTE_AUTHORITY,
  routes: ROUTES.map((route) => route.pattern),
  purpose: "Cloudflare Git Integration deploys current Worker to apex, www, and tenant wildcard without relying on GitHub Actions startup.",
}, null, 2));
