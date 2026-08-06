import { readdir, readFile, writeFile } from "node:fs/promises";

export const PREBUILD_TEST_RUNNER_ISOLATION_RELEASE_V327 = "prebuild-test-runner-isolation-v327-20260806";
export const PREBUILD_MATERIALIZATION_RELEASE_V329 = "prebuild-materialization-v329-20260806";

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

  // Post-condition: every historical migration may validate source/test markers,
  // but no patch is allowed to execute node:test inside npm prebuild. The real
  // production test runner remains `node --test` after prebuild completes.
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

// v329 deliberately resumes the sanitized migration/materialization chain.
// The current repository keeps several promoted authorities as deterministic
// build-time patches (notably Theme v312/v325 and custom-domain DNS v321).
// v328 proved that stopping this chain made Cloudflare green while silently
// deploying the older unmaterialized Theme/Domain source. Do not exit here.
// `patch-service-worker-v304.mjs` now continues into v305+ with every direct
// patch-to-node:test import already removed by the sanitizer above.
console.log(
  `Validated ${PREBUILD_MATERIALIZATION_RELEASE_V329}: sanitized historical materialization chain enabled; Theme and Domain production authorities will be applied before tests and Vite/Wrangler build.`,
);
