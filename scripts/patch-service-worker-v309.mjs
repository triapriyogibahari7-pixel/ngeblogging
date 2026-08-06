import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const runtimeFile = new URL("../src/studio-content-editor-responsive-v309.js", import.meta.url);
const cssFile = new URL("../src/studio-content-editor-responsive-v309.css", import.meta.url);
const editorFile = new URL("../src/ContentEditor.jsx", import.meta.url);
const releaseFile = new URL("../public/release-v309.json", import.meta.url);

const RELEASE = "studio-content-editor-responsive-v309-20260806";
const VERSION = "ngeblogging-app-v309-content-editor-20260806";
const CACHE = "studio-content-editor-cache-v309";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V309_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [native, runtime, css, editor, release] = await Promise.all([
  readFile(nativeFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(editorFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  RELEASE,
  'import("./studio-content-editor-responsive-v308.js")',
  'import("./studio-content-editor-responsive-v309.js")',
]) if (!native.includes(marker)) throw new Error(`V309_NATIVE_CHAIN_MISSING:${marker}`);

for (const marker of [RELEASE, "studio-content-editor-responsive-v309.css"])
  if (!runtime.includes(marker)) throw new Error(`V309_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "desktop-site, laptop, computer and large tablet",
  "grid-template-columns:minmax(0,1fr) var(--ce-v309-inspector)",
  "@media (min-width:821px) and (max-width:1080px)",
  "min-height:clamp(500px,55dvh,700px)",
  "html.editor-v266-small .ce-titlebar",
  "grid-template-areas:\"back file\" \"actions actions\"",
  "html.editor-v266-small .ce-workspace",
  "html.editor-v266-small .ce-sidebar",
  "overflow-x:auto",
]) if (!css.includes(marker)) throw new Error(`V309_RESPONSIVE_CSS_MISSING:${marker}`);

if (/ngeblogging-editor-nav-v266|ce-editor-side-v266|ce-editor-sidebar-toggle-v266/.test(css))
  throw new Error("V309_SIDEBAR_STYLE_SCOPE_REGRESSION");

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
]) if (!editor.includes(marker)) throw new Error(`V309_SHARED_EDITOR_CONTRACT_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  '"postsPagesSharedEditorPreserved": true',
  '"desktopDeadSpaceReduced": true',
  '"desktopSite980KeepsInspectorBesidePaper": true',
  '"mobileOneColumnEditor": true',
  '"sidebarStylesUntouched": true',
]) if (!release.includes(marker)) throw new Error(`V309_RELEASE_INVALID:${marker}`);

if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(runtime))
  throw new Error("V309_RUNTIME_CHURN_REGRESSION");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime))
  throw new Error("V309_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V308", "NGE_BLOGGING_UPDATE_AVAILABLE_V309")
  .replaceAll("service-worker-activated-content-editor-v308", "service-worker-activated-content-editor-v309");
source = upsert(source, "STUDIO_CONTENT_EDITOR_RELEASE_V309", `"${RELEASE}"`);
source = upsert(source, "ACTIVE_VERSION_V309", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V309", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V309}-${ACTIVE_CACHE_RELEASE_V309}-${STUDIO_CONTENT_EDITOR_RELEASE_V309}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_MEMBERS_CONTROLS_RELEASE_V307}-${STUDIO_SITE_SWITCHER_FIX_RELEASE_V306}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_SITE_SWITCHER_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V309}-${ACTIVE_CACHE_RELEASE_V309}-${STUDIO_CONTENT_EDITOR_RELEASE_V309}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_MEMBERS_CONTROLS_RELEASE_V307}-${STUDIO_SITE_SWITCHER_FIX_RELEASE_V306}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_SITE_SWITCHER_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

if (!source.includes(RELEASE) || !source.includes(VERSION) || !source.includes(CACHE)) throw new Error("V309_SW_MARKERS_MISSING");
if (!source.includes("studio-content-editor-responsive-v308-20260806") || !source.includes("studio-site-switch-first-site-v305-20260805"))
  throw new Error("V309_COMPAT_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V309_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
