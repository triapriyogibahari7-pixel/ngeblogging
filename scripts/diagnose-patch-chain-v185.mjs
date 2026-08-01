import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

for (const step of [
  "./patch-auth-callback-v162.mjs",
  "./patch-content-editor-v162.mjs",
  "./patch-studio-content-v161.mjs",
  "./run-patch-theme-layout-v170.mjs",
  "./run-patch-mobile-public-v171.mjs",
  "./run-patch-mobile-interaction-v174.mjs",
  "./run-patch-mobile-stability-v176.mjs",
  "./patch-studio-mobile-v176.mjs",
  "./patch-nara-native-v177.mjs",
  "./run-patch-screenshot-stability-v177.mjs",
  "./patch-service-worker-v179.mjs",
]) await import(step);

const tests = [
  "tests/mobile-stability-v176.test.mjs",
  "tests/studio-mobile-stability-v176.test.mjs",
  "tests/members-v176.test.mjs",
  "tests/studio-layout-model-v176.test.mjs",
  "tests/studio-screenshot-stability-v177.test.mjs",
  "tests/auth-readiness-v177.test.mjs",
  "tests/studio-finalization-v178.test.mjs",
  "tests/studio-mobile-runtime-v179.test.mjs",
  "tests/studio-mobile-hardening-v181.test.mjs",
  "tests/studio-production-v183.test.mjs",
  "tests/studio-source-v185.test.mjs",
];
const result = spawnSync(process.execPath, ["--test", ...tests], { cwd: process.cwd(), stdio: "inherit", env: process.env });
if (result.status !== 0) process.exit(result.status || 1);
await mkdir("dist", { recursive: true });
await writeFile("dist/index.html", "<!doctype html><html><body><h1>REGRESSIONS_V176_V185_OK</h1></body></html>", "utf8");
