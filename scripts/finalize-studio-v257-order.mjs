import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const studioUrl = new URL("src/Studio.jsx", root);

export const RELEASE = "studio-v257-post-build-order-20260804";
const RUNTIME = "studio-visual-native-v257.js";
const STYLES = "studio-visual-native-v257.css";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeLiveImport(source, path) {
  const pattern = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  return source.replace(pattern, "");
}

export async function finalizeStudioV257Order() {
  let source = await readFile(studioUrl, "utf8");
  if (!source.includes('import "./studio-shell-interaction-v255.css";')) {
    throw new Error("V257_REQUIRES_V255_AUTHORITY");
  }
  if (!source.includes(`import "./${RUNTIME}";`) || !source.includes(`import "./${STYLES}";`)) {
    throw new Error("V257_SOURCE_AUTHORITY_MISSING");
  }

  source = removeLiveImport(source, RUNTIME);
  source = removeLiveImport(source, STYLES);
  const anchor = "export default StudioFastGate;";
  if (!source.includes(anchor)) throw new Error("V257_STUDIO_EXPORT_ANCHOR_MISSING");
  source = source.replace(anchor, `import "./${RUNTIME}";\nimport "./${STYLES}";\n\n${anchor}`).replace(/\n{3,}/g, "\n\n");

  const v255 = source.lastIndexOf('import "./studio-shell-interaction-v255.css";');
  const runtime = source.lastIndexOf(`import "./${RUNTIME}";`);
  const styles = source.lastIndexOf(`import "./${STYLES}";`);
  if (!(v255 >= 0 && runtime > v255 && styles > runtime)) throw new Error("V257_FINAL_ORDER_INVALID");
  if ((source.match(new RegExp(escapeRegExp(`import "./${RUNTIME}";`), "g")) || []).length !== 1) throw new Error("V257_RUNTIME_DUPLICATE");
  if ((source.match(new RegExp(escapeRegExp(`import "./${STYLES}";`), "g")) || []).length !== 1) throw new Error("V257_CSS_DUPLICATE");

  await writeFile(studioUrl, source, "utf8");
  return { release: RELEASE, path: "src/Studio.jsx" };
}
