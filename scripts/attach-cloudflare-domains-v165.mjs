const RELEASE = "2026.07.30-production-domain-attach-v165";
const ACCOUNT_ID = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const API_TOKEN = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
const SERVICE = String(process.env.CLOUDFLARE_WORKER_SERVICE || "ngeblogging").trim();
const ZONE_NAME = String(process.env.CLOUDFLARE_ZONE_NAME || "ngeblogging.com").trim();
const HOSTNAMES = Object.freeze(["ngeblogging.com", "www.ngeblogging.com"]);
const API_ROOT = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/domains`;

function fail(message) {
  throw new Error(`[${RELEASE}] ${message}`);
}

function errorText(payload) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  const messages = errors
    .map((item) => [item?.code, item?.message].filter(Boolean).join(": "))
    .filter(Boolean);
  return messages.length ? messages.join("; ") : "Cloudflare tidak mengembalikan detail kesalahan.";
}

async function cloudflare(path = "", init = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${API_TOKEN}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success !== true) {
    fail(`Permintaan ${init.method || "GET"} ${path || "/"} gagal (${response.status}): ${errorText(payload)}`);
  }
  return payload;
}

async function attach(hostname) {
  const payload = await cloudflare("", {
    method: "PUT",
    body: JSON.stringify({
      hostname,
      service: SERVICE,
      zone_name: ZONE_NAME,
    }),
  });
  const domain = payload.result || {};
  if (domain.hostname !== hostname) fail(`Hostname respons tidak cocok untuk ${hostname}.`);
  if (domain.service !== SERVICE) fail(`${hostname} masih menunjuk service ${domain.service || "tidak diketahui"}.`);
  return {
    hostname: domain.hostname,
    service: domain.service,
    zoneName: domain.zone_name || ZONE_NAME,
    environment: domain.environment || "production",
  };
}

async function verify() {
  const payload = await cloudflare("", { method: "GET" });
  const domains = Array.isArray(payload.result) ? payload.result : [];
  const result = HOSTNAMES.map((hostname) => {
    const domain = domains.find((item) => item?.hostname === hostname);
    if (!domain) fail(`${hostname} tidak ditemukan pada daftar Worker Domains.`);
    if (domain.service !== SERVICE) fail(`${hostname} terikat ke ${domain.service || "service tidak diketahui"}, bukan ${SERVICE}.`);
    return { hostname, service: domain.service, environment: domain.environment || "production" };
  });
  return result;
}

if (!ACCOUNT_ID) fail("CLOUDFLARE_ACCOUNT_ID belum tersedia.");
if (!API_TOKEN) fail("CLOUDFLARE_API_TOKEN belum tersedia.");
if (!SERVICE) fail("CLOUDFLARE_WORKER_SERVICE tidak valid.");
if (ZONE_NAME !== "ngeblogging.com") fail("CLOUDFLARE_ZONE_NAME harus ngeblogging.com untuk deployment produksi ini.");

const attached = [];
for (const hostname of HOSTNAMES) attached.push(await attach(hostname));
const verified = await verify();

console.log(JSON.stringify({
  status: "ok",
  release: RELEASE,
  service: SERVICE,
  zoneName: ZONE_NAME,
  attached,
  verified,
  tenantWildcardUntouched: "*.ngeblogging.com/*",
}, null, 2));
