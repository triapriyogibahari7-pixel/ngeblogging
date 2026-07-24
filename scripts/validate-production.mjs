import { access, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const requiredFiles = [
  "cloudflare/worker.mjs",
  "server/nara-runtime.mjs",
  "server/workers-ai-nara.mjs",
  "server/nara-image-handler.mjs",
  "server/domain-handler.mjs",
  "server/billing-handler.mjs",
  "server/paypal-webhook-handler.mjs",
  "server/seo-handler.mjs",
  "wrangler.jsonc",
  "wrangler.temporary.jsonc",
  "public/sw.js",
  "public/_headers",
  "src/pwa-runtime.js",
  "src/StudioNext.jsx",
  "src/StudioSecure.jsx",
  "src/studio-v14-authority.css",
  "src/nara-interaction-authority.css",
  "src/NaraAssistant.jsx",
  "src/NaraWorkspace.jsx",
  "src/nara-command-center-bridge.js",
  "src/nara-command-center.css",
  "src/theme-catalog.js",
  "src/widget-system.js",
  "src/PublicSiteNext.jsx",
  "src/lib/nara-data.js",
  "src/lib/public-data.js",
  ".github/workflows/cloudflare.yml",
];

for (const path of requiredFiles) await access(new URL(`../${path}`, import.meta.url));
if (existsSync(new URL("../netlify.toml", import.meta.url)) || existsSync(new URL("../netlify/", import.meta.url))) {
  throw new Error("Runtime Netlify lama tidak boleh kembali setelah migrasi Cloudflare Workers.");
}

const packageJson = JSON.parse(await read("package.json"));
for (const [name, version] of Object.entries({ ...packageJson.dependencies, ...packageJson.devDependencies })) {
  if (/^(latest|next)$|^[~^*]/.test(version)) throw new Error(`Dependency ${name} belum dipin: ${version}`);
}
if (!packageJson.scripts["deploy:cloudflare"]?.includes("--env production")) throw new Error("Deploy Cloudflare wajib memakai environment production.");

const wrangler = JSON.parse(await read("wrangler.jsonc"));
const temporaryWrangler = JSON.parse(await read("wrangler.temporary.jsonc"));
const production = wrangler.env?.production || {};
const routes = (config) => new Set((config.routes || []).map((route) => typeof route === "string" ? route : route.pattern));
for (const [label, config] of [["default", wrangler], ["production", production]]) {
  const configured = routes(config);
  for (const route of ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"]) {
    if (!configured.has(route)) throw new Error(`Route ${label} belum tersedia: ${route}`);
  }
}
if (temporaryWrangler.routes || temporaryWrangler.secrets) throw new Error("Konfigurasi audit sementara tidak boleh mengklaim route atau secret produksi.");
if (wrangler.assets?.not_found_handling !== "single-page-application" || wrangler.assets?.run_worker_first !== true) throw new Error("SPA tenant dan Worker-first belum aktif.");
if (wrangler.ai?.binding !== "AI" || production.ai?.binding !== "AI") throw new Error("Workers AI binding belum aktif pada default dan production.");
for (const [key, value] of Object.entries({
  APP_RELEASE: "2026.07.24-studio-v14",
  CF_AI_MODEL: "@cf/zai-org/glm-4.7-flash",
  CF_AI_VISION_MODEL: "@cf/google/gemma-4-26b-a4b-it",
  CF_AI_IMAGE_MODEL: "@cf/bytedance/stable-diffusion-xl-lightning",
})) {
  if (wrangler.vars?.[key] !== value || production.vars?.[key] !== value) throw new Error(`${key} belum konsisten pada deployment v14.`);
}
if (production.vars?.PAYPAL_ENV !== "sandbox") throw new Error("PayPal harus tetap sandbox sampai credential live dan webhook benar-benar diverifikasi.");
if (production.vars?.AUTH_BRANDED_EMAIL_READY !== "false") throw new Error("Email @ngeblogging.com tidak boleh diklaim aktif sebelum probe pengiriman lulus.");

const index = await read("index.html");
for (const marker of [
  "pwa-runtime.js",
  "studio-v14-authority.css",
  "nara-interaction-authority.css",
  "nara-command-center.css",
  "nara-command-center-bridge.js",
  "domain-management-bridge.js",
  "site-quota-bridge.js",
  "billing-availability-bridge.js",
  "auth-readiness-bridge.js",
]) if (!index.includes(marker)) throw new Error(`Shell produksi kehilangan ${marker}.`);
for (const legacy of [
  "studio-runtime-layout-guard.js",
  "studio-mobile-navigation.js",
  "studio-production-guard.js",
  "nara-availability-bridge.js",
  "nara-interaction-guard.js",
  "studio-v10-authority.css",
  "studio-v11-mobile-repair.css",
]) if (index.includes(legacy)) throw new Error(`Guard lama masih aktif: ${legacy}`);
if (index.indexOf("nara-interaction-authority.css") <= index.indexOf("studio-v14-authority.css")) throw new Error("Otoritas interaksi Nara wajib dimuat terakhir setelah Studio v14.");
if (index.indexOf("pwa-runtime.js") > index.indexOf("/src/main.jsx")) throw new Error("Runtime PWA wajib dimuat sebelum React.");

const secure = await read("src/StudioSecure.jsx");
for (const marker of ["studio-source-navigation-v14-20260724", "naraWorkspaceRoute", "sidebarAuthority", "initialSidebarResolved", "health.imageGeneration"]) {
  if (!secure.includes(marker)) throw new Error(`StudioSecure kehilangan ${marker}.`);
}
const studioCss = await read("src/studio-v14-authority.css");
for (const marker of ["--sn-phone-rail", ".sn-side.collapsed", ".sn-icon", ".sn-mobile-nav", ".nara-floating-button", ".nara-composer input[type=\"file\"]"]) {
  if (!studioCss.includes(marker)) throw new Error(`CSS Studio v14 kehilangan ${marker}.`);
}
const naraCss = await read("src/nara-interaction-authority.css");
for (const marker of ["2147483000", ".nara-assistant-layer", ".nara-assistant-shell", ".nara-native-file-input", "pointer-events: auto"]) {
  if (!naraCss.includes(marker)) throw new Error(`Otoritas interaksi Nara kehilangan ${marker}.`);
}

const worker = await read("cloudflare/worker.mjs");
for (const marker of ["handleWorkersAiNara", "workersVisionReady", "imageGenerationReady", "handleNaraImage", "handleDomainRequest", "handleBillingRequest", "handlePayPalWebhook", "managedSubdomains: true", "siteLimits: { free: 5, maximum: 12 }", "2026.07.24-studio-v14"]) {
  if (!worker.includes(marker)) throw new Error(`Worker kehilangan ${marker}.`);
}
const workersAi = await read("server/workers-ai-nara.mjs");
for (const marker of ["verifyUser", "consume_nara_quota", "imageAttachment", "workersVisionReady", "@cf/zai-org/glm-4.7-flash", "@cf/google/gemma-4-26b-a4b-it"]) {
  if (!workersAi.includes(marker)) throw new Error(`Nara Workers AI kehilangan ${marker}.`);
}
const imageHandler = await read("server/nara-image-handler.mjs");
for (const marker of ["verifySiteAccess", "consumeImageQuota", "generateWithWorkers", "imageGenerationReady", "site-public-media", "@cf/bytedance/stable-diffusion-xl-lightning"]) {
  if (!imageHandler.includes(marker)) throw new Error(`Generator gambar kehilangan ${marker}.`);
}

const assistant = await read("src/NaraAssistant.jsx");
for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar"]) {
  if (!assistant.includes(marker)) throw new Error(`Nara Assistant kehilangan ${marker}.`);
}
const workspace = await read("src/NaraWorkspace.jsx");
for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar", "INTEGRATION_CATALOG"]) {
  if (!workspace.includes(marker)) throw new Error(`Nara Workspace kehilangan ${marker}.`);
}
const commandCenter = await read("src/nara-command-center-bridge.js");
for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector", "openWorkspace"]) {
  if (!commandCenter.includes(marker)) throw new Error(`Command Center kehilangan ${marker}.`);
}
const integrations = await read("src/lib/nara-data.js");
for (const provider of ["github", "supabase", "neon", "cloudflare", "paypal", "google-drive", "webhook"]) {
  if (!integrations.includes(`id:\"${provider}\"`) && !integrations.includes(`id:"${provider}"`)) throw new Error(`Katalog plugin kehilangan ${provider}.`);
}

const themeCatalog = await read("src/theme-catalog.js");
for (const marker of ["const FAMILIES", "const COMPOSITIONS", "FAMILIES.flatMap", "COMPOSITIONS.map", "THEME_COUNT"]) {
  if (!themeCatalog.includes(marker)) throw new Error(`Generator 100 tema kehilangan ${marker}.`);
}
const widgets = await read("src/widget-system.js");
if (!widgets.includes("BUILT_IN_WIDGETS")) throw new Error("Widget bawaan belum tersedia.");
const publicData = await read("src/lib/public-data.js");
for (const marker of ["status\",\"active", "is_public", "site_theme_settings", "contents"]) if (!publicData.includes(marker)) throw new Error(`Renderer tenant kehilangan ${marker}.`);

const pwa = await read("src/pwa-runtime.js");
for (const marker of ["ngeblogging-pwa-v14-20260724", "beforeinstallprompt", "navigator.serviceWorker.register", "updateViaCache", "controllerchange", "dataset.deviceMode"]) {
  if (!pwa.includes(marker)) throw new Error(`Runtime PWA kehilangan ${marker}.`);
}
if (pwa.includes("window.location.reload")) throw new Error("Runtime PWA tidak boleh me-reload aplikasi saat pengguna sedang berinteraksi.");
const sw = await read("public/sw.js");
if (!sw.includes("ngeblogging-app-v14-20260724") || !sw.includes('fetch(request, { cache: "no-store" })')) throw new Error("Cache PWA v14 belum aman dari shell lama.");

const workflow = await read(".github/workflows/cloudflare.yml");
for (const marker of ["npm run deploy:cloudflare", "2026.07.24-studio-v14", "ngeblogging-app-v14-20260724", "health.naraProviders?.vision", "health.imageGeneration", "TENANT_SMOKE_TEST_URL", "tenant-404"]) {
  if (!workflow.includes(marker)) throw new Error(`Workflow Cloudflare kehilangan ${marker}.`);
}

console.log(`Validasi produksi v14 lulus: ${requiredFiles.length} berkas inti, satu sidebar, Nara teks/vision/gambar/QR/memori/plugin, PWA v14, tenant wildcard, 5/12 situs, dan deploy Cloudflare terjaga.`);
