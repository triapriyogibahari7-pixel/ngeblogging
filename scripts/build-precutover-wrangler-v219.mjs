import { readFile, writeFile } from "node:fs/promises";

export const PRODUCTION_ROUTE_ACTIVATION_V219 = "production-route-activation-v219-20260802";

const inputPath = process.argv[2] || "wrangler.production.jsonc";
const outputPath = process.argv[3] || "wrangler.production.precutover-v219.jsonc";
const accountId = String(process.env.RESOLVED_CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const zoneId = String(process.env.RESOLVED_CLOUDFLARE_ZONE_ID || process.env.CLOUDFLARE_ZONE_ID || "").trim();
const workerService = String(process.env.CLOUDFLARE_WORKER_SERVICE || "ngeblogging").trim();

const validCloudflareId = (value) => /^[a-f0-9]{32}$/i.test(String(value || ""));
if (!validCloudflareId(accountId)) throw new Error("CLOUDFLARE_ACCOUNT_ID wajib berupa ID Cloudflare 32 karakter.");
if (!validCloudflareId(zoneId)) throw new Error("CLOUDFLARE_ZONE_ID wajib berupa ID Cloudflare 32 karakter.");
if (workerService !== "ngeblogging") throw new Error("Pre-cutover v219 hanya boleh membangun service ngeblogging.");

const config = JSON.parse(await readFile(inputPath, "utf8"));
config.account_id = accountId;
config.name = workerService;
config.workers_dev = true;

// Upload phase deliberately avoids the apex/www Custom Domains while WHITE-R4
// may still own them. The tenant wildcard stays attached during the transition.
config.routes = [
  { pattern: "*.ngeblogging.com/*", zone_id: zoneId },
];

config.vars = {
  ...(config.vars || {}),
  PRODUCTION_ROUTE_ACTIVATION_V219,
  PRODUCTION_ROUTE_DEPLOY_PHASE: "workers-dev-and-tenant-before-apex-cutover",
  PRODUCTION_UI_RELEASE: "2026.08.02-studio-production-v219",
  CURRENT_STUDIO_UI_RELEASE: "studio-production-v219-20260802",
};

await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  status: "ok",
  release: PRODUCTION_ROUTE_ACTIVATION_V219,
  outputPath,
  workerService,
  accountId: "[redacted]",
  zoneId: "[redacted]",
  exactApexCustomDomainsDuringDeploy: [],
  preservedPrecutoverRoute: "*.ngeblogging.com/*",
  apexCutoverAuthority: "scripts/finalize-cloudflare-route-cutover-v182.mjs",
}, null, 2));
