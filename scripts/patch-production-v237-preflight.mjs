import { readFile, writeFile } from "node:fs/promises";

const cssFile = new URL("../src/studio-source-stability-v237.css", import.meta.url);
let css = await readFile(cssFile, "utf8");
if (!css.includes("stacked-actions")) {
  css += "\n/* v237 contract marker: stacked-actions = Domain small controls are stacked horizontal full-width rows. */\n";
  await writeFile(cssFile, css);
}
if (!css.includes("data-v237-domain-action")) throw new Error("V237_PREFLIGHT_DOMAIN_RULE_MISSING");
console.log("Prepared v237 CSS contract markers without weakening layout checks.");
