import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeEntryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-domain-v321.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-domain-v321.css", import.meta.url);
const themeStudioFile = new URL("../src/ThemeStudio.jsx", import.meta.url);
const widgetSystemFile = new URL("../src/widget-system.js", import.meta.url);
const domainPanelFile = new URL("../src/DomainPanelV124.jsx", import.meta.url);
const domainProviderFile = new URL("../server/cloudflare-full-zone-provider.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v321.json", import.meta.url);

const RELEASE = "studio-theme-domain-v321-20260806";
const DNS_RELEASE = "cloudflare-public-dns-v321-20260806";
const VERSION = "ngeblogging-app-v321-theme-domain-20260806";
const CACHE = "studio-theme-domain-cache-v321";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V321_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

function replaceRequired(source, before, after, code) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(code);
  return source.replace(before, after);
}

const [runtimeEntry, runtime, css, themeStudio, widgetSystem, release] = await Promise.all([
  readFile(runtimeEntryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(themeStudioFile, "utf8"),
  readFile(widgetSystemFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-theme-domain-v321.js"',
  "STUDIO_THEME_DOMAIN_RELEASE_V321",
]) if (!runtimeEntry.includes(marker)) throw new Error(`V321_RUNTIME_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "themeLayoutV321",
  "themeMapScrollShellV321",
  "codeGeometryV321",
]) if (!runtime.includes(marker)) throw new Error(`V321_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-theme-domain-v321",
  'data-theme-layout-v321="ready"',
  'data-theme-map-v321="detail"',
  'grid-template-areas:"code preview"',
  'grid-template-areas:"preview" "code"',
  "sv124-domain-dns-v321",
]) if (!css.includes(marker)) throw new Error(`V321_CSS_MISSING:${marker}`);

// These authorities are materialized earlier by v312 in the same production
// prebuild. v321 refuses to continue if the 100-theme/26-area/10k editor layer
// disappeared, rather than replacing it with a placeholder.
for (const marker of [
  "theme-map-code-editor-v312-20260806",
  "Model editorial",
  "Model majalah",
  "Array.from({ length: 10000 }",
  'data-theme-code-v312="line-numbers-10000"',
]) if (!themeStudio.includes(marker)) throw new Error(`V321_THEME_V312_REGRESSION:${marker}`);
if (!widgetSystem.includes("HTML / CSS / JavaScript")) throw new Error("V321_WIDGET_CUSTOM_CODE_REGRESSION");

let provider = await readFile(domainProviderFile, "utf8");
if (!provider.includes("PUBLIC_DNS_VERIFY_RELEASE_V318") || !provider.includes("publicDnsResolvesV318"))
  throw new Error("V321_DOMAIN_V318_AUTHORITY_MISSING");

if (!provider.includes("PUBLIC_DNS_VERIFY_RELEASE_V321")) {
  provider = replaceRequired(
    provider,
    `export const PUBLIC_DNS_VERIFY_RELEASE_V318 = "cloudflare-worker-public-dns-v318-20260806";`,
    `export const PUBLIC_DNS_VERIFY_RELEASE_V318 = "cloudflare-worker-public-dns-v318-20260806";\nexport const PUBLIC_DNS_VERIFY_RELEASE_V321 = "${DNS_RELEASE}";`,
    "V321_DOMAIN_RELEASE_ANCHOR_MISSING",
  );
}

if (!provider.includes("async function publicDnsResolvesV321")) {
  const anchor = "async function verifyWorkerDomainAttachment(env, { hostname, zoneId, zoneName, workerService }) {";
  const helper = `async function publicDnsResolvesV321(hostname) {\n  const normalized = String(hostname || "").trim().toLowerCase().replace(/\\.$/, "");\n  if (!normalized) return false;\n  for (const type of ["A", "AAAA"]) {\n    const query = new URLSearchParams({ name: normalized, type });\n    const response = await fetch(\`https://cloudflare-dns.com/dns-query?\${query.toString()}\`, {\n      headers: { accept: "application/dns-json" },\n      cf: { cacheTtl: 0, cacheEverything: false },\n    }).catch(() => null);\n    if (!response?.ok) continue;\n    const payload = await response.json().catch(() => ({}));\n    if (Number(payload?.Status) !== 0 || !Array.isArray(payload?.Answer)) continue;\n    if (payload.Answer.some((answer) => String(answer?.data || "").trim())) return true;\n  }\n  return false;\n}\n\n${anchor}`;
  provider = replaceRequired(provider, anchor, helper, "V321_PUBLIC_DNS_HELPER_ANCHOR_MISSING");
}

provider = provider
  .replace(
    "const publicDnsReady = await publicDnsResolvesV318(expectedHostname).catch(() => false);",
    "const publicDnsReady = await publicDnsResolvesV321(expectedHostname).catch(() => false);",
  )
  .replace(
    "public_dns_release: PUBLIC_DNS_VERIFY_RELEASE_V318",
    "public_dns_release: PUBLIC_DNS_VERIFY_RELEASE_V321",
  )
  .replace(
    '  error.code = "WORKER_DOMAIN_NOT_ATTACHED";',
    '  error.code = lastSeen?.public_dns_verified === false ? "PUBLIC_DNS_NOT_READY" : "WORKER_DOMAIN_NOT_ATTACHED";',
  );

for (const marker of [
  "PUBLIC_DNS_VERIFY_RELEASE_V321",
  "publicDnsResolvesV321",
  '["A", "AAAA"]',
  "PUBLIC_DNS_NOT_READY",
]) if (!provider.includes(marker)) throw new Error(`V321_DOMAIN_PROVIDER_MISSING:${marker}`);
await writeFile(domainProviderFile, provider);

let panel = await readFile(domainPanelFile, "utf8");
if (!panel.includes("public_dns_verified === true") || !panel.includes("worker-domain-dns-verified"))
  throw new Error("V321_DOMAIN_PANEL_V318_AUTHORITY_MISSING");

if (!panel.includes("DNS publik belum aktif")) {
  panel = replaceRequired(
    panel,
    'function domainStatus(domain) {\n  if (activeDomain(domain)) return ["Aktif", "active"];',
    'function domainStatus(domain) {\n  if (activeDomain(domain)) return ["Aktif", "active"];\n  if (domain?.provider === "cloudflare-full-zone" && domain?.ownership_verification?.public_dns_verified === false) return ["DNS publik belum aktif", "pending"];',
    "V321_DOMAIN_STATUS_ANCHOR_MISSING",
  );
}

if (!panel.includes("const publicDnsVerified =")) {
  panel = replaceRequired(
    panel,
    "          const domainAddresses = addresses(domain);",
    "          const domainAddresses = addresses(domain);\n          const publicDnsVerified = domain?.ownership_verification?.public_dns_verified === true;\n          const provisioningState = String(domain?.ownership_verification?.provisioning_state || \"\");",
    "V321_DOMAIN_CARD_VARS_ANCHOR_MISSING",
  );
}

if (!panel.includes("sv124-domain-dns-v321")) {
  const errorNode = '{domain.error_message ? <p className="sv124-inline-error">{domain.error_message}</p> : null}';
  const diagnostics = `${errorNode}\n            <section className="sv124-domain-dns-v321" data-ready={String(publicDnsVerified)}><b>{publicDnsVerified ? "DNS publik terverifikasi" : "DNS publik belum terdeteksi"}</b><p>{publicDnsVerified ? "DNS publik sudah menjawab dan routing Worker sedang/selesai diverifikasi." : "Pastikan dua nameserver resmi di atas benar-benar menggantikan nameserver lama pada registrar. Selama DNS publik belum menjawab, browser dapat menampilkan NXDOMAIN dan Ngeblogging tidak akan menandai domain sebagai aktif."}</p>{provisioningState ? <code>{provisioningState}</code> : null}</section>`;
  panel = replaceRequired(panel, errorNode, diagnostics, "V321_DOMAIN_DIAGNOSTIC_ANCHOR_MISSING");
}

for (const marker of [
  "DNS publik belum aktif",
  "sv124-domain-dns-v321",
  "browser dapat menampilkan NXDOMAIN",
  "publicDnsVerified",
]) if (!panel.includes(marker)) throw new Error(`V321_DOMAIN_PANEL_MISSING:${marker}`);
await writeFile(domainPanelFile, panel);

for (const marker of [
  RELEASE,
  '"themesPreserved": 100',
  '"layoutAreasPreserved": 26',
  '"layoutModelsPreserved": 2',
  '"codeLineGuidePreserved": 10000',
  '"publicDnsQueries": ["A", "AAAA"]',
  '"registrarNameserverDelegationAutomated": false',
]) if (!release.includes(marker)) throw new Error(`V321_RELEASE_INVALID:${marker}`);

for (const source of [runtime, provider, panel]) {
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
    throw new Error("V321_DESTRUCTIVE_BEHAVIOR");
}

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_PRODUCTION_CUTOVER_RELEASE_V320",
  "STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319",
  "STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318",
  "AUTH_CALLBACK_RECOVERY_RELEASE_V315",
]) if (!sw.includes(inherited)) throw new Error(`V321_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V320", "NGE_BLOGGING_UPDATE_AVAILABLE_V321")
  .replaceAll("service-worker-activated-studio-production-cutover-v320", "service-worker-activated-studio-theme-domain-v321");
sw = upsert(sw, "STUDIO_THEME_DOMAIN_RELEASE_V321", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V321", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V321", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V321}-${ACTIVE_CACHE_RELEASE_V321}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V321}-${ACTIVE_CACHE_RELEASE_V321}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "STUDIO_PRODUCTION_CUTOVER_RELEASE_V320"])
  if (!sw.includes(marker)) throw new Error(`V321_SW_MARKER_MISSING:${marker}`);
await writeFile(swFile, sw);

console.log(`Validated ${RELEASE}, hardened Theme geometry, and made custom-domain DNS diagnostics truthful.`);
await import("../tests/studio-theme-domain-v321.test.mjs");
