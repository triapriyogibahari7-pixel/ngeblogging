import { appendFile, readFile, writeFile } from "node:fs/promises";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const inputPath = process.argv[2] || "wrangler.production.jsonc";
const outputPath = process.argv[3] || "wrangler.production.active-zone.jsonc";
const zoneId = String(
  process.env.RESOLVED_CLOUDFLARE_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID || "",
).trim();
const apiToken = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
const workerService = String(
  process.env.CLOUDFLARE_WORKER_SERVICE || "ngeblogging",
).trim();
let accountId = String(
  process.env.RESOLVED_CLOUDFLARE_ACCOUNT_ID
  || process.env.CLOUDFLARE_ACCOUNT_ID
  || "",
).trim();

const validCloudflareId = (value) => /^[a-f0-9]{32}$/i.test(String(value || ""));

async function cloudflareRequest(path) {
  if (!apiToken) return null;

  const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    headers: {
      authorization: `Bearer ${apiToken}`,
      accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success !== true) return null;
  return payload.result;
}

async function accountsVisibleToToken() {
  const result = await cloudflareRequest("/accounts?per_page=50");
  if (!Array.isArray(result)) return [];
  return result
    .map((account) => ({ id: String(account?.id || "").trim(), name: String(account?.name || "").trim() }))
    .filter((account) => validCloudflareId(account.id));
}

async function accountContainsWorker(candidateId) {
  const scripts = await cloudflareRequest(`/accounts/${encodeURIComponent(candidateId)}/workers/scripts`);
  if (!Array.isArray(scripts)) return false;
  return scripts.some((script) => String(script?.id || script?.name || "").trim() === workerService);
}

async function resolveAuthenticatedAccount(configuredId) {
  if (!apiToken) return configuredId;
  const accounts = await accountsVisibleToToken();
  if (!accounts.length) return configuredId;
  if (accounts.length === 1) return accounts[0].id;
  if (accounts.some((account) => account.id === configuredId)) return configuredId;

  const workerOwners = [];
  for (const account of accounts) {
    if (await accountContainsWorker(account.id)) workerOwners.push(account.id);
  }
  if (workerOwners.length === 1) return workerOwners[0];
  throw new Error("Token Cloudflare memiliki beberapa account dan account Worker ngeblogging tidak dapat ditentukan secara tunggal.");
}

if (!validCloudflareId(accountId)) {
  if (!validCloudflareId(zoneId) || !apiToken) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID wajib berupa Account ID Cloudflare 32 karakter.");
  }
  const zone = await cloudflareRequest(`/zones/${encodeURIComponent(zoneId)}`);
  accountId = String(zone?.account?.id || "").trim();
  if (!zone) throw new Error("Cloudflare Zone API gagal saat mengunci account deployment.");
  if (zone.id !== zoneId || zone.name !== "ngeblogging.com" || zone.status !== "active") {
    throw new Error("Zone yang ditemukan bukan zone aktif ngeblogging.com.");
  }
  if (!validCloudflareId(accountId)) throw new Error("Account ID pemilik zone aktif ngeblogging.com tidak valid.");
}

const configuredAccountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const authenticatedAccountId = await resolveAuthenticatedAccount(accountId);
if (!validCloudflareId(authenticatedAccountId)) throw new Error("Account ID Cloudflare yang dikenali token tidak valid.");
if (authenticatedAccountId !== accountId) {
  console.warn("Account ID tersimpan tidak cocok dengan account yang dikenali token; deployment memakai account terautentikasi yang benar.");
  accountId = authenticatedAccountId;
}
if (configuredAccountId && configuredAccountId !== accountId) {
  console.warn("CLOUDFLARE_ACCOUNT_ID GitHub Environment berbeda dari account deployment yang benar.");
}

const source = await readFile(inputPath, "utf8");
const config = JSON.parse(source);
const requiredPatterns = [
  "ngeblogging.com/*",
  "www.ngeblogging.com/*",
  "*.ngeblogging.com/*",
];

config.account_id = accountId;
if (validCloudflareId(zoneId)) {
  config.routes = requiredPatterns.map((pattern) => ({ pattern, zone_id: zoneId }));
  console.log("Route produksi resmi dikunci memakai Zone ID aktif; route SaaS catch-all dikelola terpisah melalui API.");
} else {
  delete config.routes;
  console.warn("Zone ID tidak tersedia; upload Worker tidak menulis ulang route yang sudah aktif.");
}

await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
if (process.env.GITHUB_ENV) {
  await appendFile(process.env.GITHUB_ENV, `CLOUDFLARE_ACCOUNT_ID=${accountId}\nRESOLVED_CLOUDFLARE_ACCOUNT_ID=${accountId}\n`, "utf8");
}
console.log(
  validCloudflareId(zoneId)
    ? `Konfigurasi produksi aktif dibuat untuk ${requiredPatterns.length} route resmi pada account terautentikasi.`
    : "Konfigurasi produksi aktif dibuat untuk memperbarui Worker pada account terautentikasi tanpa mengubah route resmi.",
);
