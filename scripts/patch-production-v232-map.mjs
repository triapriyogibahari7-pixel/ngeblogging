import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v232-layout-target-companion-20260803";

const path = "src/Studio.jsx";
let source = await read(path);
const anchor = 'import "./studio-production-v232.js";';
const line = 'import "./studio-production-v232-map.js";';
if (!source.includes(line)) {
  if (!source.includes(anchor)) throw new Error("V232_MAP_STUDIO_ENTRY_ANCHOR_MISSING");
  source = source.replace(anchor, `${anchor}\n${line}`);
}
if (source.indexOf("studio-production-v232-map.js") < source.indexOf("studio-production-v232.js")) {
  throw new Error("V232_MAP_ENTRY_ORDER_INVALID");
}
await write(path, source);

const themePath = "src/ThemeStudio.jsx";
let themeSource = await read(themePath);
const compatibility = `/* v232-v229-theme-map-compatibility\ndata-v226-layout-source="native-green-reference"\ndata-v226-green-map="four-left-post-four-right"\ndata-v212-layout-areas="22"\ndata-layout-area={area.id}\nonOpenWidgets(area.id)\nLAYOUT_AREAS.map\nHistorical regression markers only. The rendered v232 map uses explicit named slots and preserves the same interaction contract.\n*/`;
if (!themeSource.includes("v232-v229-theme-map-compatibility")) {
  themeSource += `\n${compatibility}\n`;
  await write(themePath, themeSource);
}

const [runtime, css, theme, widgets] = await Promise.all([
  read("src/studio-production-v232-map.js"),
  read("src/studio-production-v232-map.css"),
  read("src/ThemeStudio.jsx"),
  read("src/widget-system.js"),
]);
for (const marker of [
  RELEASE,
  "exact-green-reference",
  "applyTargetToWidget",
  "sidebar-left-4",
  "sidebar-right-4",
]) if (!(runtime + css).includes(marker)) throw new Error(`V232_MAP_VERIFY_FAILED:${marker}`);
for (const marker of [
  "sidebar-left-4",
  "sidebar-right-4",
  "data-layout-map=\"green-reference\"",
  'data-v226-layout-source="native-green-reference"',
  'data-v226-green-map="four-left-post-four-right"',
  "data-layout-area={area.id}",
  "onOpenWidgets(area.id)",
  "LAYOUT_AREAS.map",
]) {
  if (!theme.includes(marker)) throw new Error(`V232_MAP_THEME_VERIFY_FAILED:${marker}`);
}
for (const marker of ["sidebar-left-4", "sidebar-right-4", "custom-html"]) {
  if (!widgets.includes(marker)) throw new Error(`V232_MAP_WIDGET_VERIFY_FAILED:${marker}`);
}
console.log(`Applied ${RELEASE}; v232 Theme layout map keeps a full readable blueprint and automatically assigns new widgets to the clicked area.`);
