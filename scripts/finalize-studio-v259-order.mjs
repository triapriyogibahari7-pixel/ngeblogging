import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const studioUrl = new URL("src/Studio.jsx", root);

export const RELEASE = "studio-v259-post-build-order-20260804";
const RUNTIME = "studio-physical-shell-v259.js";
const STYLES = "studio-physical-shell-v259.css";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeLiveImport(source, path) {
  const pattern = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  return source.replace(pattern, "");
}

export async function finalizeStudioV259Order() {
  let source = await readFile(studioUrl, "utf8");
  for (const required of [
    'import "./studio-shell-interaction-v255.css";',
    'import "./studio-visual-native-v257.css";',
  ]) {
    if (!source.includes(required)) throw new Error(`V259_REQUIRED_AUTHORITY_MISSING:${required}`);
  }

  source = removeLiveImport(source, RUNTIME);
  source = removeLiveImport(source, STYLES);
  const anchor = "export default StudioFastGate;";
  if (!source.includes(anchor)) throw new Error("V259_STUDIO_EXPORT_ANCHOR_MISSING");
  source = source.replace(anchor, `import "./${RUNTIME}";\nimport "./${STYLES}";\n\n${anchor}`).replace(/\n{3,}/g, "\n\n");

  const v257 = source.lastIndexOf('import "./studio-visual-native-v257.css";');
  const runtime = source.lastIndexOf(`import "./${RUNTIME}";`);
  const styles = source.lastIndexOf(`import "./${STYLES}";`);
  if (!(v257 >= 0 && runtime > v257 && styles > runtime)) throw new Error("V259_FINAL_ORDER_INVALID");

  for (const path of [RUNTIME, STYLES]) {
    const count = (source.match(new RegExp(escapeRegExp(`import "./${path}";`), "g")) || []).length;
    if (count !== 1) throw new Error(`V259_IMPORT_COUNT_INVALID:${path}:${count}`);
  }

  await writeFile(studioUrl, source, "utf8");
  return { release: RELEASE, path: "src/Studio.jsx" };
}
