import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const guardFile = new URL("../src/studio-content-editor-final-v316.js", import.meta.url);
const editorFile = new URL("../src/ContentEditor.jsx", import.meta.url);
const studioFile = new URL("../src/StudioNext.jsx", import.meta.url);
const contentDataFile = new URL("../src/lib/content-data.js", import.meta.url);
const releaseFile = new URL("../public/release-v322.json", import.meta.url);

const RELEASE = "posts-pages-30000-v322-20260806";
const VERSION = "ngeblogging-app-v322-posts-pages-30000-20260806";
const CACHE = "posts-pages-30000-cache-v322";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V322_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [guard, editor, studio, contentData, release] = await Promise.all([
  readFile(guardFile, "utf8"),
  readFile(editorFile, "utf8"),
  readFile(studioFile, "utf8"),
  readFile(contentDataFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'CONTENT_WORD_LIMIT_RELEASE_V322 = "posts-pages-30000-v322-20260806"',
  "CONTENT_WORD_LIMIT_V316 = 30000",
  "CONTENT_WORD_WARNING_V316 = 27000",
  "30.000 kata",
  "Draf tetap aman dan tidak dipotong",
  "publishButton.disabled = over",
  "publishedOption.disabled = over",
]) if (!guard.includes(marker)) throw new Error(`V322_WORD_GUARD_MISSING:${marker}`);

for (const marker of [
  'const isPage = doc.type === "page"',
  "ce-paper",
  "ce-word-status",
  "Preview",
  "SEO",
]) if (!editor.includes(marker)) throw new Error(`V322_SHARED_EDITOR_REGRESSION:${marker}`);

for (const marker of [
  "<ContentEditor doc={active}",
  'active.type === "page" ? "pages" : "posts"',
]) if (!studio.includes(marker)) throw new Error(`V322_POST_PAGE_ROUTING_REGRESSION:${marker}`);

if (!contentData.includes('body_html = String(values.content).slice(0, 5_000_000)'))
  throw new Error("V322_CONTENT_STORAGE_CEILING_REGRESSION");

for (const marker of [
  RELEASE,
  '"publicationWordLimit": 30000',
  '"warningStartsAtWords": 27000',
  '"draftsAreNeverTrimmedByWordGuard": true',
  '"sharedEditorPreserved": true',
  '"sidebarUntouched": true',
]) if (!release.includes(marker)) throw new Error(`V322_RELEASE_INVALID:${marker}`);

if (/slice\([^\n]*30000|substring\([^\n]*30000/.test(guard)) throw new Error("V322_DRAFT_TRIMMING_REGRESSION");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(guard))
  throw new Error("V322_DESTRUCTIVE_EDITOR_BEHAVIOR");

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_DOMAIN_RELEASE_V321",
  "STUDIO_PRODUCTION_CUTOVER_RELEASE_V320",
  "STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319",
  "AUTH_CALLBACK_RECOVERY_RELEASE_V315",
]) if (!sw.includes(inherited)) throw new Error(`V322_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V321", "NGE_BLOGGING_UPDATE_AVAILABLE_V322")
  .replaceAll("service-worker-activated-studio-theme-domain-v321", "service-worker-activated-posts-pages-30000-v322");
sw = upsert(sw, "POSTS_PAGES_30000_RELEASE_V322", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V322", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V322", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V322}-${ACTIVE_CACHE_RELEASE_V322}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V322}-${ACTIVE_CACHE_RELEASE_V322}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "STUDIO_THEME_DOMAIN_RELEASE_V321"])
  if (!sw.includes(marker)) throw new Error(`V322_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: Posts and Pages now publish up to 30,000 words without trimming drafts.`);
await import("../tests/posts-pages-30000-v322.test.mjs");
await import("./patch-studio-production-polish-v323.mjs");
