import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const result = spawnSync("npm", ["run", "build"], {
  encoding: "utf8",
  env: process.env,
  maxBuffer: 20 * 1024 * 1024,
});

const stdout = String(result.stdout || "");
const stderr = String(result.stderr || "");
const tail = (value, limit = 80000) => value.length > limit ? value.slice(-limit) : value;

await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
const diagnostic = {
  release: "studio-production-v228-green-editor-nara-20260803",
  exitCode: result.status,
  signal: result.signal || null,
  success: result.status === 0,
  stdout: tail(stdout),
  stderr: tail(stderr),
};
await writeFile(new URL("../dist/v228-diagnostic.json", import.meta.url), JSON.stringify(diagnostic, null, 2));

if (result.status !== 0) {
  await writeFile(new URL("../dist/index.html", import.meta.url), `<!doctype html><meta charset="utf-8"><title>v228 diagnostic</title><pre>Build diagnostic tersedia di /v228-diagnostic.json\nExit ${result.status}</pre>`);
}

console.log(result.status === 0 ? "V228_DIAGNOSTIC_BUILD_SUCCEEDED" : `V228_DIAGNOSTIC_CAPTURED_EXIT_${result.status}`);
process.exit(0);