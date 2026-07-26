import { readFile, writeFile } from "node:fs/promises";

const inputPath = process.argv[2] || "wrangler.production.jsonc";
const outputPath = process.argv[3] || "wrangler.production.active-zone.jsonc";
const zoneId = String(
  process.env.RESOLVED_CLOUDFLARE_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID || "",
).trim();

if (!/^[a-f0-9]{32}$/i.test(zoneId)) {
  throw new Error("RESOLVED_CLOUDFLARE_ZONE_ID wajib berupa Zone ID Cloudflare 32 karakter.");
}

const source = await readFile(inputPath, "utf8");
const config = JSON.parse(source);
const requiredPatterns = [
  "ngeblogging.com/*",
  "www.ngeblogging.com/*",
  "*.ngeblogging.com/*",
];

config.routes = requiredPatterns.map((pattern) => ({ pattern, zone_id: zoneId }));

await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log(`Konfigurasi produksi aktif dibuat untuk ${requiredPatterns.length} route resmi.`);
