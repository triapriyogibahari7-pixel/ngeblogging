import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const studioUrl = new URL("src/Studio.jsx", root);

export const RELEASE = "studio-v255-post-activator-order-v256-20260804";
const RUNTIME = "studio-shell-interaction-v255.js";
const STYLES = "studio-shell-interaction-v255.css";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeLiveImport(source, path) {
  const pattern = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  return source.replace(pattern, "");
}

export async function finalizeStudioV255Order() {
  let source = await readFile(studioUrl, "utf8");
  if (!source.includes('import "./studio-shell-nara-v253.css";')) {
    throw new Error("V256_V253_BASE_AUTHORITY_MISSING");
  }
  if (!source.includes(`import "./${RUNTIME}";`) || !source.includes(`import "./${STYLES}";`)) {
    throw new Error("V256_V255_SOURCE_AUTHORITY_MISSING");
  }

  source = removeLiveImport(source, RUNTIME);
  source = removeLiveImport(source, STYLES);
  const anchor = "export default StudioFastGate;";
  if (!source.includes(anchor)) throw new Error("V256_STUDIO_EXPORT_ANCHOR_MISSING");
  source = source.replace(
    anchor,
    `import "./${RUNTIME}";\nimport "./${STYLES}";\n\n${anchor}`,
  ).replace(/\n{3,}/g, "\n\n");

  const v253 = source.lastIndexOf('import "./studio-shell-nara-v253.css";');
  const v255Runtime = source.lastIndexOf(`import "./${RUNTIME}";`);
  const v255Styles = source.lastIndexOf(`import "./${STYLES}";`);
  if (!(v253 >= 0 && v255Runtime > v253 && v255Styles > v255Runtime)) {
    throw new Error("V256_V255_FINAL_ORDER_INVALID");
  }
  if ((source.match(new RegExp(escapeRegExp(`import "./${RUNTIME}";`), "g")) || []).length !== 1) {
    throw new Error("V256_V255_RUNTIME_DUPLICATE");
  }
  if ((source.match(new RegExp(escapeRegExp(`import "./${STYLES}";`), "g")) || []).length !== 1) {
    throw new Error("V256_V255_CSS_DUPLICATE");
  }

  await writeFile(studioUrl, source, "utf8");
  return { release: RELEASE, path: "src/Studio.jsx" };
}
