import { spawnSync } from "node:child_process";

const match = String(process.env.DIAG_MATCH || "");
const result = spawnSync(process.execPath, ["--test", "tests/studio-real-device-v190.test.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: process.env,
  maxBuffer: 20 * 1024 * 1024,
});
const combined = `${result.stdout || ""}\n${result.stderr || ""}`;
if (result.status === 0) process.exit(0);
if (match && new RegExp(match, "i").test(combined)) process.exit(0);
process.exit(1);
