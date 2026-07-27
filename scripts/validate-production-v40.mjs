import { readFile } from "node:fs/promises";

const validatorUrl = new URL("./validate-production.mjs", import.meta.url);
let source = await readFile(validatorUrl, "utf8");

const replacements = [
  [
    'for (const [label, config] of [["default", wrangler], ["production", cloudflareProduction]]) {',
    'for (const [label, config] of [["default", wrangler], ["production", cloudflareProduction], ["production upload", productionWrangler]]) {',
  ],
  [
    'if (productionWrangler.routes || productionWrangler.env) throw new Error("Konfigurasi upload produksi tidak boleh menulis ulang route atau environment yang sudah aktif.");',
    'if (productionWrangler.env) throw new Error("Konfigurasi upload produksi tidak boleh mendefinisikan environment bertingkat.");',
  ],
  [
    'if (wrangler.vars?.APP_RELEASE !== "2026.07.24-studio-v14" || cloudflareProduction.vars?.APP_RELEASE !== "2026.07.24-studio-v14" || productionWrangler.vars?.APP_RELEASE !== "2026.07.24-studio-v14") throw new Error("Release Worker belum v14.");',
    'if (wrangler.vars?.APP_RELEASE !== "2026.07.24-studio-v14" || cloudflareProduction.vars?.APP_RELEASE !== "2026.07.24-studio-v14") throw new Error("Release Worker kanonis belum v14.");\nif (productionWrangler.vars?.APP_RELEASE !== "2026.07.27-free-subdomains-full-zone-v71") throw new Error("Release upload produksi belum Full Zone gratis v71.");',
  ],
  [
    'for (const marker of ["handleNaraImage", "imageGenerationReady", "workersVisionReady", "handleBillingRequest", "handlePayPalWebhook", "seoEndpoint", "injectTenantSeo", "handleWorkersAiNara", "/api/nara/image", "/api/billing/paypal/webhook", "/api/billing/", "2026.07.24-studio-v14"]) {',
    'for (const marker of ["handleNaraImage", "imageGenerationReady", "workersVisionReady", "handleBillingRequest", "handlePayPalWebhook", "seoEndpoint", "injectTenantSeo", "handleWorkersAiNara", "handleDomainRequest", "handleDomainRedirectRequest", "/api/nara/image", "/api/domains/", "/api/domain-redirects/", "/api/billing/paypal/webhook", "/api/billing/", "2026.07.27-domain-api-v60"]) {',
  ],
  [
    'for (const marker of ["npm run deploy:cloudflare", "studio-v14-authority.css", "nara-command-center-bridge.js", "ngeblogging-app-v14-20260724", "2026.07.24-studio-v14", "health.naraProviders?.vision", "health.imageGeneration", "TENANT_SMOKE_TEST_URL", "tenant-404"]) {',
    'for (const marker of ["npx wrangler deploy --config wrangler.production.active-zone.jsonc --keep-vars", "Resolve authoritative Cloudflare zone and account", "RESOLVED_CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_DOMAIN_API_TOKEN", "studio-v14-authority.css", "nara-command-center-bridge.js", "ngeblogging-app-v14-20260724", "TENANT_SMOKE_TEST_URL", "tenant-404", "health.customDomainProvider", "cloudflare-full-zone", "domain-full-zone-v54.js", "ngeblogging.triapriyogibahari7.workers.dev", "2026.07.27-domain-api-v60"]) {',
  ],
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) throw new Error(`Kontrak validator berubah; patch v40 tidak menemukan: ${before.slice(0, 90)}`);
  source = source.replace(before, after);
}

const importMarker = 'import { existsSync } from "node:fs";';
if (!source.includes(importMarker)) throw new Error("Validator produksi kehilangan import marker.");
source = source.replace(importMarker, `${importMarker}\nconst VALIDATOR_URL = ${JSON.stringify(validatorUrl.href)};`);
source = source.replaceAll("import.meta.url", "VALIDATOR_URL");

await import(`data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`);
