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

const result = spawnSync(process.execPath, ["--test", "tests/studio-production-sync-v151.test.mjs"], { cwd: process.cwd(), stdio: "inherit", env: process.env });
if (result.status !== 0) process.exit(result.status || 1);
await mkdir("dist", { recursive: true });
await writeFile("dist/index.html", "<!doctype html><html><body><h1>STUDIO_PRODUCTION_SYNC_V151_OK</h1></body></html>", "utf8");
