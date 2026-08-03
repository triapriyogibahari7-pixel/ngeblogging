import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

export const RELEASE = "auth-public-membership-fallback-v250-20260804";
const PRODUCTION_SUPABASE_URL = "https://polvmlrhqoiflumibfqs.supabase.co";
const PRODUCTION_SUPABASE_KEY = "sb_publishable_Jqz6qDzX4IKSunPoDT5zyQ_sk6EK4W-";

const path = "src/StudioOnboardingGate.jsx";
let source = await read(path);

if (!source.includes("async function listUserSitesDirectV192")) {
  throw new Error("V250_REQUIRES_V192_DIRECT_MEMBERSHIP_HELPER");
}
if (!source.includes('Authorization: `Bearer ${accessToken}`')) {
  throw new Error("V250_REQUIRES_USER_BEARER_RLS");
}
if (!source.includes('document.documentElement.dataset.studioMembershipTransportV192 = "direct-supabase-rls"')) {
  throw new Error("V250_REQUIRES_DIRECT_RLS_TRANSPORT_MARKER");
}

const urlBefore = '  const base = String(env.VITE_SUPABASE_URL || "").trim().replace(/\\/$/, "");';
const urlAfter = `  const base = String(env.VITE_SUPABASE_URL || "${PRODUCTION_SUPABASE_URL}").trim().replace(/\\/$/, "");`;
const keyBefore = '  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "").trim();';
const keyAfter = `  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "${PRODUCTION_SUPABASE_KEY}").trim();`;

if (!source.includes(urlAfter)) {
  if (!source.includes(urlBefore)) throw new Error("V250_DIRECT_URL_ANCHOR_MISSING");
  source = source.replace(urlBefore, urlAfter);
}
if (!source.includes(keyAfter)) {
  if (!source.includes(keyBefore)) throw new Error("V250_DIRECT_KEY_ANCHOR_MISSING");
  source = source.replace(keyBefore, keyAfter);
}

if (!source.includes("studioAuthPublicFallbackV250")) {
  const component = "export default function StudioOnboardingGate(props) {";
  if (!source.includes(component)) throw new Error("V250_GATE_COMPONENT_ANCHOR_MISSING");
  source = source.replace(
    component,
    `${component}\n  document.documentElement.dataset.studioAuthPublicFallbackV250 = "${RELEASE}";`,
  );
}

for (const marker of [
  RELEASE,
  PRODUCTION_SUPABASE_URL,
  PRODUCTION_SUPABASE_KEY,
  "direct-supabase-rls",
  "client-gateway-fallback",
  "Authorization: `Bearer ${accessToken}`",
  "force: attempt > 0",
  "studio-bootstrap-online-retry-v192",
]) {
  if (!source.includes(marker)) throw new Error(`V250_AUTH_FALLBACK_VERIFY_FAILED:${marker}`);
}

if (/service_role|SUPABASE_SERVICE_ROLE|sb_secret_/i.test(source)) {
  throw new Error("V250_PRIVILEGED_KEY_MUST_NOT_BE_EMBEDDED");
}
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/.test(source)) {
  throw new Error("V250_AUTH_FALLBACK_DESTRUCTIVE_SESSION_ACTION");
}

await write(path, source);
console.log(`Applied ${RELEASE}: direct site membership keeps user bearer/RLS and gains the official public project fallback.`);
