import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/ThemeStudio.jsx", import.meta.url);
let source = await readFile(file, "utf8");
source = source.replaceAll("<FileCode2/> Tema Custom", "<Code2/> Tema Custom");
if (!source.includes("<Code2/> Tema Custom")) throw new Error("V209_THEME_CUSTOM_ICON_FIX_MISSING");
await writeFile(file, source);
console.log("Applied v209 Theme Custom compatibility icon");
