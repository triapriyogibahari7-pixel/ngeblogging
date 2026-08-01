import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

mkdirSync("dist", { recursive: true });
const result = spawnSync(process.execPath, ["--test", "tests/studio-real-device-v190.test.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: process.env,
});
const report = [
  `status=${result.status}`,
  `signal=${result.signal || ""}`,
  "--- stdout ---",
  result.stdout || "",
  "--- stderr ---",
  result.stderr || "",
].join("\n");
writeFileSync("dist/v190-test-log.txt", report, "utf8");
writeFileSync("dist/index.html", '<!doctype html><meta charset="utf-8"><title>v190 test diagnostic</title><a href="/v190-test-log.txt">v190 test log</a>', "utf8");
console.log(`Captured v190 test status ${result.status}`);
