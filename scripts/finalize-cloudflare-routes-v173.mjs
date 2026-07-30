export const PRODUCTION_ROUTE_FINALIZER_RELEASE = "2026.07.30-production-route-finalizer-v173";

const API_BASE = "https://api.cloudflare.com/client/v4";
const ACCOUNT_ID = String(process.env.RESOLVED_CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const ZONE_ID = String(process.env.RESOLVED_CLOUDFLARE_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID || "").trim();
const API_TOKEN = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
const SERVICE = String(process.env.CLOUDFLARE_WORKER_SERVICE || "ngeblogging").trim();
const ZONE_NAME = String(process.env.CLOUDFLARE_ZONE_NAME || "ngeblogging.com").trim();
const EXACT_HOSTNAMES = Object.freeze(["ngeblogging.com", "www.ngeblogging.com"]);
const LEGACY_EXACT_ROUTE_PATTERNS = new Set([
  "ngeblogging.com/*",
  "www.ngeblogging.com/*",
]);
const TENANT_WILDCARD_PATTERN = "*.ngeblogging.com/*";

function assertCloudflareId(name, value) {
  if (!/^[a-f0-9]{32}$/i.test(value)) throw new Error(`${name} wajib berupa ID Cloudflare 32 karakter.`);
}

assertCloudflareId("CLOUDFLARE_ACCOUNT_ID", ACCOUNT_ID);
assertCloudflareId("CLOUDFLARE_ZONE_ID", ZONE_ID);
if (!API_TOKEN) throw new Error("CLOUDFLARE_API_TOKEN wajib tersedia untuk finalisasi route produksi.");
if (SERVICE !== "ngeblogging") throw new Error("Finalizer hanya boleh dijalankan untuk service ngeblogging.");
if (ZONE_NAME !== "ngeblogging.com") throw new Error("Finalizer hanya boleh dijalankan pada zone ngeblogging.com.");

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
    throw new Error("Zone ngeblogging.com tidak dimiliki CLOUDFLARE_ACCOUNT_ID yang digunakan deployment.");
  }
  return zone;
}

async function attachExactWorkerDomains() {
  const attached = [];
  for (const hostname of EXACT_HOSTNAMES) {
    const domain = await request(`/accounts/${encodeURIComponent(ACCOUNT_ID)}/workers/domains`, {
      method: "PUT",
      body: JSON.stringify({ hostname, service: SERVICE, zone_name: ZONE_NAME }),
    });
    attached.push({ hostname, service: domain?.service || SERVICE, zone_name: domain?.zone_name || ZONE_NAME });
  }
  return attached;
}

async function listRoutes() {
  const routes = await request(`/zones/${encodeURIComponent(ZONE_ID)}/workers/routes`);
  return Array.isArray(routes) ? routes : [];
}

async function deleteLegacyExactRoutes(routes) {
  const deleted = [];
  for (const route of routes) {
    const pattern = String(route?.pattern || "").trim().toLowerCase();
    if (!LEGACY_EXACT_ROUTE_PATTERNS.has(pattern)) continue;
    if (!route?.id) throw new Error(`Route lama ${pattern} tidak memiliki ID.`);
    await request(`/zones/${encodeURIComponent(ZONE_ID)}/workers/routes/${encodeURIComponent(route.id)}`, {
      method: "DELETE",
    });
    deleted.push({ id: route.id, pattern, script: route?.script || null });
  }
  return deleted;
}

async function verifyFinalState() {
  const domainsResult = await request(`/accounts/${encodeURIComponent(ACCOUNT_ID)}/workers/domains`);
  const domains = Array.isArray(domainsResult) ? domainsResult : [];
  for (const hostname of EXACT_HOSTNAMES) {
    const domain = domains.find((item) => String(item?.hostname || "").toLowerCase() === hostname);
    if (!domain) throw new Error(`Worker Domain ${hostname} tidak ditemukan setelah finalisasi.`);
    if (String(domain?.service || "") !== SERVICE) {
      throw new Error(`Worker Domain ${hostname} masih menunjuk ke service ${domain?.service || "unknown"}.`);
    }
  }

  const routes = await listRoutes();
  const legacy = routes.filter((route) => LEGACY_EXACT_ROUTE_PATTERNS.has(String(route?.pattern || "").toLowerCase()));
  if (legacy.length) throw new Error(`Route apex/www lama masih tersisa: ${legacy.map((route) => route.pattern).join(", ")}`);

  const wildcard = routes.find((route) => String(route?.pattern || "").toLowerCase() === TENANT_WILDCARD_PATTERN);
  if (!wildcard) throw new Error("Wildcard tenant *.ngeblogging.com/* hilang setelah finalisasi.");
  if (String(wildcard?.script || "") && String(wildcard.script) !== SERVICE) {
    throw new Error(`Wildcard tenant menunjuk ke service tidak sesuai: ${wildcard.script}`);
  }

  return {
    exactWorkerDomains: EXACT_HOSTNAMES,
    workerService: SERVICE,
    legacyExactRoutesRemaining: 0,
    tenantWildcard: TENANT_WILDCARD_PATTERN,
    tenantWildcardService: wildcard?.script || SERVICE,
  };
}

await verifyZone();
const attached = await attachExactWorkerDomains();
const beforeRoutes = await listRoutes();
const deleted = await deleteLegacyExactRoutes(beforeRoutes);
const verified = await verifyFinalState();

console.log(JSON.stringify({
  status: "ok",
  release: PRODUCTION_ROUTE_FINALIZER_RELEASE,
  accountId: "[redacted]",
  zoneId: "[redacted]",
  zoneName: ZONE_NAME,
  attached,
  deletedLegacyRoutes: deleted.map(({ pattern, script }) => ({ pattern, script })),
  verified,
}, null, 2));
