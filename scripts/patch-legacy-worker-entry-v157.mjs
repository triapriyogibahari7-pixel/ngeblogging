import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const IMPORT_LINE = 'import { tryServeSystemShellV157 } from "../server/system-shell-authority-v157.mjs";';
const FETCH_SIGNATURE = "  async fetch(request, env, context) {";
const EARLY_RETURN = [
  FETCH_SIGNATURE,
  "    const systemShellV157 = await tryServeSystemShellV157(request, env);",
  "    if (systemShellV157) return systemShellV157;",
].join("\n");

const targets = [
  "cloudflare/worker.mjs",
  "cloudflare/worker-v22.mjs",
  "cloudflare/worker-v35.mjs",
  "cloudflare/worker-v37.mjs",
  "cloudflare/worker-v41.mjs",
];

for (const target of targets) {
  const path = resolve(target);
  if (!existsSync(path)) throw new Error(`Legacy Worker target tidak ditemukan: ${target}`);

  let source = readFileSync(path, "utf8");
  if (!source.includes(IMPORT_LINE)) source = `${IMPORT_LINE}\n${source}`;
  if (!source.includes("const systemShellV157 = await tryServeSystemShellV157")) {
    if (!source.includes(FETCH_SIGNATURE)) throw new Error(`Fetch authority tidak ditemukan: ${target}`);
    source = source.replace(FETCH_SIGNATURE, EARLY_RETURN);
  }
  writeFileSync(path, source, "utf8");
  console.log(`System shell v157 dipasang ke ${target}`);
}
