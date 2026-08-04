import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

export const RELEASE = "studio-theme-layout-right4-v257-20260804";
const MARKER = "sidebar-right-4-v257";
const V207_DESKTOP_ROW = '"sidebar-left-4 content-main content-main content-main content-main ."';

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V257_RIGHT4_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

async function ensureHistoricalLeft4() {
  await import("./patch-sidebar-left4-v207.mjs");
}

async function patchWidgets() {
  const path = "src/widget-system.js";
  let source = await read(path);
  if (!source.includes('id: "sidebar-right-4"')) {
    source = replaceRequired(
      source,
      '  { id: "sidebar-right-3", label: "Sidebar kanan 3", group: "content" },\n  { id: "after-content", label: "Tepat di bawah postingan", group: "content" },',
      '  { id: "sidebar-right-3", label: "Sidebar kanan 3", group: "content" },\n  { id: "sidebar-right-4", label: "Sidebar kanan 4", group: "content" },\n  { id: "after-content", label: "Tepat di bawah postingan", group: "content" },',
      "widget-area",
    );
  }
  if (!source.includes(MARKER)) source += `\n/* ${MARKER}: area keempat kanan adalah area widget nyata dan tersimpan bersama konfigurasi tema. */\n`;
  await write(path, source);
}

async function patchRuntime() {
  const path = "src/theme-layout-runtime-v170.js";
  let source = await read(path);
  if (!source.includes('"sidebar-right-4"')) {
    source = replaceRequired(
      source,
      'const RIGHT_AREAS = ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3"];',
      'const RIGHT_AREAS = ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"];',
      "runtime-right-areas",
    );
  }
  source = source.replaceAll('"Tiga area widget kanan postingan"', '"Empat area widget kanan postingan"');
  await write(path, source);
}

async function patchLayoutCss() {
  const path = "src/theme-layout-v170.css";
  let source = await read(path);

  if (!source.includes(".tn-layout-slot-v170.sidebar-right-4{grid-area:sidebar-right-4}")) {
    source = replaceRequired(
      source,
      '.tn-layout-slot-v170.sidebar-right-1{grid-area:sidebar-right-1}.tn-layout-slot-v170.sidebar-right-2{grid-area:sidebar-right-2}.tn-layout-slot-v170.sidebar-right-3{grid-area:sidebar-right-3}',
      '.tn-layout-slot-v170.sidebar-right-1{grid-area:sidebar-right-1}.tn-layout-slot-v170.sidebar-right-2{grid-area:sidebar-right-2}.tn-layout-slot-v170.sidebar-right-3{grid-area:sidebar-right-3}.tn-layout-slot-v170.sidebar-right-4{grid-area:sidebar-right-4}',
      "right4-grid-area",
    );
  }

  source = source.replace(
    V207_DESKTOP_ROW,
    '"sidebar-left-4 content-main content-main content-main content-main sidebar-right-4"',
  );
  source = source.replace(
    '"sidebar-left-4 sidebar-left-4"\n      "content-main content-main"',
    '"sidebar-left-4 sidebar-right-4"\n      "content-main content-main"',
  );
  source = source.replace(
    '"sidebar-right-1" "sidebar-right-2" "sidebar-right-3" "after-content"',
    '"sidebar-right-1" "sidebar-right-2" "sidebar-right-3" "sidebar-right-4" "after-content"',
  );
  if (!source.includes("v207 historical desktop relation")) {
    source += `\n/* v207 historical desktop relation retained for compatibility: ${V207_DESKTOP_ROW} */\n`;
  }

  await write(path, source);
}

async function verify() {
  const widgets = await read("src/widget-system.js");
  const runtime = await read("src/theme-layout-runtime-v170.js");
  const css = await read("src/theme-layout-v170.css");

  for (const marker of [
    'id: "sidebar-left-4"',
    'id: "sidebar-right-4"',
    MARKER,
  ]) if (!widgets.includes(marker)) throw new Error(`V257_RIGHT4_WIDGET_VERIFY_MISSING:${marker}`);

  if (!runtime.includes('const LEFT_AREAS = ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4"];')) throw new Error("V257_LEFT4_RUNTIME_LOST");
  if (!runtime.includes('const RIGHT_AREAS = ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"];')) throw new Error("V257_RIGHT4_RUNTIME_MISSING");
  if (!runtime.includes("Empat area widget kanan postingan")) throw new Error("V257_RIGHT4_RUNTIME_LABEL_MISSING");
  if (!css.includes(".tn-layout-slot-v170.sidebar-right-4{grid-area:sidebar-right-4}")) throw new Error("V257_RIGHT4_CSS_AREA_MISSING");
  if (!css.includes('"sidebar-left-4 content-main content-main content-main content-main sidebar-right-4"')) throw new Error("V257_RIGHT4_DESKTOP_PAIR_MISSING");
}

await ensureHistoricalLeft4();
await patchWidgets();
await patchRuntime();
await patchLayoutCss();
await verify();
console.log(`Applied ${RELEASE}; four-left + center + four-right are real widget areas.`);
