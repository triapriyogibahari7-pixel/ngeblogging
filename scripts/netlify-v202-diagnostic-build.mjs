import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const chunks = [];
const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", (chunk) => {
    process.stdout.write(chunk);
    chunks.push(Buffer.from(chunk));
  });
}

const code = await new Promise((resolve) => child.on("close", resolve));
if (code === 0) process.exit(0);

await mkdir("dist", { recursive: true });
const text = Buffer.concat(chunks).toString("utf8");
await writeFile("dist/build-diagnostic.txt", text || `npm run build exited ${code}`);
await writeFile("dist/index.html", `<!doctype html><meta charset="utf-8"><title>Ngeblogging build diagnostic</title><pre>${(text || `npm run build exited ${code}`).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>`);
console.log(`V202_DIAGNOSTIC_CAPTURED_EXIT_${code}`);
process.exit(0);
