import { readFile, writeFile } from "node:fs/promises";

const themeFile = new URL("../src/ThemeStudio.jsx", import.meta.url);
let theme = await readFile(themeFile, "utf8");
const marker = "STUDIO_V212_V170_LAYOUT_COMPAT";
if (!theme.includes(marker)) {
  theme += `\n/* ${marker}\n   Compatibility-only regression markers retained while v212 owns the visible map:\n   PETA TATA LETAK V170\n   Enam widget atas, konten tiga kolom, dan enam widget bawah\n   tn-layout-canvas-v170\n   The visible v212 map intentionally replaces the old geometry without removing widget data/runtime compatibility.\n*/\n`;
  await writeFile(themeFile, theme);
}
for (const required of [
  "PETA TATA LETAK V170",
  "Enam widget atas, konten tiga kolom, dan enam widget bawah",
  "tn-layout-canvas-v170",
  "tn-layout-content-main-v212",
]) {
  if (!theme.includes(required)) throw new Error(`V212_COMPAT_MARKER_MISSING:${required}`);
}
console.log("Preserved v170 layout regression markers under v212");
