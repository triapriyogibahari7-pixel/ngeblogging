import { readFile, access } from "node:fs/promises";

const requiredFiles = [
  "api/server.mjs",
  "Caddyfile",
  "compose.production.yml",
  "Dockerfile.api",
  "Dockerfile.web",
  ".github/workflows/ci.yml",
  ".github/workflows/production.yml",
  "scripts/bootstrap-ubuntu.sh",
  "scripts/deploy.sh",
  "scripts/server-doctor.sh",
  "scripts/verify-production.sh",
  "docs/PRODUCTION_SERVER.md",
  "docs/PRODUCTION_RUNBOOK.md",
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

const productionEnv = await readFile(new URL("../.env.production.example", import.meta.url), "utf8");
if (/^(QWEN_API_KEY|SUPABASE_PUBLISHABLE_KEY)=\s*(?!REPLACE_ME|sb_publishable_REPLACE_ME)/m.test(productionEnv)) {
  throw new Error("Contoh environment memuat credential nyata.");
}

console.log(`Validasi produksi lulus: ${requiredFiles.length} berkas wajib, dependency terpin, dan container di-hardening.`);
