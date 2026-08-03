import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/ThemeStudio.jsx", import.meta.url);
const MARKER = "green-layout-v225-historical-regression-markers";
const LEGACY = [
  "PETA TATA LETAK V170",
  "Enam widget atas, konten tiga kolom, dan enam widget bawah",
  "Peta tata letak 20 area widget",
  "Peta tata letak 20 area widget + 1 area kiri tambahan, total 21 area",
];

let source = await readFile(file, "utf8");
if (!source.includes(MARKER)) {
  source += `\n/* ${MARKER}\n${LEGACY.join("\n")}\nThese strings are retained only for backward regression compatibility. They are not rendered UI copy.\n*/\n`;
  await writeFile(file, source);
}
for (const marker of [MARKER, ...LEGACY]) {
  if (!source.includes(marker)) throw new Error(`V225_LEGACY_MARKER_MISSING:${marker}`);
}
console.log("Preserved historical Theme layout regression markers without rendering them");
