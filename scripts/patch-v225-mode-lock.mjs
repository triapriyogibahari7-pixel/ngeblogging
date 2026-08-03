import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const RELEASE = "studio-mode-lock-v225-20260803";

async function patchV222ModeBounce() {
  const path = "src/studio-production-v222.js";
  let source = await readFile(fileUrl(path), "utf8");
  const marker = "V225_USER_DEVICE_MODE_PRESERVED";
  if (!source.includes(marker)) {
    const startMarker = '  if (root.dataset.studioDesktopSitePhone === "true") {';
    const endMarker = "\n}\n\nfunction normalizeLayout";
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    if (start < 0 || end < 0) throw new Error("V225_V222_MODE_REWRITE_RANGE_MISSING");
    const replacement = `  // ${marker}: legacy v222 may classify physical geometry, but it must not\n  // rewrite the mode explicitly selected by the user. Preview and Studio mode\n  // remain stable until the user changes them.\n  root.dataset.studioV222ModeLock = "v225-user-choice-preserved";`;
    source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
  }

  const normalizeStart = source.indexOf("function normalizeRoot()");
  const normalizeEnd = source.indexOf("function normalizeLayout", normalizeStart);
  const normalizeRoot = source.slice(normalizeStart, normalizeEnd);
  if (/studioResponsiveMode\s*=\s*"(?:phone|desktop)"/.test(normalizeRoot)) throw new Error("V225_V222_RESPONSIVE_REWRITE_REMAINS");
  if (/studioDeviceVariant\s*=\s*"(?:phone|desktop)"/.test(normalizeRoot)) throw new Error("V225_V222_VARIANT_REWRITE_REMAINS");
  await writeFile(fileUrl(path), source);
}

async function patchV223Overscaling() {
  const path = "src/studio-production-v223.js";
  let source = await readFile(fileUrl(path), "utf8");
  const oldLine = "  const uiScale = desktopSitePhone ? Math.min(3.2, Math.max(1, layoutWidth / Math.max(physicalWidth, 1))) : 1;";
  const newLine = "  const uiScale = 1; // v225: editor chrome never magnifies because a phone requested desktop preview.";
  if (source.includes(oldLine)) source = source.replace(oldLine, newLine);
  else if (!source.includes(newLine)) throw new Error("V225_V223_UI_SCALE_ANCHOR_MISSING");
  if (/const uiScale = desktopSitePhone \?/.test(source)) throw new Error("V225_V223_OVERSCALE_REMAINS");
  await writeFile(fileUrl(path), source);
}

await patchV222ModeBounce();
await patchV223Overscaling();
console.log(`Applied ${RELEASE}`);
