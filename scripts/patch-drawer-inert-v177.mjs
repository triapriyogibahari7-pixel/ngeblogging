import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE = "drawer-inert-single-authority-v177-20260731";
const path = resolve("src/studio-platform-v160.js");
let source = readFileSync(path, "utf8");

const legacy = '  main.toggleAttribute("inert", mobileOpen);';
const replacement = '  main.removeAttribute("inert");\n  main.dataset.drawerInteractionV177 = mobileOpen ? "blocked-only-by-outside-backdrop" : "interactive";';

if (source.includes(legacy)) source = source.replace(legacy, replacement);
if (!source.includes('main.removeAttribute("inert")') || !source.includes("drawerInteractionV177")) {
  throw new Error("PATCH_DRAWER_INERT_V177_INCOMPLETE");
}

writeFileSync(path, source, "utf8");
console.log(`Drawer inert authority ${RELEASE} aktif.`);

/*
 * The v177 runner imports this module before applying its own synchronous patch.
 * beforeExit therefore runs only after v177 has completed. Child processes are
 * synchronous, so tests/build cannot begin while v179 is still being written.
 */
process.once("beforeExit", () => {
  execFileSync(process.execPath, [resolve("scripts/patch-production-studio-v179.mjs")], {
    cwd: resolve("."),
    stdio: "inherit",
  });
  execFileSync(process.execPath, [resolve("scripts/patch-v179-compat.mjs")], {
    cwd: resolve("."),
    stdio: "inherit",
  });
});
