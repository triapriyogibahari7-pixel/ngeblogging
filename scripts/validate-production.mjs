import { readFile, access } from "node:fs/promises";

const requiredFiles = [
  "api/server.mjs",
  "Caddyfile",
  "compose.production.yml",
  "Dockerfile.api",
  "Dockerfile.web",
  "cloudflare/worker.mjs",
  "wrangler.jsonc",
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
  "docs/CLOUDFLARE_FREE.md",
];

for (const file of requiredFiles) await access(new URL(`../${file}`, import.meta.url));

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
for (const [name, version] of Object.entries({ ...packageJson.dependencies, ...packageJson.devDependencies })) {
  if (/^(latest|next)$|^[~^*]/.test(version)) throw new Error(`Dependency ${name} belum dipin: ${version}`);
}

const compose = await readFile(new URL("../compose.production.yml", import.meta.url), "utf8");
const apiService = compose.slice(compose.indexOf("  api:"), compose.indexOf("  web:"));
if (/^\s{4}ports:/m.test(apiService)) throw new Error("Container API tidak boleh membuka port publik.");
if (!compose.includes("no-new-privileges:true")) throw new Error("Hardening container belum aktif.");

const apiDockerfile = await readFile(new URL("../Dockerfile.api", import.meta.url), "utf8");
if (!/^USER node$/m.test(apiDockerfile)) throw new Error("API harus berjalan sebagai user non-root.");

const productionWorkflow = await readFile(new URL("../.github/workflows/production.yml", import.meta.url), "utf8");
for (const platform of ["linux/amd64", "linux/arm64"]) {
  if (!productionWorkflow.includes(platform)) throw new Error(`Image produksi belum mendukung ${platform}.`);
}
for (const target of ["deploy-primary", "deploy-standby"]) {
  if (!productionWorkflow.includes(`${target}:`)) throw new Error(`Target ${target} belum tersedia.`);
}

const productionEnv = await readFile(new URL("../.env.production.example", import.meta.url), "utf8");
if (/^(QWEN_API_KEY|SUPABASE_PUBLISHABLE_KEY)=\s*(?!REPLACE_ME|sb_publishable_REPLACE_ME)/m.test(productionEnv)) {
  throw new Error("Contoh environment memuat credential nyata.");
}

const wrangler = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
for (const required of ["nodejs_compat", "single-page-application", "/api/*", "cloudflare-worker-v1"]) {
  if (!wrangler.includes(required)) throw new Error(`Konfigurasi Cloudflare belum memuat ${required}.`);
}

const cloudflareWorkflow = await readFile(new URL("../.github/workflows/cloudflare.yml", import.meta.url), "utf8");
if (!cloudflareWorkflow.includes("CLOUDFLARE_DEPLOY_ENABLED == 'true'")) {
  throw new Error("Deployment Cloudflare belum memiliki activation gate.");
}

console.log(`Validasi produksi lulus: ${requiredFiles.length} berkas wajib, dependency terpin, dan container di-hardening.`);
