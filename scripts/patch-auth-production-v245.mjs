import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

export const RELEASE = "auth-production-readiness-v245-20260803";

const path = "src/lib/supabase.js";
let source = await read(path);

const oldConfig = `const browserEnv = import.meta.env || {};
const url = String(browserEnv.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
const key = String(
  browserEnv.VITE_SUPABASE_PUBLISHABLE_KEY
  || browserEnv.VITE_SUPABASE_ANON_KEY
  || "",
).trim();
const nativeFetch`;

const newConfig = `const browserEnv = import.meta.env || {};
const AUTH_CONFIG_RELEASE_V245 = "${RELEASE}";
// These are browser-safe public Supabase client credentials, never a service-role secret.
// They are used only on official ngeblogging.com hosts when a deployment forgot to expose
// the VITE_* build variables. Explicit VITE_* values always remain authoritative.
const PRODUCTION_SUPABASE_URL_V245 = "https://polvmlrhqoiflumibfqs.supabase.co";
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245 = "sb_publishable_Jqz6qDzX4IKSunPoDT5zyQ_sk6EK4W-";

function productionClientHostV245() {
  if (typeof window === "undefined") return false;
  const hostname = String(window.location?.hostname || "").toLowerCase();
  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com");
}

const configuredUrlV245 = String(browserEnv.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
const configuredKeyV245 = String(
  browserEnv.VITE_SUPABASE_PUBLISHABLE_KEY
  || browserEnv.VITE_SUPABASE_ANON_KEY
  || "",
).trim();
const productionFallbackAllowedV245 = productionClientHostV245();
const url = configuredUrlV245 || (productionFallbackAllowedV245 ? PRODUCTION_SUPABASE_URL_V245 : "");
const key = configuredKeyV245 || (productionFallbackAllowedV245 ? PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245 : "");
const authConfigSourceV245 = configuredUrlV245 && configuredKeyV245
  ? "vite-env"
  : url && key && productionFallbackAllowedV245
    ? "production-public-fallback"
    : "missing";
const nativeFetch`;

if (!source.includes("PRODUCTION_SUPABASE_URL_V245")) {
  if (!source.includes(oldConfig)) throw new Error("V245_SUPABASE_CONFIG_ANCHOR_MISSING");
  source = source.replace(oldConfig, newConfig);
}

const transportAnchor = '  document.documentElement.dataset.supabaseTransport = supabaseConfigured ? "auth-data-resilience-v190" : "not-configured";';
const transportReplacement = `  document.documentElement.dataset.authProductionReadinessV245 = AUTH_CONFIG_RELEASE_V245;\n  document.documentElement.dataset.supabaseConfigSourceV245 = authConfigSourceV245;\n${transportAnchor}`;
if (!source.includes("dataset.supabaseConfigSourceV245")) {
  if (!source.includes(transportAnchor)) throw new Error("V245_SUPABASE_DATASET_ANCHOR_MISSING");
  source = source.replace(transportAnchor, transportReplacement);
}

for (const marker of [
  RELEASE,
  "PRODUCTION_SUPABASE_URL_V245",
  "PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245",
  "productionClientHostV245",
  'hostname === "ngeblogging.com"',
  'hostname.endsWith(".ngeblogging.com")',
  'authConfigSourceV245 = configuredUrlV245 && configuredKeyV245',
  "persistSession: true",
  "autoRefreshToken: true",
  'flowType: "pkce"',
  "gatewayFirstV190",
  "signInWithProvider",
  "signInWithPassword",
  "signInWithMagicLink",
]) {
  if (!source.includes(marker)) throw new Error(`V245_AUTH_CONTRACT_MISSING:${marker}`);
}

if (/service[_-]?role|SUPABASE_SERVICE_ROLE|service_role/i.test(newConfig)) {
  throw new Error("V245_SERVICE_ROLE_MUST_NEVER_BE_EMBEDDED");
}
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/.test(source)) {
  throw new Error("V245_DESTRUCTIVE_STORAGE_ACTION");
}

await write(path, source);
console.log(`Applied ${RELEASE}: production login retains VITE config first and gains an official-host public fallback.`);
