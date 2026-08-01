import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const patchSteps = [
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
];
for (const step of patchSteps) await import(step);

const tests = [
  "tests/studio-interface-v147.test.mjs",
  "tests/studio-interface-v148.test.mjs",
  "tests/studio-interface-v149.test.mjs",
  "tests/studio-recovery-v150.test.mjs",
  "tests/studio-completion-v151.test.mjs",
  "tests/studio-production-sync-v151.test.mjs",
  "tests/studio-continuity-v152.test.mjs",
  "tests/auth-production-v153.test.mjs",
  "tests/production-entry-v154.test.mjs",
  "tests/netlify-production-publisher-v156.test.mjs",
  "tests/legacy-worker-entry-v157.test.mjs",
  "tests/release-v157-probe.test.mjs",
  "tests/auth-studio-route-v158.test.mjs",
  "tests/studio-ui-contract-v159.test.mjs",
  "tests/studio-pwa-v159.test.mjs",
  "tests/production-authority-v160.test.mjs",
  "tests/studio-platform-v160.test.mjs",
  "tests/studio-content-v161.test.mjs",
  "tests/studio-content-release-v161.test.mjs",
  "tests/auth-callback-v162.test.mjs",
  "tests/content-editor-v162.test.mjs",
  "tests/auth-editor-release-v162.test.mjs",
];

const result = spawnSync(process.execPath, ["--test", ...tests], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: process.env,
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status || 1);
await mkdir("dist", { recursive: true });
await writeFile("dist/index.html", "<!doctype html><html><body><h1>REGRESSION_GROUP_A_OK</h1></body></html>", "utf8");
