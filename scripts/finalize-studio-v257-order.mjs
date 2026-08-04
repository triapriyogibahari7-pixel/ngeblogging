import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const studioUrl = new URL("src/Studio.jsx", root);

export const RELEASE = "studio-v257-post-build-order-20260804";
export const PHYSICAL_RELEASE_V259 = "studio-physical-shell-v259-20260804";
const RUNTIME = "studio-visual-native-v257.js";
const STYLES = "studio-visual-native-v257.css";
const PHYSICAL_RUNTIME = "studio-physical-shell-v259.js";
const PHYSICAL_STYLES = "studio-physical-shell-v259.css";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeLiveImport(source, path) {
  const pattern = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  return source.replace(pattern, "");
}

function importCount(source, path) {
  return (source.match(new RegExp(escapeRegExp(`import "./${path}";`), "g")) || []).length;
}

export async function finalizeStudioV257Order() {
  let source = await readFile(studioUrl, "utf8");
  if (!source.includes('import "./studio-shell-interaction-v255.css";')) {
    throw new Error("V257_REQUIRES_V255_AUTHORITY");
  }
  if (!source.includes(`import "./${RUNTIME}";`) || !source.includes(`import "./${STYLES}";`)) {
    throw new Error("V257_SOURCE_AUTHORITY_MISSING");
  }

  // One writer owns the final import block. v259 is deliberately appended by
  // the already-proven v257 finalizer instead of running a second Vite source
  // mutator. This keeps Theme preview authority separate from the physical
  // browser shell without allowing the two finalizers to race each other.
  for (const path of [RUNTIME, STYLES, PHYSICAL_RUNTIME, PHYSICAL_STYLES]) {
    source = removeLiveImport(source, path);
  }

  const anchor = "export default StudioFastGate;";
  if (!source.includes(anchor)) throw new Error("V257_STUDIO_EXPORT_ANCHOR_MISSING");
  source = source.replace(
    anchor,
    [
      `import "./${RUNTIME}";`,
      `import "./${STYLES}";`,
      `import "./${PHYSICAL_RUNTIME}";`,
      `import "./${PHYSICAL_STYLES}";`,
      "",
      anchor,
    ].join("\n"),
  ).replace(/\n{3,}/g, "\n\n");

  const v255 = source.lastIndexOf('import "./studio-shell-interaction-v255.css";');
  const runtime = source.lastIndexOf(`import "./${RUNTIME}";`);
  const styles = source.lastIndexOf(`import "./${STYLES}";`);
  const physicalRuntime = source.lastIndexOf(`import "./${PHYSICAL_RUNTIME}";`);
  const physicalStyles = source.lastIndexOf(`import "./${PHYSICAL_STYLES}";`);
  if (!(v255 >= 0 && runtime > v255 && styles > runtime)) throw new Error("V257_FINAL_ORDER_INVALID");
  if (!(physicalRuntime > styles && physicalStyles > physicalRuntime)) throw new Error("V259_PHYSICAL_ORDER_INVALID");

  if (importCount(source, RUNTIME) !== 1) throw new Error("V257_RUNTIME_DUPLICATE");
  if (importCount(source, STYLES) !== 1) throw new Error("V257_CSS_DUPLICATE");
  if (importCount(source, PHYSICAL_RUNTIME) !== 1) throw new Error("V259_RUNTIME_DUPLICATE");
  if (importCount(source, PHYSICAL_STYLES) !== 1) throw new Error("V259_CSS_DUPLICATE");

  await writeFile(studioUrl, source, "utf8");
  return {
    release: RELEASE,
    physicalReleaseV259: PHYSICAL_RELEASE_V259,
    path: "src/Studio.jsx",
  };
}
