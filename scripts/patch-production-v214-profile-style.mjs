import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/StudioNext.jsx", import.meta.url);
let source = await readFile(file, "utf8");
const marker = 'import "./studio-production-v214-profile.css";';

if (!source.includes(marker)) {
  const anchor = 'import "./studio-recovery-v135.css";';
  if (!source.includes(anchor)) throw new Error("V214_PROFILE_STYLE_ANCHOR_MISSING");
  source = source.replace(anchor, `${anchor}\n${marker}`);
  await writeFile(file, source);
}

if (!source.includes(marker)) throw new Error("V214_PROFILE_STYLE_IMPORT_MISSING");
console.log("Applied studio-production-v214 profile style import");

await import("./patch-production-v214-profile-controller.mjs");
