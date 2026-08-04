import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

export const RELEASE = "auth-production-readiness-v245-20260803";

const path = "src/lib/supabase.js";
let source = await read(path);

const newConfig = `const browserEnv = import.meta.env || {};
const AUTH_CONFIG_RELEASE_V245 = "${RELEASE}";
// Browser-safe public client configuration only. No privileged Supabase credential
// is embedded. Explicit VITE_* values remain authoritative whenever supplied.
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
  const start = source.indexOf("const browserEnv = import.meta.env || {};");
  const nativeFetch = source.indexOf("const nativeFetch", start);
  if (start < 0 || nativeFetch < 0) throw new Error("V245_SUPABASE_CONFIG_RANGE_MISSING");
  source = `${source.slice(0, start)}${newConfig}${source.slice(nativeFetch + "const nativeFetch".length)}`;
}

if (!source.includes("dataset.supabaseConfigSourceV245")) {
  const marker = "document.documentElement.dataset.supabaseTransport =";
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error("V245_SUPABASE_DATASET_RANGE_MISSING");
  const lineStart = source.lastIndexOf("\n", markerIndex) + 1;
  const insert = `  document.documentElement.dataset.authProductionReadinessV245 = AUTH_CONFIG_RELEASE_V245;\n  document.documentElement.dataset.supabaseConfigSourceV245 = authConfigSourceV245;\n`;
  source = `${source.slice(0, lineStart)}${insert}${source.slice(lineStart)}`;
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

if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]|sb_secret_[A-Za-z0-9_-]{8,}/i.test(newConfig)) {
  throw new Error("V245_PRIVILEGED_KEY_MUST_NEVER_BE_EMBEDDED");
}
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/.test(source)) {
  throw new Error("V245_DESTRUCTIVE_STORAGE_ACTION");
}

await write(path, source);
console.log(`Applied ${RELEASE}: production login retains VITE config first and gains an official-host public fallback.`);

// Final production build authority. Historical patch scripts above may rewrite
// Studio or the service worker for compatibility; v252 finalization is deliberately
// last and does not touch authentication or onboarding state.
await import("./finalize-studio-v252.mjs");
await import("./patch-service-worker-v252.mjs");
