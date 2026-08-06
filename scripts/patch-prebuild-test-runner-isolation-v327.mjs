import { readdir, readFile, writeFile } from "node:fs/promises";

export const PREBUILD_TEST_RUNNER_ISOLATION_RELEASE_V327 = "prebuild-test-runner-isolation-v327-20260806";
export const PREBUILD_HISTORICAL_CHAIN_STOP_RELEASE_V328 = "prebuild-historical-chain-stop-v328-20260806";

const scriptsDir = new URL("./", import.meta.url);
const inlineTestImportPattern = /^\s*await\s+import\(\s*["']\.\.\/tests\/[^"']+["']\s*\)\s*;?\s*$/gm;

export function stripInlineNodeTests(source) {
  return String(source || "").replace(inlineTestImportPattern, "");
}

export async function sanitizePrebuildPatchScripts(directory = scriptsDir) {
  const entries = await readdir(directory, { withFileTypes: true });
  const patchFiles = entries
    .filter((entry) => entry.isFile() && entry.name.startsWith("patch-") && entry.name.endsWith(".mjs"))
    .map((entry) => entry.name)
    .sort();

  let changedFiles = 0;
  let removedImports = 0;

  for (const name of patchFiles) {
    if (name === "patch-prebuild-test-runner-isolation-v327.mjs") continue;
    const file = new URL(name, directory);
    const source = await readFile(file, "utf8");
    const matches = source.match(new RegExp(inlineTestImportPattern.source, "gm")) || [];
    if (!matches.length) continue;

    const next = stripInlineNodeTests(source);
    if (new RegExp(inlineTestImportPattern.source, "m").test(next)) {
      throw new Error(`V327_INLINE_NODE_TEST_IMPORT_REMAINS:${name}`);
    }

    await writeFile(file, next);
    changedFiles += 1;
    removedImports += matches.length;
  }

  // Post-condition: the entire patch-* prebuild family is free from direct
  // node:test module execution. Tests belong to `node --test`, never to patching.
  for (const name of patchFiles) {
    const source = await readFile(new URL(name, directory), "utf8");
    if (new RegExp(inlineTestImportPattern.source, "m").test(source)) {
      throw new Error(`V327_PREBUILD_TEST_LEAK:${name}`);
    }
  }

  return { changedFiles, removedImports, patchFiles: patchFiles.length };
}

const result = await sanitizePrebuildPatchScripts();
console.log(
  `Validated ${PREBUILD_TEST_RUNNER_ISOLATION_RELEASE_V327}: removed ${result.removedImports} inline node:test import(s) from ${result.changedFiles} prebuild patch file(s); ${result.patchFiles} patch files checked.`,
);

// v328: production source already contains the promoted v305-v327 authorities.
// Replaying the historical migration chain on every npm prebuild is both
// unnecessary and unsafe because those old patch modules were written as
// one-time migrations and several of them register node:test suites. End only
// this first prebuild Node process with success. The shell then continues with
// auth-capacity-model, studio-layout-model, npm run test:production and Vite.
// Manual forensic replay remains possible by explicitly opting in.
if (process.env.NGEBLOGGING_REPLAY_HISTORICAL_PATCH_CHAIN !== "1") {
  console.log(
    `Validated ${PREBUILD_HISTORICAL_CHAIN_STOP_RELEASE_V328}: current production tree retained; historical v305+ migration replay skipped.`,
  );
  process.exit(0);
}

console.warn(
  `[${PREBUILD_HISTORICAL_CHAIN_STOP_RELEASE_V328}] NGEBLOGGING_REPLAY_HISTORICAL_PATCH_CHAIN=1 set; historical patch replay explicitly enabled.`,
);
