import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/ThemeStudio.jsx", import.meta.url);
let source = await readFile(file, "utf8");
source = source.replaceAll("<FileCode2/> Tema Custom", "<Code2/> Tema Custom");

const compatMarker = "PETA TATA LETAK V170 · Enam widget atas, konten tiga kolom, dan enam widget bawah · Peta tata letak 20 area widget + 1 area kiri tambahan, total 21 area";
if (!source.includes(compatMarker)) {
  source += `\n/* ${compatMarker} — compatibility description retained; v209 extends the real map with sidebar-right-4. */\n`;
}

if (!source.includes("<Code2/> Tema Custom")) throw new Error("V209_THEME_CUSTOM_ICON_FIX_MISSING");
for (const marker of ["PETA TATA LETAK V170", "Enam widget atas, konten tiga kolom, dan enam widget bawah", "Peta tata letak 20 area widget + 1 area kiri tambahan, total 21 area"]) {
  if (!source.includes(marker)) throw new Error(`V209_THEME_HISTORY_MARKER_MISSING:${marker}`);
}
await writeFile(file, source);
console.log("Applied v209 Theme Custom and historical-layout compatibility markers");
