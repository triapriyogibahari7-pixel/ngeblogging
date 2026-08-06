import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const themeFile = new URL("../src/ThemeStudio.jsx", import.meta.url);
const themeCssFile = new URL("../src/theme-studio-v311.css", import.meta.url);
const layoutFile = new URL("../src/studio-theme-layout-v311.js", import.meta.url);
const naraFile = new URL("../src/NaraAssistant.jsx", import.meta.url);
const naraCssFile = new URL("../src/nara-v311.css", import.meta.url);
const membersFile = new URL("../src/MembersPanelV176.jsx", import.meta.url);
const onboardingFile = new URL("../src/StudioOnboardingGate.jsx", import.meta.url);
const domainFile = new URL("../server/domain-handler-v112.mjs", import.meta.url);
const wranglerFile = new URL("../wrangler.production.jsonc", import.meta.url);
const testsFile = new URL("../tests/studio-v311-regression.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v311.json", import.meta.url);

const RELEASE = "studio-reliability-v311-20260806";
const VERSION = "ngeblogging-app-v311-studio-reliability-20260806";
const CACHE = "studio-reliability-cache-v311";
const V310_CACHE_COMPAT = "studio-content-editor-cache-v310";
const V310_VERSION_COMPAT = "ngeblogging-app-v310-content-editor-20260806";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V311_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [theme, themeCss, layout, nara, naraCss, members, onboarding, domain, wrangler, tests, release] = await Promise.all([
  readFile(themeFile, "utf8"), readFile(themeCssFile, "utf8"), readFile(layoutFile, "utf8"),
  readFile(naraFile, "utf8"), readFile(naraCssFile, "utf8"), readFile(membersFile, "utf8"),
  readFile(onboardingFile, "utf8"), readFile(domainFile, "utf8"), readFile(wranglerFile, "utf8"),
  readFile(testsFile, "utf8"), readFile(releaseFile, "utf8"),
]);

for (const marker of [
  "theme-code-editor-v311-20260806", "tn-code-line-numbers-v311", "10_000",
  "Aplikasi", "Handphone", "Perangkat kecil", "Situs desktop", "Komputer",
]) if (!theme.includes(marker)) throw new Error(`V311_THEME_EDITOR_MISSING:${marker}`);
for (const marker of ["grid-template-columns:minmax(0,1fr) minmax(0,1fr)", ".tn-code-preview-pane{order:1!important", ".tn-code-pane{order:2!important"])
  if (!themeCss.includes(marker)) throw new Error(`V311_THEME_CSS_MISSING:${marker}`);
for (const marker of ["studio-theme-layout-models-v311-20260806", "Editorial", "Portal"])
  if (!layout.includes(marker)) throw new Error(`V311_LAYOUT_MODEL_MISSING:${marker}`);
if (/MutationObserver|setInterval\s*\(/.test(layout)) throw new Error("V311_LAYOUT_RUNTIME_CHURN");

for (const marker of ["nara-v311.css", 'aria-modal={size === "full" ? "true" : "false"}', 'size === "full" && <button className="nara-assistant-backdrop"'])
  if (!nara.includes(marker)) throw new Error(`V311_NARA_MISSING:${marker}`);
for (const marker of ['data-nara-layer-size="small"', "pointer-events:none!important", "position:fixed!important"])
  if (!naraCss.includes(marker)) throw new Error(`V311_NARA_CSS_MISSING:${marker}`);

for (const marker of ["MoreHorizontal", "Owner", "Admin", "Editor", "Author", "Viewer", "transfer_site_owner_v311", "remove_site_member_v176"])
  if (!members.includes(marker)) throw new Error(`V311_MEMBERS_MISSING:${marker}`);
for (const marker of ["site = await createUserSiteWithPolicy(", "listUserSitesStartupV292(userId)", "so311-shell"])
  if (!onboarding.includes(marker)) throw new Error(`V311_ONBOARDING_MISSING:${marker}`);
if (/createUserSiteWithPolicy\([\s\S]{0,220}\), 15_000/.test(onboarding)) throw new Error("V311_FIRST_SITE_SHORT_TIMEOUT_REGRESSION");

for (const marker of ["migratedFromProvider", "domain-legacy-to-full-zone-v311-20260806", "DOMAIN_PROVIDER_MISMATCH"])
  if (!domain.includes(marker)) throw new Error(`V311_DOMAIN_MIGRATION_MISSING:${marker}`);
if (!wrangler.includes('"CUSTOM_DOMAIN_PROVIDER": "cloudflare-full-zone"')) throw new Error("V311_DOMAIN_PROVIDER_NOT_FULL_ZONE");
if (!tests.includes("Custom-domain v311 uses Full Zone")) throw new Error("V311_TESTS_MISSING");
for (const marker of [RELEASE, CACHE, '"themeCodeEditorLineNumbers": true', '"naraSmallMediumNonModal": true', '"legacyDomainMigration": true'])
  if (!release.includes(marker)) throw new Error(`V311_RELEASE_INVALID:${marker}`);

for (const source of [theme, layout, nara, members, onboarding, domain]) {
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
    throw new Error("V311_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V310", "NGE_BLOGGING_UPDATE_AVAILABLE_V311")
  .replaceAll("service-worker-activated-content-editor-v310", "service-worker-activated-studio-reliability-v311");
source = upsert(source, "STUDIO_RELIABILITY_RELEASE_V311", `"${RELEASE}"`);
source = upsert(source, "STUDIO_CONTENT_EDITOR_CACHE_COMPAT_V310", `"${V310_CACHE_COMPAT}"`);
source = upsert(source, "STUDIO_CONTENT_EDITOR_VERSION_COMPAT_V310", `"${V310_VERSION_COMPAT}"`);
source = upsert(source, "ACTIVE_VERSION_V311", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V311", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V311}-${ACTIVE_CACHE_RELEASE_V311}-${STUDIO_RELIABILITY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_MEMBERS_CONTROLS_RELEASE_V307}-${STUDIO_SITE_SWITCH_FIX_RELEASE_V306}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V311}-${ACTIVE_CACHE_RELEASE_V311}-${STUDIO_RELIABILITY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_MEMBERS_CONTROLS_RELEASE_V307}-${STUDIO_SITE_SWITCH_FIX_RELEASE_V306}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

if (!source.includes(RELEASE) || !source.includes(VERSION) || !source.includes(CACHE) || !source.includes(V310_CACHE_COMPAT) || !source.includes(V310_VERSION_COMPAT))
  throw new Error("V311_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V311_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
