import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const result = spawnSync("npm", ["run", "build"], {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 40 * 1024 * 1024,
  env: process.env,
});

const output = [
  `exitCode=${result.status ?? "null"}`,
  `signal=${result.signal ?? ""}`,
  "",
  result.stdout || "",
  result.stderr || "",
  result.error ? `\nspawnError=${result.error.stack || result.error.message}` : "",
].join("\n");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

mkdirSync("dist", { recursive: true });
writeFileSync("dist/build-log.txt", output, "utf8");
writeFileSync("dist/index.html", `<!doctype html><meta charset="utf-8"><title>v185 build diagnostic</title><style>body{margin:0;padding:24px;background:#0d1729;color:#e8eef8;font:14px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>v185 build diagnostic</h1><pre>${escapeHtml(output)}</pre>`, "utf8");
console.log(`Diagnostic captured with exit code ${result.status ?? "unknown"}.`);
process.exit(0);
