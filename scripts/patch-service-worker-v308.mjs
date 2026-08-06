import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const runtimeFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const cssFile = new URL("../src/studio-content-editor-responsive-v308.css", import.meta.url);
const editorFile = new URL("../src/ContentEditor.jsx", import.meta.url);
const releaseFile = new URL("../public/release-v308.json", import.meta.url);

const RELEASE = "studio-content-editor-responsive-v308-20260806";
const VERSION = "ngeblogging-app-v308-content-editor-20260806";
const CACHE = "studio-content-editor-cache-v308";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V308_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [native, runtime, css, editor, release] = await Promise.all([
  readFile(nativeFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(editorFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [RELEASE, 'import("./studio-content-editor-responsive-v308.js")'])
  if (!native.includes(marker)) throw new Error(`V308_NATIVE_CHAIN_MISSING:${marker}`);
for (const marker of [RELEASE, "studio-content-editor-responsive-v308.css"])
  if (!runtime.includes(marker)) throw new Error(`V308_RUNTIME_MISSING:${marker}`);
for (const marker of [
  "editor-v266-collapsed",
  "editor-v266-expanded",
  ":has(#ngeblogging-editor-nav-v266.collapsed)",
  "grid-template-columns:minmax(0,1fr) var(--ce-v308-inspector)",
  "min-height:clamp(540px,58dvh,760px)",
  "html.editor-v266-small .ce-titlebar",
  "grid-template-areas:\"back file\" \"actions actions\"",
  "html.editor-v266-small .ce-workspace",
  "html.editor-v266-small .ce-sidebar",
  "overflow-x:auto",
]) if (!css.includes(marker)) throw new Error(`V308_RESPONSIVE_CSS_MISSING:${marker}`);
for (const marker of [
  "export default function ContentEditor",
  "const isPage = doc.type === \"page\"",
  "className=\"ce-workspace\"",
  "className=\"ce-paper-shell\"",
  "className=\"ce-sidebar\"",
  "Preview",
  "Terbitkan",
  "SEO",
  "HTML",
]) if (!editor.includes(marker)) throw new Error(`V308_SHARED_EDITOR_CONTRACT_MISSING:${marker}`);
if (!release.includes(RELEASE) || !release.includes('"sidebarStylesUntouched": true') || !release.includes('"postsPagesSharedEditorPreserved": true'))
  throw new Error("V308_RELEASE_INVALID");
if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(runtime)) throw new Error("V308_RUNTIME_CHURN_REGRESSION");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime)) throw new Error("V308_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V307", "NGE_BLOGGING_UPDATE_AVAILABLE_V308")
  .replaceAll("service-worker-activated-switcher-members-v307", "service-worker-activated-content-editor-v308");
source = upsert(source, "STUDIO_CONTENT_EDITOR_RELEASE_V308", `"${RELEASE}"`);
source = upsert(source, "ACTIVE_VERSION_V308", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V308", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V308}-${ACTIVE_CACHE_RELEASE_V308}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_MEMBERS_CONTROLS_RELEASE_V307}-${STUDIO_SITE_SWITCHER_FIX_RELEASE_V306}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_SITE_SWITCHER_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V308}-${ACTIVE_CACHE_RELEASE_V308}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_MEMBERS_CONTROLS_RELEASE_V307}-${STUDIO_SITE_SWITCHER_FIX_RELEASE_V306}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_SITE_SWITCHER_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');
if (!source.includes(RELEASE) || !source.includes(VERSION) || !source.includes(CACHE)) throw new Error("V308_SW_MARKERS_MISSING");
if (!source.includes("ngeblogging-app-v305-site-switch-first-site-20260805") || !source.includes("studio-site-switch-first-site-cache-v305")) throw new Error("V308_V305_DEPLOY_COMPAT_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source)) throw new Error("V308_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
await import("./patch-service-worker-v310.mjs");
await import("./patch-service-worker-v311.mjs");
await import("./patch-studio-theme-members-domain-v312.mjs");
await import("./patch-nara-v313.mjs");
await import("./patch-domain-fullzone-v314.mjs");
await import("./patch-studio-content-editor-v316.mjs");
await import("./patch-public-custom-domain-client-v317.mjs");
await import("./patch-studio-final-v317.mjs");
