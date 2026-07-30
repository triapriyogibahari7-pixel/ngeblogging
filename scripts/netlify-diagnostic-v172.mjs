import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const run = (command, args) => spawnSync(command, args, {
  encoding: "utf8",
  env: process.env,
  maxBuffer: 16 * 1024 * 1024,
});

mkdirSync("public", { recursive: true });
const tests = run("npm", ["run", "test:production"]);
const report = [
  "Ngeblogging v172 Deploy Preview regression diagnostic",
  `status=${tests.status}`,
  "--- stdout ---",
  tests.stdout || "",
  "--- stderr ---",
  tests.stderr || "",
].join("\n");
writeFileSync("public/v172-test-log.txt", report);
console.log(report);

const vite = run("npx", ["vite", "build"]);
process.stdout.write(vite.stdout || "");
process.stderr.write(vite.stderr || "");
if (vite.status !== 0) process.exit(vite.status || 1);

const redirects = run("node", ["scripts/write-netlify-redirects.mjs"]);
process.stdout.write(redirects.stdout || "");
process.stderr.write(redirects.stderr || "");
if (redirects.status !== 0) process.exit(redirects.status || 1);

console.log(`NETLIFY_DIAGNOSTIC_V172_TEST_STATUS=${tests.status}`);
