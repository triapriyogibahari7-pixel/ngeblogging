import { mkdir, writeFile } from "node:fs/promises";

const output = {
  release: "production-recovery-v180-diagnostic",
  ok: false,
  name: "",
  message: "",
  stack: "",
  timestamp: new Date().toISOString(),
};

try {
  await import("./patch-service-worker-v179.mjs");
  output.ok = true;
  output.message = "Patch v179/v180 diterapkan setelah urutan v177.";
} catch (error) {
  output.name = error?.name || "Error";
  output.message = error?.message || String(error);
  output.stack = String(error?.stack || "").slice(0, 12000);
}

await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/v180-diagnostic.json", import.meta.url), JSON.stringify(output, null, 2));
await writeFile(new URL("../dist/index.html", import.meta.url), `<!doctype html><meta charset="utf-8"><title>v180 diagnostic</title><pre>${JSON.stringify(output, null, 2).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</pre>`);
console.log(JSON.stringify(output));
