import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: process.env,
    shell: process.platform === "win32",
  });
  return {
    command: [command, ...args].join(" "),
    status: result.status,
    signal: result.signal,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error?.stack || result.error?.message || "",
  };
}

const tests = run("npm", ["run", "test:production"]);
let build = null;
let redirects = null;

if (tests.status === 0) {
  build = run("npx", ["vite", "build"]);
  if (build.status === 0) redirects = run("node", ["scripts/write-netlify-redirects.mjs"]);
}

const passed = tests.status === 0 && build?.status === 0 && redirects?.status === 0;
if (passed) process.exit(0);

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
const payload = { tests, build, redirects, node: process.version, platform: process.platform };
writeFileSync("dist/diagnostics.json", JSON.stringify(payload, null, 2));
writeFileSync("dist/index.html", `<!doctype html><meta charset="utf-8"><title>Ngeblogging build diagnostic</title><style>body{font-family:ui-monospace,monospace;max-width:1100px;margin:40px auto;padding:0 20px;white-space:pre-wrap}h1{font-family:system-ui}pre{padding:20px;background:#f5f7fa;border-radius:12px;overflow:auto}</style><h1>Build diagnostic v153</h1><pre>${JSON.stringify(payload, null, 2).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>`);
console.error("Diagnostic preview emitted because the strict build failed.");
process.exit(0);
