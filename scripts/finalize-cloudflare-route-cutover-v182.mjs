export const PRODUCTION_ROUTE_CUTOVER_RELEASE = "production-route-cutover-v184-20260731";

const API_BASE = "https://api.cloudflare.com/client/v4";
const ACCOUNT_ID = String(process.env.RESOLVED_CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const ZONE_ID = String(process.env.RESOLVED_CLOUDFLARE_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID || "").trim();
const API_TOKEN = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
const SERVICE = String(process.env.CLOUDFLARE_WORKER_SERVICE || "ngeblogging").trim();
const ZONE_NAME = String(process.env.CLOUDFLARE_ZONE_NAME || "ngeblogging.com").trim();
const EXACT_HOSTNAMES = Object.freeze(["ngeblogging.com", "www.ngeblogging.com"]);
const EXACT_ROUTES = Object.freeze(["ngeblogging.com/*", "www.ngeblogging.com/*"]);
const TENANT_ROUTE = "*.ngeblogging.com/*";

function assertCloudflareId(name, value) {
  if (!/^[a-f0-9]{32}$/i.test(value)) throw new Error(`${name} wajib berupa ID Cloudflare 32 karakter.`);
}
assertCloudflareId("CLOUDFLARE_ACCOUNT_ID", ACCOUNT_ID);
assertCloudflareId("CLOUDFLARE_ZONE_ID", ZONE_ID);
if (!API_TOKEN) throw new Error("CLOUDFLARE_API_TOKEN wajib tersedia untuk cutover route produksi.");
if (SERVICE !== "ngeblogging") throw new Error("Cutover hanya boleh dijalankan untuk Worker ngeblogging.");
if (ZONE_NAME !== "ngeblogging.com") throw new Error("Cutover hanya boleh dijalankan pada zone ngeblogging.com.");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${API_TOKEN}`,
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success !== true) {
    const errors = Array.isArray(payload?.errors)
      ? payload.errors.map((error) => `${error.code || "?"}:${error.message || "unknown"}`).join(", ")
      : `HTTP ${response.status}`;
    throw new Error(`Cloudflare API gagal ${options.method || "GET"} ${path}: ${errors}`);
  }
  return payload.result;
}

async function verifyZone() {
  const zone = await request(`/zones/${encodeURIComponent(ZONE_ID)}`);
  if (zone?.id !== ZONE_ID || zone?.name !== ZONE_NAME || zone?.status !== "active") {
    throw new Error("Zone aktif ngeblogging.com tidak cocok dengan CLOUDFLARE_ZONE_ID.");
  }
  if (String(zone?.account?.id || "") !== ACCOUNT_ID) {
    throw new Error("Zone ngeblogging.com tidak dimiliki CLOUDFLARE_ACCOUNT_ID deployment.");
  }
}

async function listDomains() {
  const result = await request(`/accounts/${encodeURIComponent(ACCOUNT_ID)}/workers/domains`);
  return Array.isArray(result) ? result : [];
}

async function listRoutes() {
  const result = await request(`/zones/${encodeURIComponent(ZONE_ID)}/workers/routes`);
  return Array.isArray(result) ? result : [];
}

async function detachExactWorkerDomains() {
  const domains = await listDomains();
  const detached = [];
  for (const hostname of EXACT_HOSTNAMES) {
    const domain = domains.find((item) => String(item?.hostname || "").toLowerCase() === hostname);
    if (!domain) continue;
    if (!domain.id) throw new Error(`Worker Domain ${hostname} tidak memiliki ID.`);
    await request(`/accounts/${encodeURIComponent(ACCOUNT_ID)}/workers/domains/${encodeURIComponent(domain.id)}`, {
      method: "DELETE",
    });
    detached.push({ hostname, previousService: domain.service || null });
  }
  return detached;
}

async function upsertRoute(pattern, existingRoutes) {
  const existing = existingRoutes.find((route) => String(route?.pattern || "").toLowerCase() === pattern.toLowerCase());
  const body = JSON.stringify({ pattern, script: SERVICE });
  if (existing?.id) {
    const updated = await request(`/zones/${encodeURIComponent(ZONE_ID)}/workers/routes/${encodeURIComponent(existing.id)}`, {
      method: "PUT",
      body,
    });
    return { action: "updated", id: updated?.id || existing.id, pattern, script: updated?.script || SERVICE };
  }
  const created = await request(`/zones/${encodeURIComponent(ZONE_ID)}/workers/routes`, {
    method: "POST",
    body,
  });
  return { action: "created", id: created?.id || null, pattern, script: created?.script || SERVICE };
}

async function installAuthoritativeRoutes() {
  const existing = await listRoutes();
  const changed = [];
  for (const pattern of [...EXACT_ROUTES, TENANT_ROUTE]) {
    changed.push(await upsertRoute(pattern, existing));
  }
  return changed;
}

async function verifyFinalState() {
  const domains = await listDomains();
  const staleDomains = domains.filter((item) => EXACT_HOSTNAMES.includes(String(item?.hostname || "").toLowerCase()));
  if (staleDomains.length) {
    throw new Error(`Worker Domain lama masih terpasang: ${staleDomains.map((item) => item.hostname).join(", ")}`);
  }

  const routes = await listRoutes();
  for (const pattern of [...EXACT_ROUTES, TENANT_ROUTE]) {
    const route = routes.find((item) => String(item?.pattern || "").toLowerCase() === pattern.toLowerCase());
    if (!route) throw new Error(`Route ${pattern} tidak ditemukan setelah cutover.`);
    if (String(route.script || "") !== SERVICE) {
      throw new Error(`Route ${pattern} masih menunjuk ke Worker ${route.script || "tanpa script"}.`);
    }
  }

  return {
    workerDomainsRemaining: 0,
    apexRoute: EXACT_ROUTES[0],
    wwwRoute: EXACT_ROUTES[1],
    tenantRoute: TENANT_ROUTE,
    workerService: SERVICE,
  };
}

await verifyZone();
const detached = await detachExactWorkerDomains();
const routes = await installAuthoritativeRoutes();
const verified = await verifyFinalState();

console.log(JSON.stringify({
  status: "ok",
  release: PRODUCTION_ROUTE_CUTOVER_RELEASE,
  accountId: "[redacted]",
  zoneId: "[redacted]",
  zoneName: ZONE_NAME,
  detached,
  routes: routes.map(({ action, pattern, script }) => ({ action, pattern, script })),
  verified,
}, null, 2));
