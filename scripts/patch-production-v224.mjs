import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const runtime = 'import "./studio-production-v224.js";';
  const isolation = 'import "./studio-production-v224-action-isolation.js";';
  if (!source.includes(runtime)) {
    const anchor = 'import "./studio-production-v223.js";';
    if (!source.includes(anchor)) throw new Error("V224_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${runtime}`);
  }
  if (!source.includes(isolation)) source = source.replace(runtime, `${runtime}\n${isolation}`);
  await write(path, source);
}

await patchStudioEntry();
console.log("V224_DIAGNOSTIC_STAGE_1_STUDIO_IMPORTS");
