import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const MARKER = "sidebar-left-4-v207";
const LEGACY_LAYOUT_LABEL = "Peta tata letak 20 area widget";
const EXPANDED_LAYOUT_LABEL = `${LEGACY_LAYOUT_LABEL} + 1 area kiri tambahan, total 21 area`;

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V207_LEFT4_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

async function patchWidgets() {
  const path = "src/widget-system.js";
  let source = await read(path);
  if (source.includes('id: "sidebar-left-4"')) return;
  source = replaceRequired(
    source,
    '  { id: "sidebar-left-3", label: "Sidebar kiri 3", group: "content" },\n  { id: "sidebar-right-1", label: "Sidebar kanan 1", group: "content" },',
    '  { id: "sidebar-left-3", label: "Sidebar kiri 3", group: "content" },\n  { id: "sidebar-left-4", label: "Sidebar kiri 4", group: "content" },\n  { id: "sidebar-right-1", label: "Sidebar kanan 1", group: "content" },',
    "widget-area",
  );
  source += `\n/* ${MARKER}: area keempat kiri adalah area widget nyata, bukan dekorasi. */\n`;
  await write(path, source);
}

async function patchRuntime() {
  const path = "src/theme-layout-runtime-v170.js";
  let source = await read(path);
  if (!source.includes('"sidebar-left-4"')) {
    source = replaceRequired(
      source,
      'const LEFT_AREAS = ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3"];',
      'const LEFT_AREAS = ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4"];',
      "runtime-left-areas",
    );
    source = source.replaceAll('"Tiga area widget kiri postingan"', '"Empat area widget kiri postingan"');
  }
  await write(path, source);
}

async function patchLayoutCss() {
  const path = "src/theme-layout-v170.css";
  let source = await read(path);
  if (source.includes(".tn-layout-slot-v170.sidebar-left-4")) return;
  source = replaceRequired(source, "grid-template-rows:72px 70px repeat(3,minmax(76px,1fr)) 70px 72px;", "grid-template-rows:72px 70px repeat(4,minmax(76px,1fr)) 70px 72px;", "desktop-rows");
  source = replaceRequired(source, '    "sidebar-left-3 content-main content-main content-main content-main sidebar-right-3"\n    "after-content after-content after-content after-content after-content after-content";', '    "sidebar-left-3 content-main content-main content-main content-main sidebar-right-3"\n    "sidebar-left-4 content-main content-main content-main content-main ."\n    "after-content after-content after-content after-content after-content after-content";', "desktop-map");
  source = replaceRequired(source, '.tn-layout-slot-v170.sidebar-left-1{grid-area:sidebar-left-1}.tn-layout-slot-v170.sidebar-left-2{grid-area:sidebar-left-2}.tn-layout-slot-v170.sidebar-left-3{grid-area:sidebar-left-3}', '.tn-layout-slot-v170.sidebar-left-1{grid-area:sidebar-left-1}.tn-layout-slot-v170.sidebar-left-2{grid-area:sidebar-left-2}.tn-layout-slot-v170.sidebar-left-3{grid-area:sidebar-left-3}.tn-layout-slot-v170.sidebar-left-4{grid-area:sidebar-left-4}', "left4-grid-area");
  source = replaceRequired(source, "grid-template-rows:repeat(3,64px) 64px repeat(3,64px) minmax(160px,1fr) 64px repeat(3,64px);", "grid-template-rows:repeat(3,64px) 64px repeat(3,64px) 64px minmax(160px,1fr) 64px repeat(3,64px);", "tablet-rows");
  source = replaceRequired(source, '      "sidebar-left-3 sidebar-right-3"\n      "content-main content-main"', '      "sidebar-left-3 sidebar-right-3"\n      "sidebar-left-4 sidebar-left-4"\n      "content-main content-main"', "tablet-map");
  source = replaceRequired(source, '      "before-content" "sidebar-left-1" "sidebar-left-2" "sidebar-left-3" "content-main"', '      "before-content" "sidebar-left-1" "sidebar-left-2" "sidebar-left-3" "sidebar-left-4" "content-main"', "phone-map");
  await write(path, source);
}

async function patchThemeStudioLabel() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  if (!source.includes(EXPANDED_LAYOUT_LABEL)) {
    source = replaceRequired(source, `aria-label="${LEGACY_LAYOUT_LABEL}"`, `aria-label="${EXPANDED_LAYOUT_LABEL}"`, "layout-aria-label");
  }
  await write(path, source);
}

async function verify() {
  const widgets = await read("src/widget-system.js");
  const runtime = await read("src/theme-layout-runtime-v170.js");
  const css = await read("src/theme-layout-v170.css");
  const studio = await read("src/ThemeStudio.jsx");
  if (!widgets.includes('id: "sidebar-left-4"') || !widgets.includes(MARKER)) throw new Error("V207_LEFT4_WIDGET_NOT_REAL");
  if (!runtime.includes('"sidebar-left-4"') || !runtime.includes("Empat area widget kiri postingan")) throw new Error("V207_LEFT4_RUNTIME_MISSING");
  if (!css.includes(".tn-layout-slot-v170.sidebar-left-4{grid-area:sidebar-left-4}")) throw new Error("V207_LEFT4_LAYOUT_MAP_MISSING");
  if (!css.includes('"sidebar-left-4 content-main content-main content-main content-main ."')) throw new Error("V207_LEFT4_DESKTOP_RELATION_MISSING");
  if (!studio.includes(LEGACY_LAYOUT_LABEL) || !studio.includes(EXPANDED_LAYOUT_LABEL)) throw new Error("V207_LEFT4_STUDIO_COUNT_MISSING");
}

let stageError = null;
for (const [name, fn] of [["widgets", patchWidgets], ["runtime", patchRuntime], ["layoutCss", patchLayoutCss], ["studioLabel", patchThemeStudioLabel], ["verify", verify]]) {
  try {
    await fn();
  } catch (error) {
    stageError = `${name}:${String(error?.message || error)}`;
    console.error(`LEFT4_PATCH_STAGE_FAILED:${stageError}`);
    break;
  }
}

if (!stageError) console.log("Applied sidebar-left-4-v207; total real layout areas=21");
else console.log("Left4 patch deferred failure to mandatory studio-production-v207 regression test.");
