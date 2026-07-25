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
  "server/workers-ai-nara.mjs",
  "server/nara-image-handler.mjs",
  "server/billing-handler.mjs",
  "server/paypal-webhook-handler.mjs",
  "server/seo-handler.mjs",
  "wrangler.jsonc",
  "wrangler.production.jsonc",
  "wrangler.temporary.jsonc",
  "public/_headers",
  "public/sw.js",
  "public/site.webmanifest",
  "src/pwa-runtime.js",
  "src/StudioNext.jsx",
  "src/StudioSecure.jsx",
  "src/studio-v14-authority.css",
  "src/nara-command-center-bridge.js",
  "src/nara-command-center.css",
  "src/NaraAssistant.jsx",
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
for (const scriptName of ["deploy:cloudflare", "cloudflare:dry-run"]) {
  const script = String(packageJson.scripts[scriptName] || "");
  if (!script.includes("--config wrangler.production.jsonc")) throw new Error(`${scriptName} wajib memakai konfigurasi produksi yang menjaga route aktif.`);
  if (script.includes("--env production")) throw new Error(`${scriptName} tidak boleh mendeklarasikan ulang route produksi yang sudah aktif.`);
}
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
const productionWrangler = JSON.parse(await readFile(new URL("../wrangler.production.jsonc", import.meta.url), "utf8"));
const temporaryWrangler = JSON.parse(await readFile(new URL("../wrangler.temporary.jsonc", import.meta.url), "utf8"));
const cloudflareProduction = wrangler.env?.production || {};
const routeSet = (config) => new Set((config.routes || []).map((route) => typeof route === "string" ? route : route.pattern));
for (const [label, config] of [["default", wrangler], ["production", cloudflareProduction]]) {
  const routes = routeSet(config);
  for (const route of ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"]) {
    if (!routes.has(route)) throw new Error(`Route Cloudflare ${label} belum tersedia: ${route}`);
  }
}
if (productionWrangler.routes || productionWrangler.env) throw new Error("Konfigurasi upload produksi tidak boleh menulis ulang route atau environment yang sudah aktif.");
if (productionWrangler.keep_vars !== true) throw new Error("Konfigurasi upload produksi wajib mempertahankan secret dan variable server yang sudah aktif.");
if (temporaryWrangler.routes || temporaryWrangler.secrets) throw new Error("Temporary Cloudflare audit tidak boleh mengklaim route atau secret produksi.");
if (!wrangler.compatibility_flags?.includes("nodejs_compat")) throw new Error("nodejs_compat belum aktif.");
if (wrangler.assets?.not_found_handling !== "single-page-application") throw new Error("SPA fallback Cloudflare belum aktif.");
if (wrangler.assets?.run_worker_first !== true) throw new Error("Worker harus berjalan sebelum aset agar SEO tenant dan endpoint discovery aktif.");
if (wrangler.ai?.binding !== "AI" || cloudflareProduction.ai?.binding !== "AI" || productionWrangler.ai?.binding !== "AI") throw new Error("Workers AI binding belum aktif pada default dan produksi.");
for (const [key, expected] of Object.entries({
  CF_AI_MODEL: "@cf/zai-org/glm-4.7-flash",
  CF_AI_VISION_MODEL: "@cf/google/gemma-4-26b-a4b-it",
  CF_AI_IMAGE_MODEL: "@cf/bytedance/stable-diffusion-xl-lightning",
})) {
  if (wrangler.vars?.[key] !== expected || cloudflareProduction.vars?.[key] !== expected || productionWrangler.vars?.[key] !== expected) throw new Error(`${key} belum dipin pada default dan produksi.`);
}
if (!/^cloudflare-worker-default-v\d+$/.test(String(wrangler.vars?.NARA_RUNTIME || ""))) throw new Error("Runtime default Cloudflare belum berversi.");
if (!/^cloudflare-worker-production-v\d+$/.test(String(cloudflareProduction.vars?.NARA_RUNTIME || ""))) throw new Error("Runtime produksi Cloudflare belum berversi.");
if (!/^cloudflare-worker-production-v\d+$/.test(String(productionWrangler.vars?.NARA_RUNTIME || ""))) throw new Error("Runtime konfigurasi upload produksi belum berversi.");
if (wrangler.vars?.APP_RELEASE !== "2026.07.24-studio-v14" || cloudflareProduction.vars?.APP_RELEASE !== "2026.07.24-studio-v14" || productionWrangler.vars?.APP_RELEASE !== "2026.07.24-studio-v14") throw new Error("Release Worker belum v14.");
if (cloudflareProduction.vars?.PAYPAL_ENV !== "sandbox") throw new Error("PayPal harus tetap sandbox sampai credential live dan webhook diverifikasi.");
if (cloudflareProduction.vars?.PAYPAL_MERCHANT_EMAIL !== "triapriyogibahari9@gmail.com") throw new Error("Email merchant PayPal belum sesuai permintaan pemilik.");
if (cloudflareProduction.vars?.AUTH_BRANDED_EMAIL_READY !== "false") throw new Error("Email bermerek tidak boleh diklaim aktif sebelum probe pengiriman lulus.");

for (const vars of [wrangler.vars || {}, cloudflareProduction.vars || {}, productionWrangler.vars || {}, temporaryWrangler.vars || {}]) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(vars.SUPABASE_URL || ""))) throw new Error("Public Supabase URL Worker belum valid.");
  if (!/^(sb_publishable_|eyJ)/.test(String(vars.SUPABASE_PUBLISHABLE_KEY || ""))) throw new Error("Public Supabase publishable key Worker belum valid.");
  for (const forbidden of ["SUPABASE_SERVICE_ROLE_KEY", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID", "LOCAL_PAYMENT_GATEWAY_SECRET", "QWEN_API_KEY"]) {
    if (Object.hasOwn(vars, forbidden)) throw new Error(`Secret ${forbidden} tidak boleh disimpan sebagai plaintext vars.`);
  }
}
for (const secret of ["QWEN_API_KEY", "QWEN_WORKSPACE_ID"]) {
  if (!cloudflareProduction.secrets?.optional?.includes(secret)) throw new Error(`Secret penyedia utama harus dideklarasikan opsional: ${secret}`);
}

const worker = await readFile(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const workersAi = await readFile(new URL("../server/workers-ai-nara.mjs", import.meta.url), "utf8");
const imageHandler = await readFile(new URL("../server/nara-image-handler.mjs", import.meta.url), "utf8");
const portableApi = await readFile(new URL("../api/server.mjs", import.meta.url), "utf8");
if (!worker.includes("../server/nara-runtime.mjs")) throw new Error("Worker belum memakai runtime Nara portable.");
if (!worker.includes("../server/workers-ai-nara.mjs")) throw new Error("Worker belum memakai fallback Workers AI.");
if (!portableApi.includes("../server/nara-runtime.mjs")) throw new Error("API pemulihan belum memakai runtime Nara portable.");
if (!worker.includes(".ngeblogging.com")) throw new Error("Worker belum menerima origin tenant wildcard.");
for (const marker of ["handleNaraImage", "imageGenerationReady", "workersVisionReady", "handleBillingRequest", "handlePayPalWebhook", "seoEndpoint", "injectTenantSeo", "handleWorkersAiNara", "/api/nara/image", "/api/billing/paypal/webhook", "/api/billing/", "2026.07.24-studio-v14"]) {
  if (!worker.includes(marker)) throw new Error(`Worker belum memuat kemampuan produksi: ${marker}`);
}
for (const marker of ["env.AI.run", "consume_nara_quota", "verifyUser", "@cf/zai-org/glm-4.7-flash", "@cf/google/gemma-4-26b-a4b-it", "imageAttachment", "workersVisionReady"]) {
  if (!workersAi.includes(marker)) throw new Error(`Fallback Workers AI belum memuat ${marker}.`);
}
for (const marker of ["imageGenerationReady", "verifySiteAccess", "consumeImageQuota", "generateWithWorkers", "@cf/bytedance/stable-diffusion-xl-lightning", "site-public-media"]) {
  if (!imageHandler.includes(marker)) throw new Error(`Generator gambar Nara belum memuat ${marker}.`);
}
for (const source of [worker, portableApi]) if (/netlify\/functions|x-nf-client-connection-ip/.test(source)) throw new Error("Entrypoint produksi masih memiliki dependensi runtime lama.");

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
for (const bridge of ["cloudflare-media-bridge", "editor-toolbar-bridge", "workspace-profile-bridge", "workspace-activation-bridge"]) {
  if (index.includes(bridge)) throw new Error(`Bridge DOM lama masih aktif: ${bridge}`);
}
for (const marker of ["pwa-runtime.js", "studio-v14-authority.css", "nara-command-center-bridge.js", "nara-command-center.css"]) {
  if (!index.includes(marker)) throw new Error(`Shell produksi belum memuat ${marker}.`);
}
for (const legacy of [
  "app-shell-bridge.js",
  "studio-runtime-layout-guard.js",
  "studio-mobile-navigation.js",
  "studio-production-guard.js",
  "nara-availability-bridge.js",
  "nara-interaction-guard.js",
  "studio-v8-hardening.css",
  "studio-v10-authority.css",
  "studio-v11-mobile-repair.css",
]) {
  if (index.includes(legacy)) throw new Error(`Guard lama masih aktif dan dapat bentrok: ${legacy}`);
}
if (index.indexOf("pwa-runtime.js") > index.indexOf("/src/main.jsx")) throw new Error("Runtime PWA wajib dimuat sebelum aplikasi React.");

const studioSecure = await readFile(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
for (const marker of ["studio-source-navigation-v14-20260724", "naraRoute.dataset.naraWorkspaceRoute", ".sn-top-actions .sn-nara-button", "dataset.sidebarAuthority", "PHONE_QUERY", "health.imageGeneration", "button.hidden = false"]) {
  if (!studioSecure.includes(marker)) throw new Error(`StudioSecure v14 kehilangan ${marker}.`);
}
const studioAuthority = await readFile(new URL("../src/studio-v14-authority.css", import.meta.url), "utf8");
for (const marker of ["--sn-phone-rail", "--sn-phone-panel", ".sn-side.collapsed", ".sn-icon", ".nara-floating-button", ".nara-assistant-layer", ".nara-composer input[type=\"file\"]", ".sn-mobile-nav", "pointer-events: auto !important"]) {
  if (!studioAuthority.includes(marker)) throw new Error(`CSS Studio v14 kehilangan ${marker}.`);
}
const pwaRuntime = await readFile(new URL("../src/pwa-runtime.js", import.meta.url), "utf8");
for (const marker of ["ngeblogging-pwa-v14-20260724", "beforeinstallprompt", "navigator.serviceWorker.register", "updateViaCache: \"none\"", "Never reload during a click"]) {
  if (!pwaRuntime.includes(marker)) throw new Error(`Runtime PWA v14 kehilangan ${marker}.`);
}
if (/window\.location\.reload/.test(pwaRuntime)) throw new Error("Runtime PWA tidak boleh memuat ulang halaman saat interaksi pengguna.");

const commandCenter = await readFile(new URL("../src/nara-command-center-bridge.js", import.meta.url), "utf8");
for (const marker of ["nara-command-center-v13-20260724", "Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector", "openWorkspace"]) {
  if (!commandCenter.includes(marker)) throw new Error(`Command Center Nara kehilangan ${marker}.`);
}
const assistant = await readFile(new URL("../src/NaraAssistant.jsx", import.meta.url), "utf8");
for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar"]) {
  if (!assistant.includes(marker)) throw new Error(`Nara Assistant kehilangan kemampuan: ${marker}`);
}
const workspace = await readFile(new URL("../src/NaraWorkspace.jsx", import.meta.url), "utf8");
for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar", "INTEGRATION_CATALOG"]) {
  if (!workspace.includes(marker)) throw new Error(`Nara Workspace kehilangan kemampuan: ${marker}`);
}
const integrations = await readFile(new URL("../src/lib/nara-data.js", import.meta.url), "utf8");
for (const marker of ["supabase", "github", "neon", "cloudflare", "paypal", "google-drive", "webhook"]) {
  if (!integrations.includes(`id:\"${marker}\"`) && !integrations.includes(`id:"${marker}"`)) throw new Error(`Katalog plugin kehilangan ${marker}.`);
}

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

const publicData = await readFile(new URL("../src/lib/public-data.js", import.meta.url), "utf8");
for (const marker of ["status\",\"active", "is_public", "site_theme_settings", "contents"]) {
  if (!publicData.includes(marker)) throw new Error(`Renderer publik kehilangan marker: ${marker}`);
}

const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
if (!serviceWorker.includes("ngeblogging-app-v14-20260724")) throw new Error("Service worker belum menginvalidasi cache ke v14.");
if (!serviceWorker.includes('fetch(request, { cache: "no-store" })')) throw new Error("Service worker belum memaksa aset aplikasi mengambil versi jaringan terbaru.");

const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
for (const value of ["Content-Security-Policy", "X-Content-Type-Options", "max-age=31536000, immutable"]) if (!headers.includes(value)) throw new Error(`Header Cloudflare belum memuat ${value}.`);

const cloudflareWorkflow = await readFile(new URL("../.github/workflows/cloudflare.yml", import.meta.url), "utf8");
if (cloudflareWorkflow.includes("CLOUDFLARE_DEPLOY_ENABLED == 'true'")) throw new Error("Deployment Cloudflare tidak boleh lagi dilewati oleh activation gate.");
for (const marker of ["npm run deploy:cloudflare", "studio-v14-authority.css", "nara-command-center-bridge.js", "ngeblogging-app-v14-20260724", "2026.07.24-studio-v14", "health.naraProviders?.vision", "health.imageGeneration", "TENANT_SMOKE_TEST_URL", "tenant-404"]) {
  if (!cloudflareWorkflow.includes(marker)) throw new Error(`Deployment Cloudflare v14 belum memuat ${marker}.`);
}

console.log(`Validasi produksi v14 lulus: ${requiredFiles.length} berkas wajib, satu sidebar responsif, Nara teks/vision/gambar, QR, memori, plugin termasuk Neon, 100 tema, 25 widget, renderer tenant, PWA v14, dan deploy Cloudflare wajib.`);
