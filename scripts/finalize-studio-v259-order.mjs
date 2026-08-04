import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const studioUrl = new URL("src/Studio.jsx", root);

export const RELEASE = "studio-v259-post-build-order-20260804";
const RUNTIME = "studio-six-mode-authority-v259.js";
const STYLES = "studio-six-mode-authority-v259.css";
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
  for (const required of [V257_RUNTIME, V257_STYLES, RUNTIME, STYLES]) {
    if (!source.includes(`import "./${required}";`)) throw new Error(`V259_SOURCE_AUTHORITY_MISSING:${required}`);
  }

  source = removeLiveImport(source, RUNTIME);
  source = removeLiveImport(source, STYLES);
  const anchor = "export default StudioFastGate;";
  if (!source.includes(anchor)) throw new Error("V259_STUDIO_EXPORT_ANCHOR_MISSING");
  source = source
    .replace(anchor, `import "./${RUNTIME}";\nimport "./${STYLES}";\n\n${anchor}`)
    .replace(/\n{3,}/g, "\n\n");

  const v257Runtime = source.lastIndexOf(`import "./${V257_RUNTIME}";`);
  const v257Styles = source.lastIndexOf(`import "./${V257_STYLES}";`);
  const runtime = source.lastIndexOf(`import "./${RUNTIME}";`);
  const styles = source.lastIndexOf(`import "./${STYLES}";`);
  if (!(v257Runtime >= 0 && v257Styles > v257Runtime && runtime > v257Styles && styles > runtime)) {
    throw new Error("V259_FINAL_ORDER_INVALID");
  }
  if ((source.match(new RegExp(escapeRegExp(`import "./${RUNTIME}";`), "g")) || []).length !== 1) {
    throw new Error("V259_RUNTIME_DUPLICATE");
  }
  if ((source.match(new RegExp(escapeRegExp(`import "./${STYLES}";`), "g")) || []).length !== 1) {
    throw new Error("V259_CSS_DUPLICATE");
  }

  await writeFile(studioUrl, source, "utf8");
  return { release: RELEASE, path: "src/Studio.jsx" };
}
