import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const studioUrl = new URL("src/Studio.jsx", root);

export const RELEASE = "studio-final-activation-v256-20260804";
export const SHELL_INTERACTION_RELEASE = "studio-shell-interaction-v255-20260804";
export const THEME_LAYOUT_RELEASE = "studio-theme-layout-right4-v256-20260804";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureLastImport(source, path) {
  const live = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  source = source.replace(live, "");
  const anchor = "export default StudioFastGate;";
  if (!source.includes(anchor)) throw new Error(`V256_FINAL_IMPORT_ANCHOR_MISSING:${path}`);
  return source.replace(anchor, `import "./${path}";\n\n${anchor}`);
}

export async function activateStudioFinalV256() {
  let source = await readFile(studioUrl, "utf8");
  for (const path of [
    "studio-shell-interaction-v255.js",
    "studio-shell-interaction-v255.css",
    "studio-theme-layout-v256.js",
    "studio-theme-layout-v256.css",
  ]) source = ensureLastImport(source, path);
  source = source.replace(/\n{3,}/g, "\n\n");

  const v253 = source.indexOf('import "./studio-shell-nara-v253.css";');
  const v255js = source.indexOf('import "./studio-shell-interaction-v255.js";');
  const v255css = source.indexOf('import "./studio-shell-interaction-v255.css";');
  const v256js = source.indexOf('import "./studio-theme-layout-v256.js";');
  const v256css = source.indexOf('import "./studio-theme-layout-v256.css";');
  if (!(v253 >= 0 && v255js > v253 && v255css > v255js && v256js > v255css && v256css > v256js)) {
    throw new Error("V256_FINAL_STUDIO_AUTHORITY_ORDER_INVALID");
  }

  await writeFile(studioUrl, source, "utf8");
  return {
    release: RELEASE,
    shellInteractionRelease: SHELL_INTERACTION_RELEASE,
    themeLayoutRelease: THEME_LAYOUT_RELEASE,
  };
}