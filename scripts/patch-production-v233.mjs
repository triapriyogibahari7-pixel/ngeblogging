import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const RELEASE = "studio-production-v233-data-session-bootstrap-20260803";

async function verifyDirectDataTransport() {
  const [transport, v232Runtime, v232Css, release] = await Promise.all([
    read("src/lib/supabase.js"),
    read("src/studio-production-v232.js"),
    read("src/studio-production-v232.css"),
    read("public/release-v233.json"),
  ]);
  const markers = [
    RELEASE,
    "DATA_GATEWAY_DEADLINE_V233 = 2800",
    "AUTH_GATEWAY_DEADLINE_V233 = 4200",
    "staleUnauthorized = [401, 403].includes(response.status) && !gatewayHeader",
    "staleHtmlShell",
    "gateway-timeout",
    "direct-supabase-fallback",
    "persistSession: true",
    "autoRefreshToken: true",
    "DATA_TRANSPORT_RELEASE_V190",
    "direct-fallback-v186",
    "direct-supabase-oauth-v186",
  ];
  for (const marker of markers) if (!transport.includes(marker)) throw new Error(`V233_DATA_TRANSPORT_VERIFY_FAILED:${marker}`);

  const start = transport.indexOf("async function gatewayFirstV190(input, init, proxy, kind) {");
  const end = transport.indexOf("async function authAwareFetch(input, init) {", start);
  if (start < 0 || end < 0) throw new Error("V233_GATEWAY_SECTION_MISSING");
  const gateway = transport.slice(start, end);
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(gateway)) throw new Error("V233_DESTRUCTIVE_GATEWAY_SESSION_ACTION");

  if (!v232Runtime.includes("studio-production-v232-single-n-theme-actions-20260803")) throw new Error("V233_V232_RUNTIME_MISSING");
  if (!v232Css.includes('data-v232-family="large"') || !v232Css.includes('data-v232-family="small"')) throw new Error("V233_V232_RESPONSIVE_AUTHORITY_MISSING");
  if (!release.includes(RELEASE)) throw new Error("V233_RELEASE_CONTRACT_MISSING");
}

await verifyDirectDataTransport();
console.log(`Verified ${RELEASE}; v233 data transport is source-native. Service-worker rotation is intentionally isolated until this transport-only build passes.`);
