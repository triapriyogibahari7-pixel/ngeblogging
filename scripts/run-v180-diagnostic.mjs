import { mkdir, writeFile } from "node:fs/promises";

const output = {
  release: "production-recovery-v180-diagnostic",
  ok: false,
  classification: "unknown",
  name: "",
  message: "",
  stack: "",
  timestamp: new Date().toISOString(),
};

try {
  await import("./patch-service-worker-v179.mjs");
  output.ok = true;
  output.classification = "patch-success";
  output.message = "Patch v179/v180 diterapkan setelah urutan v177.";
} catch (error) {
  output.name = error?.name || "Error";
  output.message = error?.message || String(error);
  output.stack = String(error?.stack || "").slice(0, 12000);
  if (output.message.startsWith("V180_")) output.classification = "v180-anchor-or-verification";
  else if (/service worker v179|Navigasi paksa/i.test(output.message)) output.classification = "v179-service-worker";
  else output.classification = "other";
}

await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/v180-diagnostic.json", import.meta.url), JSON.stringify(output, null, 2));
await writeFile(new URL("../dist/index.html", import.meta.url), `<!doctype html><meta charset="utf-8"><title>v180 diagnostic</title><pre>${JSON.stringify(output, null, 2).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</pre>`);
console.log(JSON.stringify(output));

const expected = process.argv[2] || "";
if (expected && output.classification !== expected) process.exitCode = 1;
