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

  if (/V180_STUDIO_BOOTSTRAP/.test(output.message)) output.classification = "studio-bootstrap";
  else if (/V180_CHOOSE_VIEW/.test(output.message)) output.classification = "choose-view";
  else if (/V180_DOMAIN|V180_COMMENTS/.test(output.message)) output.classification = "operational-loading";
  else if (/V180_AUTH|V180_PROVIDER/.test(output.message)) output.classification = "authentication";
  else if (/V180_STUDIO_ENTRY/.test(output.message)) output.classification = "studio-entry";
  else if (/V180_FORCED|V180_VERIFY/.test(output.message)) output.classification = "service-worker-or-verification";
  else if (output.message.startsWith("V180_")) output.classification = "other-v180";
  else if (/service worker v179|Navigasi paksa/i.test(output.message)) output.classification = "v179-service-worker";
  else output.classification = "other";
}

await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/v180-diagnostic.json", import.meta.url), JSON.stringify(output, null, 2));
await writeFile(new URL("../dist/index.html", import.meta.url), `<!doctype html><meta charset="utf-8"><title>v180 diagnostic</title><pre>${JSON.stringify(output, null, 2).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</pre>`);
console.log(JSON.stringify(output));

const expected = process.argv[2] || "";
if (expected && output.classification !== expected) process.exitCode = 1;
