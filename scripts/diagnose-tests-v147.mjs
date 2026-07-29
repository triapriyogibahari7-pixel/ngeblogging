import { readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = new URL("../", import.meta.url);
const testsDir = new URL("../tests/", import.meta.url);
const publicReport = new URL("../public/v147-test-report.txt", import.meta.url);
const files = (await readdir(testsDir))
  .filter((name) => name.endsWith(".test.mjs"))
  .sort();

const lines = [
  `Studio v147 per-file test report`,
  `Generated: ${new Date().toISOString()}`,
  `Files: ${files.length}`,
  "",
];
let failures = 0;

for (const file of files) {
  const relative = path.posix.join("tests", file);
  const result = spawnSync(process.execPath, ["--test", relative], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
    timeout: 120_000,
  });
  const passed = result.status === 0;
  if (!passed) failures += 1;
  lines.push(`${passed ? "PASS" : "FAIL"} ${relative}`);
  if (!passed) {
    const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    lines.push(output.slice(-12000));
  }
  lines.push("");
}

lines.unshift(`Failures: ${failures}`);
await writeFile(publicReport, `${lines.join("\n")}\n`, "utf8");
console.log(`Diagnosis complete: ${failures} failing file(s). Report: public/v147-test-report.txt`);
