import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const studioUrl = new URL("src/Studio.jsx", root);

export const RELEASE = "studio-final-activation-v257-20260804";
export const SHELL_INTERACTION_RELEASE = "studio-shell-interaction-v255-20260804";
export const THEME_LAYOUT_RELEASE = "studio-theme-layout-right4-v257-20260804";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureLastImport(source, path) {
  const live = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  source = source.replace(live, "");
  const anchor = "export default StudioFastGate;";
  if (!source.includes(anchor)) throw new Error(`V257_FINAL_IMPORT_ANCHOR_MISSING:${path}`);
  return source.replace(anchor, `import "./${path}";\n\n${anchor}`);
}

export async function activateStudioFinalV257() {
  // Theme area migration runs at the end of the established production patch
  // chain. Vite only owns final import order, avoiding mutation of layout core
  // while the bundler is starting.
  let source = await readFile(studioUrl, "utf8");
  for (const path of [
    "studio-shell-interaction-v255.js",
    "studio-shell-interaction-v255.css",
    "studio-theme-layout-v257.js",
    "studio-theme-layout-v257.css",
  ]) source = ensureLastImport(source, path);
  source = source.replace(/\n{3,}/g, "\n\n");

  const v253 = source.indexOf('import "./studio-shell-nara-v253.css";');
  const v255js = source.indexOf('import "./studio-shell-interaction-v255.js";');
  const v255css = source.indexOf('import "./studio-shell-interaction-v255.css";');
  const v257js = source.indexOf('import "./studio-theme-layout-v257.js";');
  const v257css = source.indexOf('import "./studio-theme-layout-v257.css";');
  if (!(v253 >= 0 && v255js > v253 && v255css > v255js && v257js > v255css && v257css > v257js)) {
    throw new Error("V257_FINAL_STUDIO_AUTHORITY_ORDER_INVALID");
  }

  for (const path of [
    "studio-shell-interaction-v255.js",
    "studio-shell-interaction-v255.css",
    "studio-theme-layout-v257.js",
    "studio-theme-layout-v257.css",
  ]) {
    const count = (source.match(new RegExp(escapeRegExp(`import "./${path}";`), "g")) || []).length;
    if (count !== 1) throw new Error(`V257_FINAL_IMPORT_COUNT_INVALID:${path}:${count}`);
  }

  await writeFile(studioUrl, source, "utf8");
  return {
    release: RELEASE,
    shellInteractionRelease: SHELL_INTERACTION_RELEASE,
    themeLayoutRelease: THEME_LAYOUT_RELEASE,
  };
}
