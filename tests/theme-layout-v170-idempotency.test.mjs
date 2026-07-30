import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const runner = read("scripts/run-patch-theme-layout-v170.mjs");
const packageJson = JSON.parse(read("package.json"));

const commands = [
  packageJson.scripts.predev,
  packageJson.scripts.test,
  packageJson.scripts["test:production"],
  packageJson.scripts["verify:v170"],
];

test("v170 uses an idempotent runner for dev, test, production test, and direct verification", () => {
  for (const command of commands) {
    assert.ok(command.includes("run-patch-theme-layout-v170.mjs"), `runner missing from ${command}`);
    assert.equal(command.includes("node scripts/patch-theme-layout-v170.mjs"), false, `unsafe direct patch remains in ${command}`);
  }
});

test("v170 runner refuses partial source state and verifies a complete patch", () => {
  for (const marker of [
    "presentCount === checks.length",
    "presentCount > 0",
    "keadaan parsial",
    'await import("./patch-theme-layout-v170.mjs")',
    "missingAfterPatch",
    "patch applied exactly once and verified",
  ]) assert.ok(runner.includes(marker), `idempotency marker missing: ${marker}`);
});

test("v170 runner covers every source mutated by the underlying patch", () => {
  for (const file of [
    "src/widget-system.js",
    "src/theme-system.js",
    "src/ThemeStudio.jsx",
    "src/StudioNext.jsx",
    "src/main.jsx",
    "src/pwa-runtime.js",
    "public/sw.js",
  ]) assert.ok(runner.includes(file), `runner does not guard ${file}`);
});
