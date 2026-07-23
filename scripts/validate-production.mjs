import { readFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";

const requiredFiles = [
  "api/server.mjs",
  "Caddyfile",
  "compose.production.yml",
  "Dockerfile.api",
  "Dockerfile.web",
  "cloudflare/worker.mjs",
  "server/nara-handler.mjs",
  "server/nara-runtime.mjs",
  "server/nara-image-handler.mjs",
  "server/billing-handler.mjs",
  "server/paypal-webhook-handler.mjs",
  "server/seo-handler.mjs",
  "wrangler.jsonc",
  "public/_headers",
  "src/StudioNext.jsx",
  "src/StudioSecure.jsx",
  "src/BackupCenter.jsx",
  "src/ContentEditor.jsx",
  "src/MediaLibrary.jsx",
  "src/NaraWorkspace.jsx",
  "src/BillingView.jsx",
  "src/ThemeStudio.jsx",
  "src/theme-catalog.js",
  "src/theme-system.js",
  "src/widget-system.js",
  "src/PublicSiteNext.jsx",
  "src/lib/backup-data.js",
  "src/lib/content-data.js",
  "src/lib/media-data.js",
  "src/lib/nara-data.js",
  "src/lib/public-data.js",
  "src/lib/theme-data.js",
  "supabase/migrations/20260723150000_expand_studio_theme_media_nara_billing.sql",
  "supabase/migrations/20260723170000_backup_and_professional_billing.sql",
  "supabase/migrations/20260723171000_allow_supporter_plan.sql",
  ".github/workflows/ci.yml",
  ".github/workflows/cloudflare.yml",
  ".github/workflows/production.yml",
  "scripts/bootstrap-ubuntu.sh",
  "scripts/deploy.sh",
  "scripts/deploy-via-ssh.sh",
  "scripts/server-doctor.sh",
  "scripts/verify-production.sh",
  "docs/PRODUCTION_SERVER.md",
  "docs/PRODUCTION_RUNBOOK.md",
  "docs/CLOUDFLARE_PRODUCTION.md",
];

for (const file of requiredFiles) await access(new URL(`../${file}`, import.meta.url));
if (existsSync(new URL("../netlify.toml", import.meta.url)) || existsSync(new URL("../netlify/", import.meta.url))) {
  throw new Error("Konfigurasi atau runtime deployment lama tidak boleh kembali setelah migrasi Cloudflare Workers.");
}

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
for (const [name, version] of Object.entries({ ...packageJson.dependencies, ...packageJson.devDependencies })) {
  if (/^(latest|next)$|^[~^*]/.test(version)) throw new Error(`Dependency ${name} belum dipin: ${version}`);
}
if (!packageJson.scripts["deploy:cloudflare"]?.includes("--env production")) throw new Error("Deployment Cloudflare wajib memakai environment production.");
if (!packageJson.scripts["cloudflare:preview-dry-run"]?.includes("wrangler versions upload")) throw new Error("Preview Cloudflare wajib divalidasi dengan versions upload.");

const compose = await readFile(new URL("../compose.production.yml", import.meta.url), "utf8");
const apiService = compose.slice(compose.indexOf("  api:"), compose.indexOf("  web:"));
if (/^\s{4}ports:/m.test(apiService)) throw new Error("Container API tidak boleh membuka port publik.");
if (!compose.includes("no-new-privileges:true")) throw new Error("Hardening container belum aktif.");

const apiDockerfile = await readFile(new URL("../Dockerfile.api", import.meta.url), "utf8");
if (!/^USER node$/m.test(apiDockerfile)) throw new Error("API harus berjalan sebagai user non-root.");

const productionWorkflow = await readFile(new URL("../.github/workflows/production.yml", import.meta.url), "utf8");
for (const platform of ["linux/amd64", "linux/arm64"]) if (!productionWorkflow.includes(platform)) throw new Error(`Image pemulihan belum mendukung ${platform}.`);
for (const target of ["deploy-primary", "deploy-standby"]) if (!productionWorkflow.includes(`${target}:`)) throw new Error(`Target pemulihan ${target} belum tersedia.`);

const productionEnv = await readFile(new URL("../.env.production.example", import.meta.url), "utf8");
if (/^(QWEN_API_KEY|SUPABASE_PUBLISHABLE_KEY|PAYPAL_CLIENT_SECRET|SUPABASE_SERVICE_ROLE_KEY|LOCAL_PAYMENT_GATEWAY_SECRET)=\s*(?!REPLACE_ME|sb_publishable_REPLACE_ME)/m.test(productionEnv)) throw new Error("Contoh environment memuat credential nyata.");
for (const key of ["SUPABASE_SERVICE_ROLE_KEY", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID", "LOCAL_PAYMENT_GATEWAY_SECRET"]) {
  if (!new RegExp(`^${key}=REPLACE_ME$`, "m").test(productionEnv)) throw new Error(`Credential pembayaran ${key} belum didokumentasikan secara aman.`);
}
if (!/^LOCAL_PLAN_PRICES_JSON=\{.+\}$/m.test(productionEnv)) throw new Error("Harga gateway lokal belum didokumentasikan sebagai JSON server-only.");

const wrangler = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const cloudflareProduction = wrangler.env?.production || {};
const routes = new Set((cloudflareProduction.routes || []).map((route) => typeof route === "string" ? route : route.pattern));
for (const route of ["ngeblogging.com/*", "*.ngeblogging.com/*"]) if (!routes.has(route)) throw new Error(`Route Cloudflare wajib belum tersedia: ${route}`);
if (wrangler.routes || wrangler.secrets) throw new Error("Preview Cloudflare tidak boleh mengklaim route atau secret produksi.");
if (!wrangler.compatibility_flags?.includes("nodejs_compat")) throw new Error("nodejs_compat belum aktif.");
if (wrangler.assets?.not_found_handling !== "single-page-application") throw new Error("SPA fallback Cloudflare belum aktif.");
if (wrangler.assets?.run_worker_first !== true) throw new Error("Worker harus berjalan sebelum aset agar SEO tenant dan endpoint discovery aktif.");
if (wrangler.vars?.NARA_RUNTIME !== "cloudflare-worker-preview-v3") throw new Error("Runtime preview Cloudflare belum terisolasi pada versi terbaru.");
if (cloudflareProduction.vars?.NARA_RUNTIME !== "cloudflare-worker-v3") throw new Error("Runtime produksi Cloudflare belum memakai versi terbaru.");
if (cloudflareProduction.vars?.PAYPAL_ENV !== "sandbox") throw new Error("PayPal harus tetap sandbox sampai credential live dan webhook diverifikasi.");
if (cloudflareProduction.vars?.PAYPAL_MERCHANT_EMAIL !== "triapriyogibahari9@gmail.com") throw new Error("Email merchant PayPal belum sesuai permintaan pemilik.");
for (const secret of ["QWEN_API_KEY", "QWEN_WORKSPACE_ID", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]) {
  if (!cloudflareProduction.secrets?.required?.includes(secret)) throw new Error(`Secret wajib belum dideklarasikan: ${secret}`);
  if (Object.hasOwn(cloudflareProduction.vars || {}, secret)) throw new Error(`Secret ${secret} tidak boleh disimpan sebagai plaintext vars.`);
}
for (const secret of ["SUPABASE_SERVICE_ROLE_KEY", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID", "LOCAL_PAYMENT_GATEWAY_SECRET"]) {
  if (Object.hasOwn(cloudflareProduction.vars || {}, secret)) throw new Error(`Secret pembayaran ${secret} tidak boleh disimpan sebagai plaintext vars.`);
}

const worker = await readFile(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const portableApi = await readFile(new URL("../api/server.mjs", import.meta.url), "utf8");
if (!worker.includes("../server/nara-runtime.mjs")) throw new Error("Worker belum memakai runtime Nara portable.");
if (!portableApi.includes("../server/nara-runtime.mjs")) throw new Error("API pemulihan belum memakai runtime Nara portable.");
if (!worker.includes(".ngeblogging.com")) throw new Error("Worker belum menerima origin tenant wildcard.");
for (const marker of ["handleNaraImage", "handleBillingRequest", "handlePayPalWebhook", "seoEndpoint", "injectTenantSeo", "/api/nara/image", "/api/billing/paypal/webhook", "/api/billing/"]) if (!worker.includes(marker)) throw new Error(`Worker belum memuat kemampuan produksi: ${marker}`);
for (const source of [worker, portableApi]) if (/netlify\/functions|x-nf-client-connection-ip/.test(source)) throw new Error("Entrypoint produksi masih memiliki dependensi runtime lama.");

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
for (const bridge of ["cloudflare-media-bridge", "editor-toolbar-bridge", "workspace-profile-bridge", "workspace-activation-bridge"]) if (index.includes(bridge)) throw new Error(`Bridge DOM lama masih aktif: ${bridge}`);

const studio = await readFile(new URL("../src/Studio.jsx", import.meta.url), "utf8");
if (!studio.includes("StudioSecure.jsx")) throw new Error("Studio belum mengaktifkan pusat cadangan di Pengaturan.");
const backup = await readFile(new URL("../src/lib/backup-data.js", import.meta.url), "utf8");
for (const marker of ["SHA-256", "restoreCloudBackup", "downloadReadableArchive", "site_backup_events"]) if (!backup.includes(marker)) throw new Error(`Sistem cadangan belum memuat ${marker}.`);

const billing = await readFile(new URL("../server/billing-handler.mjs", import.meta.url), "utf8");
const webhook = await readFile(new URL("../server/paypal-webhook-handler.mjs", import.meta.url), "utf8");
for (const marker of ["idempotencyKey", "invoice_number", "validateCapturedAmount", "billing_webhook_events", "LOCAL_PLAN_PRICES_JSON"]) if (!billing.includes(marker)) throw new Error(`Billing belum memuat kontrol ${marker}.`);
for (const marker of ["verify-webhook-signature", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.REFUNDED", "AMOUNT_MISMATCH", "findOrder"]) if (!webhook.includes(marker)) throw new Error(`Webhook PayPal belum memuat kontrol ${marker}.`);

const themeCatalog = await readFile(new URL("../src/theme-catalog.js", import.meta.url), "utf8");
for (const marker of ["const FAMILIES", "const COMPOSITIONS", "familySection", "shellCss", "buildThemeCode", "THEME_COUNT"]) {
  if (!themeCatalog.includes(marker)) throw new Error(`Generator tema struktural belum memuat ${marker}.`);
}
if (!themeCatalog.includes("FAMILIES.flatMap") || !themeCatalog.includes("COMPOSITIONS.map")) throw new Error("Generator belum membentuk 20 keluarga × 5 komposisi.");
const widgets = await readFile(new URL("../src/widget-system.js", import.meta.url), "utf8");
if (!widgets.includes("BUILT_IN_WIDGETS")) throw new Error("Widget bawaan belum tersedia.");

const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
for (const value of ["Content-Security-Policy", "X-Content-Type-Options", "max-age=31536000, immutable"]) if (!headers.includes(value)) throw new Error(`Header Cloudflare belum memuat ${value}.`);

const cloudflareWorkflow = await readFile(new URL("../.github/workflows/cloudflare.yml", import.meta.url), "utf8");
if (!cloudflareWorkflow.includes("CLOUDFLARE_DEPLOY_ENABLED == 'true'")) throw new Error("Deployment Cloudflare belum memiliki activation gate.");
if (!cloudflareWorkflow.includes("/api/health")) throw new Error("Deployment Cloudflare belum memiliki smoke test health endpoint.");

console.log(`Validasi produksi lulus: ${requiredFiles.length} berkas wajib, cadangan portabel, invoice, webhook terverifikasi, 100 tema struktural, 25 widget, Posts/Pages, SEO tenant, Nara image, runtime Cloudflare v3, dan pemulihan server di-hardening.`);
