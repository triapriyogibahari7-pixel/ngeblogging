import { readFile, writeFile } from "node:fs/promises";

const RELEASE = "studio-nara-nonmodal-v313-20260806";
const VERSION = "ngeblogging-app-v313-nara-nonmodal-20260806";
const CACHE = "studio-nara-nonmodal-cache-v313";
const V312_VERSION_COMPAT = "ngeblogging-app-v312-theme-members-domain-20260806";
const V312_CACHE_COMPAT = "studio-theme-members-domain-cache-v312";
const naraFile = new URL("../src/NaraAssistant.jsx", import.meta.url);
const cssFile = new URL("../src/nara-v313.css", import.meta.url);
const releaseFile = new URL("../public/release-v313.json", import.meta.url);
const swFile = new URL("../public/sw.js", import.meta.url);

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V313_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

let nara = await readFile(naraFile, "utf8");
if (!nara.includes('import "./nara-v313.css";')) {
  const importAnchor = 'import { supabase, supabaseConfigured } from "./lib/supabase";';
  if (!nara.includes(importAnchor)) throw new Error("V313_NARA_IMPORT_ANCHOR_MISSING");
  nara = nara.replace(importAnchor, `${importAnchor}\nimport "./nara-v313.css";`);
}

const oldLayer = '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">';
const newLayer = '<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full" ? "true" : "false"} aria-label="Nara AI Assistant" data-nara-layer-size={size} data-nara-release-v313="studio-nara-nonmodal-v313-20260806">';
if (nara.includes(oldLayer)) nara = nara.replace(oldLayer, newLayer);
else if (!nara.includes('data-nara-layer-size={size}')) throw new Error("V313_NARA_LAYER_ANCHOR_MISSING");

const oldBackdrop = '<button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />';
const newBackdrop = '{size === "full" && <button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />}';
if (nara.includes(oldBackdrop)) nara = nara.replace(oldBackdrop, newBackdrop);
else if (!nara.includes('{size === "full" && <button className="nara-assistant-backdrop"')) throw new Error("V313_NARA_BACKDROP_ANCHOR_MISSING");

for (const marker of [
  'import "./nara-v313.css";',
  'aria-modal={size === "full" ? "true" : "false"}',
  'data-nara-layer-size={size}',
  'data-nara-release-v313="studio-nara-nonmodal-v313-20260806"',
  '{size === "full" && <button className="nara-assistant-backdrop"',
  '<Camera />', '<ImageIcon />', '<File />', '<Mic />', 'SpeakerIcon',
  'Nara Mini', 'Nara Writer', 'Nara Vision', 'Nara Max',
  'Instan', 'Sedang', 'Tinggi', 'Maksimal',
]) if (!nara.includes(marker)) throw new Error(`V313_NARA_MARKER_MISSING:${marker}`);
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(nara))
  throw new Error("V313_NARA_DESTRUCTIVE_RUNTIME");
await writeFile(naraFile, nara);

const [css, release] = await Promise.all([readFile(cssFile, "utf8"), readFile(releaseFile, "utf8")]);
for (const marker of [
  'data-nara-layer-size="small"',
  'data-nara-layer-size="medium"',
  'pointer-events:none!important',
  '.nara-assistant-shell',
  'position:fixed!important',
  'bottom:calc(100% + 8px)!important',
]) if (!css.includes(marker)) throw new Error(`V313_NARA_CSS_MISSING:${marker}`);
if (/#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|studio-sidebar/i.test(css)) throw new Error("V313_NARA_SIDEBAR_SCOPE_REGRESSION");
for (const marker of [RELEASE, '"smallNonModal": true', '"mediumNonModal": true', '"fullScreenModalOnly": true', '"sidebarUntouched": true'])
  if (!release.includes(marker)) throw new Error(`V313_RELEASE_INVALID:${marker}`);

let sw = await readFile(swFile, "utf8");
sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V312", "NGE_BLOGGING_UPDATE_AVAILABLE_V313")
  .replaceAll("service-worker-activated-theme-members-domain-v312", "service-worker-activated-nara-nonmodal-v313");
sw = upsert(sw, "STUDIO_NARA_NONMODAL_RELEASE_V313", `"${RELEASE}"`);
sw = upsert(sw, "STUDIO_THEME_MEMBERS_DOMAIN_VERSION_COMPAT_V312", `"${V312_VERSION_COMPAT}"`);
sw = upsert(sw, "STUDIO_THEME_MEMBERS_DOMAIN_CACHE_COMPAT_V312", `"${V312_CACHE_COMPAT}"`);
sw = upsert(sw, "ACTIVE_VERSION_V313", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V313", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V313}-${ACTIVE_CACHE_RELEASE_V313}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_FAST_ENTRY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V313}-${ACTIVE_CACHE_RELEASE_V313}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_FAST_ENTRY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');
for (const marker of [RELEASE, VERSION, CACHE, V312_VERSION_COMPAT, V312_CACHE_COMPAT, "STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312"])
  if (!sw.includes(marker)) throw new Error(`V313_SW_MARKER_MISSING:${marker}`);
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sw))
  throw new Error("V313_DESTRUCTIVE_SW_BEHAVIOR");
await writeFile(swFile, sw);

console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
await import("../tests/studio-nara-nonmodal-v313.test.mjs");
