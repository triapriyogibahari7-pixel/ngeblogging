import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = new URL("../", import.meta.url);
const testsDir = new URL("../tests/", import.meta.url);
const pattern = process.argv[2] || ".*";
const invert = process.argv.includes("--invert");
const regex = new RegExp(pattern, "i");
const files = (await readdir(testsDir))
  .filter((name) => name.endsWith(".test.mjs"))
  .filter((name) => invert ? !regex.test(name) : regex.test(name))
  .sort();

if (!files.length) {
  console.error(`No test files matched ${pattern}${invert ? " (inverted)" : ""}`);
  process.exit(2);
}

let failures = 0;
for (const file of files) {
  const relative = path.posix.join("tests", file);
  console.log(`\n=== ${relative} ===`);
  const result = spawnSync(process.execPath, ["--test", relative], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    timeout: 120_000,
  });
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.status !== 0) failures += 1;
}

console.log(`Grouped result: ${files.length} files, ${failures} failures.`);
process.exit(failures ? 1 : 0);
