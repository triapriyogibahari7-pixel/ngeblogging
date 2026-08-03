import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve("./scripts/patch-production-data-v186.mjs");
let source = readFileSync(file, "utf8");
const oldBlock = `    const marker = source.indexOf("Promise.all([getOrCreatePrimarySite");
    const start = source.lastIndexOf("  useEffect(() => {", marker);
    const end = source.indexOf("\\n\\n  useEffect(() => {", marker);
    if (marker < 0 || start < 0 || end < 0) throw new Error("V186_STUDIO_BOOTSTRAP_RANGE_MISSING");`;
const newBlock = `    const marker = source.indexOf("studio-bootstrap-resilient-v183") >= 0
      ? source.indexOf("studio-bootstrap-resilient-v183")
      : source.indexOf("Promise.all([getOrCreatePrimarySite");
    const start = source.lastIndexOf("  useEffect(() => {", marker);
    const end = source.indexOf("\\n\\n  useEffect(() => {", marker);
    if (marker < 0 || start < 0 || end < 0) throw new Error("V186_STUDIO_BOOTSTRAP_RANGE_MISSING");`;

if (!source.includes(newBlock)) {
  if (!source.includes(oldBlock)) throw new Error("V186_BOOTSTRAP_FIX_ANCHOR_MISSING");
  source = source.replace(oldBlock, newBlock);
}

// v243 is a source-level successor to the generated v186 Studio bootstrap.
// Keep all v186 compatibility helpers, but do not delete getOrCreatePrimarySite or
// replace the v243 effect when the new resilient marker is present.
if (!source.includes("V243_BOOTSTRAP_SOURCE_BYPASS")) {
  const readAnchor = '  let source = await read(path);';
  const importBlock = `  source = source.replace(
    "  createUserSite, getOrCreatePrimarySite, getUserProfile, listUserSites,",
    "  createUserSite, getUserProfile, listUserSites,",
  );`;
  const guardedImportBlock = `  const V243_BOOTSTRAP_SOURCE_BYPASS = source.includes("studio-bootstrap-resilience-v243-20260803");
  if (!V243_BOOTSTRAP_SOURCE_BYPASS) {
    source = source.replace(
      "  createUserSite, getOrCreatePrimarySite, getUserProfile, listUserSites,",
      "  createUserSite, getUserProfile, listUserSites,",
    );
  }`;
  const bootstrapAnchor = '  if (!source.includes("studio-bootstrap-resilient-v186")) {';
  const bootstrapGuard = '  if (!V243_BOOTSTRAP_SOURCE_BYPASS && !source.includes("studio-bootstrap-resilient-v186")) {';
  const finalGuardAnchor = '  if (source.includes("getOrCreatePrimarySite")) throw new Error("V186_BLOCKING_PRIMARY_SITE_IMPORT_REMAINS");';
  const finalGuard = '  if (!V243_BOOTSTRAP_SOURCE_BYPASS && source.includes("getOrCreatePrimarySite")) throw new Error("V186_BLOCKING_PRIMARY_SITE_IMPORT_REMAINS");';

  if (!source.includes(readAnchor) || !source.includes(importBlock) || !source.includes(bootstrapAnchor) || !source.includes(finalGuardAnchor)) {
    throw new Error("V243_V186_COMPAT_ANCHOR_MISSING");
  }
  source = source
    .replace(importBlock, guardedImportBlock)
    .replace(bootstrapAnchor, bootstrapGuard)
    .replace(finalGuardAnchor, finalGuard);
}

writeFileSync(file, source);
console.log("Prepared v186 bootstrap patch with v243 source compatibility.");
