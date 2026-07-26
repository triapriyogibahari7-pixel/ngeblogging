import { appendFile, readFile, writeFile } from "node:fs/promises";

const inputPath = process.argv[2] || "wrangler.production.jsonc";
const outputPath = process.argv[3] || "wrangler.production.active-zone.jsonc";
const zoneId = String(
  process.env.RESOLVED_CLOUDFLARE_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID || "",
).trim();
const apiToken = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
let accountId = String(
  process.env.RESOLVED_CLOUDFLARE_ACCOUNT_ID
  || process.env.CLOUDFLARE_ACCOUNT_ID
  || "",
).trim();

if (!/^[a-f0-9]{32}$/i.test(accountId)) {
  if (!/^[a-f0-9]{32}$/i.test(zoneId) || !apiToken) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID wajib berupa Account ID Cloudflare 32 karakter.");
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, {
    headers: {
      authorization: `Bearer ${apiToken}`,
      accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  const zone = payload?.result || {};
  accountId = String(zone?.account?.id || "").trim();

  if (!response.ok || payload?.success !== true) {
    throw new Error(`Cloudflare Zone API gagal saat mengunci account deployment (${response.status}).`);
  }
  if (zone.id !== zoneId || zone.name !== "ngeblogging.com" || zone.status !== "active") {
    throw new Error("Zone yang ditemukan bukan zone aktif ngeblogging.com.");
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new Error("Account ID pemilik zone aktif ngeblogging.com tidak valid.");
  }
}

const configuredAccountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
if (configuredAccountId && configuredAccountId !== accountId) {
  console.warn("CLOUDFLARE_ACCOUNT_ID tersimpan berbeda dari pemilik zone aktif; deployment akan memakai account pemilik zone.");
}

const source = await readFile(inputPath, "utf8");
const config = JSON.parse(source);
const requiredPatterns = [
  "ngeblogging.com/*",
  "www.ngeblogging.com/*",
  "*.ngeblogging.com/*",
];

config.account_id = accountId;

if (/^[a-f0-9]{32}$/i.test(zoneId)) {
  config.routes = requiredPatterns.map((pattern) => ({ pattern, zone_id: zoneId }));
  console.log("Route produksi dikunci memakai Zone ID aktif.");
} else {
  const sourceRoutes = new Map(
    (config.routes || []).map((route) => [
      typeof route === "string" ? route : route.pattern,
      route,
    ]),
  );

  config.routes = requiredPatterns.map((pattern) => {
    const route = sourceRoutes.get(pattern);
    if (route && typeof route === "object" && route.zone_name === "ngeblogging.com") {
      return route;
    }
    return { pattern, zone_name: "ngeblogging.com" };
  });

  console.warn("Zone ID tidak tersedia bagi GitHub Actions; route tetap dikunci dengan zone_name ngeblogging.com dan Account ID resmi.");
}

await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

if (process.env.GITHUB_ENV) {
  await appendFile(
    process.env.GITHUB_ENV,
    `CLOUDFLARE_ACCOUNT_ID=${accountId}\nRESOLVED_CLOUDFLARE_ACCOUNT_ID=${accountId}\n`,
    "utf8",
  );
}

console.log(`Konfigurasi produksi aktif dibuat untuk ${requiredPatterns.length} route resmi pada account pemilik zone.`);
