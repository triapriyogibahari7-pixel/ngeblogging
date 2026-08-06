import { readFile, writeFile } from "node:fs/promises";

const providerFile = new URL("../server/cloudflare-full-zone-provider.mjs", import.meta.url);
const handlerFile = new URL("../server/domain-handler.mjs", import.meta.url);
const panelFile = new URL("../src/DomainPanelV124.jsx", import.meta.url);
const RELEASE = "cloudflare-worker-public-dns-v318-20260806";

function replaceRequired(source, before, after, code) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(code);
  return source.replace(before, after);
}

let provider = await readFile(providerFile, "utf8");
if (!provider.includes("PUBLIC_DNS_VERIFY_RELEASE_V318")) {
  provider = replaceRequired(
    provider,
    'export const WORKER_DOMAIN_ATTACH_RELEASE_V317 = "cloudflare-worker-domain-verified-v317-20260806";',
    'export const WORKER_DOMAIN_ATTACH_RELEASE_V317 = "cloudflare-worker-domain-verified-v317-20260806";\nexport const PUBLIC_DNS_VERIFY_RELEASE_V318 = "cloudflare-worker-public-dns-v318-20260806";',
    "V318_DOMAIN_RELEASE_ANCHOR_MISSING",
  );
}

if (!provider.includes("publicDnsResolvesV318")) {
  provider = replaceRequired(
    provider,
    "async function verifyWorkerDomainAttachment(env, { hostname, zoneId, zoneName, workerService }) {",
    `async function publicDnsResolvesV318(hostname) {\n  const query = new URLSearchParams({ name: hostname, type: "A" });\n  const response = await fetch(\`https://cloudflare-dns.com/dns-query?\${query.toString()}\`, {\n    headers: { accept: "application/dns-json" },\n    cf: { cacheTtl: 0, cacheEverything: false },\n  });\n  if (!response.ok) return false;\n  const payload = await response.json().catch(() => ({}));\n  return Number(payload?.Status) === 0 && Array.isArray(payload?.Answer) && payload.Answer.some((answer) => String(answer?.data || "").trim());\n}\n\nasync function verifyWorkerDomainAttachment(env, { hostname, zoneId, zoneName, workerService }) {`,
    "V318_PUBLIC_DNS_HELPER_ANCHOR_MISSING",
  );
}

provider = replaceRequired(
  provider,
  "    if (serviceMatches && zoneMatches && zoneNameMatches && exact.id) return exact;",
  `    if (serviceMatches && zoneMatches && zoneNameMatches && exact.id) {\n      const publicDnsReady = await publicDnsResolvesV318(expectedHostname).catch(() => false);\n      if (publicDnsReady) return { ...exact, public_dns_verified: true, public_dns_release: PUBLIC_DNS_VERIFY_RELEASE_V318 };\n      lastSeen = { ...exact, public_dns_verified: false };\n      continue;\n    }`,
  "V318_WORKER_DOMAIN_RETURN_ANCHOR_MISSING",
);

provider = replaceRequired(
  provider,
  "  error.release = WORKER_DOMAIN_ATTACH_RELEASE_V317;\n  throw error;",
  `  error.release = WORKER_DOMAIN_ATTACH_RELEASE_V317;\n  error.publicDnsRelease = PUBLIC_DNS_VERIFY_RELEASE_V318;\n  error.publicDnsVerified = false;\n  throw error;`,
  "V318_WORKER_DOMAIN_ERROR_ANCHOR_MISSING",
);

for (const marker of ["PUBLIC_DNS_VERIFY_RELEASE_V318", "publicDnsResolvesV318", "application/dns-json", "public_dns_verified: true"])
  if (!provider.includes(marker)) throw new Error(`V318_DOMAIN_PROVIDER_MISSING:${marker}`);
await writeFile(providerFile, provider);

let handler = await readFile(handlerFile, "utf8");
handler = replaceRequired(
  handler,
  "        additional_hostnames:\n          additionalHostnames,",
  `        provisioning_state: active ? "worker-domain-dns-verified" : zoneState.active ? "worker-domain-dns-pending" : "nameservers-pending",\n        public_dns_verified: active,\n        public_dns_verified_at: active ? now : null,\n        public_dns_release: "${RELEASE}",\n        additional_hostnames:\n          additionalHostnames,`,
  "V318_DOMAIN_OWNERSHIP_ANCHOR_MISSING",
);
if (!handler.includes("worker-domain-dns-verified") || !handler.includes("public_dns_verified: active")) throw new Error("V318_DOMAIN_HANDLER_MARKERS_MISSING");
await writeFile(handlerFile, handler);

let panel = await readFile(panelFile, "utf8");
panel = replaceRequired(
  panel,
  `function activeDomain(domain) {\n  return domain?.status === "active" && domain?.provider_status === "active" && domain?.ssl_status === "active";\n}`,
  `function activeDomain(domain) {\n  const providerReady = domain?.status === "active" && domain?.provider_status === "active" && domain?.ssl_status === "active";\n  if (!providerReady) return false;\n  if (domain?.provider !== "cloudflare-full-zone") return true;\n  return domain?.ownership_verification?.public_dns_verified === true\n    && domain?.ownership_verification?.provisioning_state === "worker-domain-dns-verified";\n}`,
  "V318_DOMAIN_PANEL_ACTIVE_ANCHOR_MISSING",
);
if (!panel.includes("worker-domain-dns-verified") || !panel.includes("public_dns_verified === true")) throw new Error("V318_DOMAIN_PANEL_MARKERS_MISSING");
await writeFile(panelFile, panel);

console.log(`Validated ${RELEASE}: Full Zone active now requires public DNS resolution plus Worker Domain verification.`);
