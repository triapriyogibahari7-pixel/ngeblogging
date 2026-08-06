import { readFile, writeFile } from "node:fs/promises";

const RELEASE = "studio-domain-fullzone-v314-20260806";
const MIGRATION_RELEASE = "domain-legacy-to-full-zone-v314-20260806";
const VERSION = "ngeblogging-app-v314-domain-fullzone-20260806";
const CACHE = "studio-domain-fullzone-cache-v314";
const V313_VERSION_COMPAT = "ngeblogging-app-v313-nara-nonmodal-20260806";
const V313_CACHE_COMPAT = "studio-nara-nonmodal-cache-v313";

const handlerFile = new URL("../server/domain-handler.mjs", import.meta.url);
const wranglerFile = new URL("../wrangler.production.jsonc", import.meta.url);
const panelFile = new URL("../src/DomainPanelV124.jsx", import.meta.url);
const releaseFile = new URL("../public/release-v314.json", import.meta.url);
const swFile = new URL("../public/sw.js", import.meta.url);

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V314_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

function replaceRequired(source, before, after, code) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(code);
  return source.replace(before, after);
}

let handler = await readFile(handlerFile, "utf8");
if (!handler.includes("DOMAIN_FULL_ZONE_MIGRATION_RELEASE_V314")) {
  handler = replaceRequired(
    handler,
    'const TERMINAL_FAILURES = new Set(["blocked", "deleted", "pending_deletion", "test_blocked", "test_failed"]);',
    'const TERMINAL_FAILURES = new Set(["blocked", "deleted", "pending_deletion", "test_blocked", "test_failed"]);\nconst DOMAIN_FULL_ZONE_MIGRATION_RELEASE_V314 = "domain-legacy-to-full-zone-v314-20260806";',
    "V314_HANDLER_RELEASE_ANCHOR_MISSING",
  );
}

handler = replaceRequired(
  handler,
  '  const existingDomain = existing?.[0] || null;\n\n  if (\n    existingDomain\n    && existingDomain.site_id !== siteId\n  ) {',
  '  const existingDomain = existing?.[0] || null;\n  const migratingLegacyDomain = Boolean(\n    existingDomain\n    && existingDomain.provider !== "cloudflare-full-zone"\n  );\n\n  if (\n    existingDomain\n    && existingDomain.site_id !== siteId\n  ) {',
  "V314_EXISTING_DOMAIN_ANCHOR_MISSING",
);

const mismatchBlock = `  if (\n    existingDomain?.provider_hostname_id\n    && existingDomain.provider\n    && existingDomain.provider !== "cloudflare-full-zone"\n  ) {\n    return response(\n      409,\n      {\n        code: "DOMAIN_PROVIDER_MISMATCH",\n        error: "Domain ini masih terhubung melalui provider lama.",\n      },\n      requestId,\n    );\n  }\n\n`;
if (handler.includes(mismatchBlock)) handler = handler.replace(mismatchBlock, "");

handler = replaceRequired(
  handler,
  '  const now = new Date().toISOString();\n\n  const domainState = {',
  '  const now = new Date().toISOString();\n\n  if (migratingLegacyDomain) {\n    await userJson(\n      env,\n      `sites?id=eq.${encodeURIComponent(siteId)}&custom_domain=eq.${encodeURIComponent(hostname)}`,\n      {\n        method: "PATCH",\n        prefer: "return=minimal",\n        body: JSON.stringify({\n          custom_domain: null,\n          updated_at: now,\n        }),\n      },\n    );\n  }\n\n  const domainState = {',
  "V314_DOMAIN_STATE_ANCHOR_MISSING",
);

handler = replaceRequired(
  handler,
  '      reused: Boolean(existingDomain) || zoneReused,\n      zone: zoneState,',
  '      reused: Boolean(existingDomain) || zoneReused,\n      migratedFromProvider: migratingLegacyDomain\n        ? existingDomain?.provider || "legacy"\n        : null,\n      migrationRelease: migratingLegacyDomain\n        ? DOMAIN_FULL_ZONE_MIGRATION_RELEASE_V314\n        : null,\n      zone: zoneState,',
  "V314_REGISTER_RESPONSE_ANCHOR_MISSING",
);

handler = replaceRequired(
  handler,
  '  await verifySiteManager(env, domain.site_id, user.id);\n\n  if (domain.provider === "cloudflare-full-zone") {',
  '  await verifySiteManager(env, domain.site_id, user.id);\n\n  if (\n    customDomainProvider(env) === "cloudflare-full-zone"\n    && domain.provider !== "cloudflare-full-zone"\n  ) {\n    return registerFullZoneDomain(\n      {\n        siteId: domain.site_id,\n        hostname: domain.hostname,\n      },\n      env,\n      user,\n      requestId,\n    );\n  }\n\n  if (domain.provider === "cloudflare-full-zone") {',
  "V314_REFRESH_MIGRATION_ANCHOR_MISSING",
);

for (const marker of [
  "DOMAIN_FULL_ZONE_MIGRATION_RELEASE_V314",
  "migratingLegacyDomain",
  'customDomainProvider(env) === "cloudflare-full-zone"',
  'domain.provider !== "cloudflare-full-zone"',
  "return registerFullZoneDomain(",
  "custom_domain: null",
  "migratedFromProvider",
]) if (!handler.includes(marker)) throw new Error(`V314_HANDLER_MARKER_MISSING:${marker}`);
if (handler.includes('code: "DOMAIN_PROVIDER_MISMATCH"')) throw new Error("V314_LEGACY_PROVIDER_MISMATCH_STILL_PRESENT");
if (!handler.includes("zoneState.active && attached") || !handler.includes("workerDomainsReady(workerDomains)")) throw new Error("V314_VERIFIED_ACTIVE_CONTRACT_MISSING");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(handler)) throw new Error("V314_DESTRUCTIVE_DOMAIN_RUNTIME");
await writeFile(handlerFile, handler);

const [wrangler, panel, release] = await Promise.all([
  readFile(wranglerFile, "utf8"),
  readFile(panelFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);
for (const marker of [
  '"CUSTOM_DOMAIN_PROVIDER": "cloudflare-full-zone"',
  '"PRODUCTION_ROUTE_AUTHORITY": "cloudflare-full-zone-authority-v314"',
  `"CUSTOM_DOMAIN_MIGRATION_RELEASE": "${MIGRATION_RELEASE}"`,
  '"keep_vars": true',
]) if (!wrangler.includes(marker)) throw new Error(`V314_WRANGLER_MISSING:${marker}`);
for (const marker of ["SUBDOMAIN GRATIS", "routing Worker sedang disinkronkan otomatis"])
  if (!panel.includes(marker)) throw new Error(`V314_DOMAIN_PANEL_COMPAT_MISSING:${marker}`);
for (const marker of [RELEASE, '"legacyDomainMigration": true', '"fakeActiveStatusAllowed": false', '"sidebarUntouched": true'])
  if (!release.includes(marker)) throw new Error(`V314_RELEASE_INVALID:${marker}`);

let sw = await readFile(swFile, "utf8");
sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V313", "NGE_BLOGGING_UPDATE_AVAILABLE_V314")
  .replaceAll("service-worker-activated-nara-nonmodal-v313", "service-worker-activated-domain-fullzone-v314");
sw = upsert(sw, "STUDIO_DOMAIN_FULLZONE_RELEASE_V314", `"${RELEASE}"`);
sw = upsert(sw, "STUDIO_NARA_NONMODAL_VERSION_COMPAT_V313", `"${V313_VERSION_COMPAT}"`);
sw = upsert(sw, "STUDIO_NARA_NONMODAL_CACHE_COMPAT_V313", `"${V313_CACHE_COMPAT}"`);
sw = upsert(sw, "ACTIVE_VERSION_V314", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V314", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V314}-${ACTIVE_CACHE_RELEASE_V314}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_FAST_ENTRY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V314}-${ACTIVE_CACHE_RELEASE_V314}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_FAST_ENTRY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');
for (const marker of [RELEASE, VERSION, CACHE, V313_VERSION_COMPAT, V313_CACHE_COMPAT, "STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312"])
  if (!sw.includes(marker)) throw new Error(`V314_SW_MARKER_MISSING:${marker}`);
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sw)) throw new Error("V314_DESTRUCTIVE_SW_BEHAVIOR");
await writeFile(swFile, sw);

console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
await import("../tests/studio-domain-fullzone-v314.test.mjs");
