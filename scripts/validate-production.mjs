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
  "wrangler.jsonc",
  "public/_headers",
  "src/cloudflare-media-bridge.js",
  "src/editor-toolbar-bridge.js",
  "src/workspace-profile-bridge.js",
  "src/workspace-activation-bridge.js",
  "supabase/migrations/202607230200_cloudflare_public_media.sql",
  "supabase/migrations/202607230210_profile_website.sql",
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
if (!packageJson.scripts["deploy:cloudflare"]?.includes("--env production")) {
  throw new Error("Deployment Cloudflare wajib memakai environment production.");
}
if (!packageJson.scripts["cloudflare:preview-dry-run"]?.includes("wrangler versions upload")) {
  throw new Error("Preview Cloudflare wajib divalidasi dengan versions upload.");
}

const compose = await readFile(new URL("../compose.production.yml", import.meta.url), "utf8");
const apiService = compose.slice(compose.indexOf("  api:"), compose.indexOf("  web:"));
if (/^\s{4}ports:/m.test(apiService)) throw new Error("Container API tidak boleh membuka port publik.");
if (!compose.includes("no-new-privileges:true")) throw new Error("Hardening container belum aktif.");

const apiDockerfile = await readFile(new URL("../Dockerfile.api", import.meta.url), "utf8");
if (!/^USER node$/m.test(apiDockerfile)) throw new Error("API harus berjalan sebagai user non-root.");

const productionWorkflow = await readFile(new URL("../.github/workflows/production.yml", import.meta.url), "utf8");
for (const platform of ["linux/amd64", "linux/arm64"]) {
  if (!productionWorkflow.includes(platform)) throw new Error(`Image pemulihan belum mendukung ${platform}.`);
}
for (const target of ["deploy-primary", "deploy-standby"]) {
  if (!productionWorkflow.includes(`${target}:`)) throw new Error(`Target pemulihan ${target} belum tersedia.`);
}

const productionEnv = await readFile(new URL("../.env.production.example", import.meta.url), "utf8");
if (/^(QWEN_API_KEY|SUPABASE_PUBLISHABLE_KEY)=\s*(?!REPLACE_ME|sb_publishable_REPLACE_ME)/m.test(productionEnv)) {
  throw new Error("Contoh environment memuat credential nyata.");
}

const wrangler = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const cloudflareProduction = wrangler.env?.production || {};
const routes = new Set((cloudflareProduction.routes || []).map((route) => typeof route === "string" ? route : route.pattern));
for (const route of ["ngeblogging.com/*", "*.ngeblogging.com/*"]) {
  if (!routes.has(route)) throw new Error(`Route Cloudflare wajib belum tersedia: ${route}`);
}
if (wrangler.routes || wrangler.secrets) throw new Error("Preview Cloudflare tidak boleh mengklaim route atau secret produksi.");
if (!wrangler.compatibility_flags?.includes("nodejs_compat")) throw new Error("nodejs_compat belum aktif.");
if (wrangler.assets?.not_found_handling !== "single-page-application") throw new Error("SPA fallback Cloudflare belum aktif.");
if (!wrangler.assets?.run_worker_first?.includes("/api/*")) throw new Error("API belum diprioritaskan ke Worker.");
if (wrangler.vars?.NARA_RUNTIME !== "cloudflare-worker-preview-v2") throw new Error("Runtime preview Cloudflare belum terisolasi.");
if (cloudflareProduction.vars?.NARA_RUNTIME !== "cloudflare-worker-v2") throw new Error("Runtime produksi Cloudflare belum memakai versi terbaru.");
for (const secret of ["QWEN_API_KEY", "QWEN_WORKSPACE_ID", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]) {
  if (!cloudflareProduction.secrets?.required?.includes(secret)) throw new Error(`Secret wajib belum dideklarasikan: ${secret}`);
  if (Object.hasOwn(cloudflareProduction.vars || {}, secret)) throw new Error(`Secret ${secret} tidak boleh disimpan sebagai plaintext vars.`);
}

const worker = await readFile(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const portableApi = await readFile(new URL("../api/server.mjs", import.meta.url), "utf8");
if (!worker.includes("../server/nara-runtime.mjs")) throw new Error("Worker belum memakai runtime Nara portable.");
if (!portableApi.includes("../server/nara-runtime.mjs")) throw new Error("API pemulihan belum memakai runtime Nara portable.");
if (!worker.includes(".ngeblogging.com")) throw new Error("Worker belum menerima origin tenant wildcard.");
for (const source of [worker, portableApi]) {
  if (/netlify\/functions|x-nf-client-connection-ip/.test(source)) throw new Error("Entrypoint produksi masih memiliki dependensi runtime lama.");
}

const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
for (const value of ["Content-Security-Policy", "X-Content-Type-Options", "max-age=31536000, immutable"]) {
  if (!headers.includes(value)) throw new Error(`Header Cloudflare belum memuat ${value}.`);
}

const cloudflareWorkflow = await readFile(new URL("../.github/workflows/cloudflare.yml", import.meta.url), "utf8");
if (!cloudflareWorkflow.includes("CLOUDFLARE_DEPLOY_ENABLED == 'true'")) {
  throw new Error("Deployment Cloudflare belum memiliki activation gate.");
}
if (!cloudflareWorkflow.includes("/api/health")) {
  throw new Error("Deployment Cloudflare belum memiliki smoke test health endpoint.");
}

console.log(`Validasi produksi lulus: ${requiredFiles.length} berkas wajib, runtime portable aktif, preview terisolasi, wildcard produksi aktif, secret tervalidasi, dan jalur pemulihan di-hardening.`);
