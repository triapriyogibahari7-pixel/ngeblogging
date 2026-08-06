import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const cssFile = new URL("../src/studio-content-editor-desktop-site-v310.css", import.meta.url);
const editorFile = new URL("../src/ContentEditor.jsx", import.meta.url);
const testFile = new URL("../tests/studio-content-editor-post-page-v309.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v310.json", import.meta.url);

const RELEASE = "studio-content-editor-desktop-site-v310-20260806";
const VERSION = "ngeblogging-app-v310-content-editor-20260806";
const CACHE = "studio-content-editor-cache-v310";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V310_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, editor, tests, release] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(editorFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  "studio-content-editor-responsive-v308.css",
  "studio-content-editor-post-page-polish-v309.css",
  "studio-content-editor-desktop-site-v310.css",
  RELEASE,
]) if (!runtime.includes(marker)) throw new Error(`V310_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "@media (min-width:820px) and (max-width:1080px)",
  "grid-template-columns:minmax(0,1fr) clamp(260px,29vw,300px)",
  "min-height:clamp(400px,44dvh,560px)",
  "html.editor-v266-small .ce-actions>button",
  "width:34px!important;height:34px!important",
  "overflow-x:auto",
]) if (!css.includes(marker)) throw new Error(`V310_RESPONSIVE_CSS_MISSING:${marker}`);

if (/#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.ce-editor-side-v266|\.ce-editor-sidebar-toggle-v266/.test(css))
  throw new Error("V310_SIDEBAR_STYLE_SCOPE_REGRESSION");

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
]) if (!editor.includes(marker)) throw new Error(`V310_SHARED_EDITOR_CONTRACT_MISSING:${marker}`);

for (const marker of [
  "v310 restores desktop composition for Android desktop-site and large tablets",
  "v309/v310 load after v308 and remain editor-only",
  "Posts and Pages still share the same ContentEditor implementation",
]) if (!tests.includes(marker)) throw new Error(`V310_TEST_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  '"postsPagesSharedEditorPreserved": true',
  '"desktopSite980InspectorBesidePaper": true',
  '"mobileActionsReadable": true',
  '"sidebarStylesUntouched": true',
  '"serviceWorkerCacheRotated": true',
]) if (!release.includes(marker)) throw new Error(`V310_RELEASE_INVALID:${marker}`);

if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(runtime))
  throw new Error("V310_RUNTIME_CHURN_REGRESSION");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime))
  throw new Error("V310_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V308", "NGE_BLOGGING_UPDATE_AVAILABLE_V310")
  .replaceAll("service-worker-activated-content-editor-v308", "service-worker-activated-content-editor-v310");
source = upsert(source, "STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310", `"${RELEASE}"`);
source = upsert(source, "ACTIVE_VERSION_V310", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V310", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V310}-${ACTIVE_CACHE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_MEMBERS_CONTROLS_RELEASE_V307}-${STUDIO_SITE_SWITCHER_FIX_RELEASE_V306}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_SITE_SWITCHER_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V310}-${ACTIVE_CACHE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_MEMBERS_CONTROLS_RELEASE_V307}-${STUDIO_SITE_SWITCHER_FIX_RELEASE_V306}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_SITE_SWITCHER_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

if (!source.includes(RELEASE) || !source.includes(VERSION) || !source.includes(CACHE)) throw new Error("V310_SW_MARKERS_MISSING");
if (!source.includes("studio-content-editor-responsive-v308-20260806") || !source.includes("studio-site-switch-first-site-v305-20260805"))
  throw new Error("V310_COMPAT_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V310_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
await import("./apply-studio-v311.mjs");
await import("./patch-service-worker-v311.mjs");
