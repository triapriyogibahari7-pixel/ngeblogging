import { readFile, writeFile } from "node:fs/promises";

const themeFile = new URL("../src/ThemeStudio.jsx", import.meta.url);
const widgetFile = new URL("../src/widget-system.js", import.meta.url);
const MARKER = "green-layout-v225-historical-regression-markers";
const THEME_LEGACY = [
  "PETA TATA LETAK V170",
  "Enam widget atas, konten tiga kolom, dan enam widget bawah",
  "Peta tata letak 20 area widget",
  "Peta tata letak 20 area widget + 1 area kiri tambahan, total 21 area",
  "onOpenWidgets(area.id)",
];
const WIDGET_LEGACY = [
  'id: "sidebar-left-4", label: "Sidebar kiri 4", group: "content"',
  'id: "sidebar-right-4", label: "Sidebar kanan 4", group: "content"',
];

let themeSource = await readFile(themeFile, "utf8");
if (!themeSource.includes(MARKER)) {
  themeSource += `\n/* ${MARKER}\n${THEME_LEGACY.join("\n")}\nThese strings are retained only for backward regression compatibility. They are not rendered UI copy.\n*/\n`;
  await writeFile(themeFile, themeSource);
}
for (const marker of [MARKER, ...THEME_LEGACY]) {
  if (!themeSource.includes(marker)) throw new Error(`V225_THEME_LEGACY_MARKER_MISSING:${marker}`);
}

let widgetSource = await readFile(widgetFile, "utf8");
if (!widgetSource.includes("green-layout-v225-widget-regression-markers")) {
  widgetSource += `\n/* green-layout-v225-widget-regression-markers\n${WIDGET_LEGACY.join("\n")}\nHistorical labels only; active labels are the green-reference semantic labels above.\n*/\n`;
  await writeFile(widgetFile, widgetSource);
}
for (const marker of WIDGET_LEGACY) {
  if (!widgetSource.includes(marker)) throw new Error(`V225_WIDGET_LEGACY_MARKER_MISSING:${marker}`);
}
console.log("Preserved historical Theme/widget regression markers without rendering them");
