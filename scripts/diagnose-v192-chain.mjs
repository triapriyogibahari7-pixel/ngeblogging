import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

mkdirSync("dist", { recursive: true });
const result = spawnSync(process.execPath, ["scripts/patch-service-worker-v179.mjs"], {
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
writeFileSync("dist/diagnostic.txt", report, "utf8");
writeFileSync("dist/index.html", "<!doctype html><meta charset=utf-8><title>v192 diagnostic</title><pre>Open /diagnostic.txt</pre>", "utf8");
console.log(report);
// Deliberately return success only for this temporary PR diagnostic.
