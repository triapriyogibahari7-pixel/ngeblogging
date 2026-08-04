import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const studioUrl = new URL("src/Studio.jsx", root);

export const RELEASE = "studio-v260-post-build-order-20260804";
const RUNTIME = "studio-six-mode-authority-v259.js";
const STYLES = "studio-six-mode-authority-v259.css";
const HOTFIX = "studio-six-mode-authority-v259-hotfix.css";
const V260_RUNTIME = "studio-stability-v260.js";
const V260_STYLES = "studio-stability-v260.css";
const V257_RUNTIME = "studio-visual-native-v257.js";
const V257_STYLES = "studio-visual-native-v257.css";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeLiveImport(source, path) {
  const pattern = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  return source.replace(pattern, "");
}

export async function finalizeStudioV259Order() {
  let source = await readFile(studioUrl, "utf8");
  for (const required of [V257_RUNTIME, V257_STYLES, RUNTIME, STYLES, HOTFIX, V260_RUNTIME, V260_STYLES]) {
    if (!source.includes(`import "./${required}";`)) throw new Error(`V260_SOURCE_AUTHORITY_MISSING:${required}`);
  }

  for (const path of [RUNTIME, STYLES, HOTFIX, V260_RUNTIME, V260_STYLES]) source = removeLiveImport(source, path);
  const anchor = "export default StudioFastGate;";
  if (!source.includes(anchor)) throw new Error("V260_STUDIO_EXPORT_ANCHOR_MISSING");
  source = source
    .replace(anchor, `import "./${RUNTIME}";\nimport "./${STYLES}";\nimport "./${HOTFIX}";\nimport "./${V260_RUNTIME}";\nimport "./${V260_STYLES}";\n\n${anchor}`)
    .replace(/\n{3,}/g, "\n\n");

  const v257Runtime = source.lastIndexOf(`import "./${V257_RUNTIME}";`);
  const v257Styles = source.lastIndexOf(`import "./${V257_STYLES}";`);
  const runtime = source.lastIndexOf(`import "./${RUNTIME}";`);
  const styles = source.lastIndexOf(`import "./${STYLES}";`);
  const hotfix = source.lastIndexOf(`import "./${HOTFIX}";`);
  const v260Runtime = source.lastIndexOf(`import "./${V260_RUNTIME}";`);
  const v260Styles = source.lastIndexOf(`import "./${V260_STYLES}";`);
  if (!(v257Runtime >= 0 && v257Styles > v257Runtime && runtime > v257Styles && styles > runtime && hotfix > styles && v260Runtime > hotfix && v260Styles > v260Runtime)) {
    throw new Error("V260_FINAL_ORDER_INVALID");
  }
  for (const [path, code] of [[RUNTIME, "V259_RUNTIME"], [STYLES, "V259_CSS"], [HOTFIX, "V259_HOTFIX"], [V260_RUNTIME, "RUNTIME"], [V260_STYLES, "CSS"]]) {
    if ((source.match(new RegExp(escapeRegExp(`import "./${path}";`), "g")) || []).length !== 1) {
      throw new Error(`V260_${code}_DUPLICATE`);
    }
  }

  await writeFile(studioUrl, source, "utf8");
  return { release: RELEASE, path: "src/Studio.jsx" };
}