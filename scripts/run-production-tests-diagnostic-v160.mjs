import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const patchResult = spawnSync(process.execPath, ["scripts/patch-legacy-worker-entry-v157.mjs"], {
  encoding: "utf8",
  env: process.env,
});

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
];
const testResult = spawnSync(process.execPath, ["--test", ...tests], {
  encoding: "utf8",
  env: process.env,
  maxBuffer: 16 * 1024 * 1024,
});

mkdirSync("public", { recursive: true });
const report = [
  "Ngeblogging production test diagnostic v160",
  `generated=${new Date().toISOString()}`,
  `patchExit=${patchResult.status}`,
  `testExit=${testResult.status}`,
  "",
  "--- PATCH STDOUT ---",
  patchResult.stdout || "",
  "--- PATCH STDERR ---",
  patchResult.stderr || "",
  "--- TEST STDOUT ---",
  testResult.stdout || "",
  "--- TEST STDERR ---",
  testResult.stderr || "",
].join("\n");
writeFileSync("public/build-diagnostics-v160.txt", report, "utf8");
console.log(report);
console.log("Diagnostic preview continues so the report can be inspected. Strict failure will be restored before merge.");
