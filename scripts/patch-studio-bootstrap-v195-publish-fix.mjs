import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/StudioOnboardingGate.jsx", import.meta.url);
let source = await readFile(file, "utf8");
const RELEASE = "studio-bootstrap-v195-active-site-publish-fix";
const oldHead = 'function publishActiveSite(site) {\n  if (!site?.id || !site?.slug) return;';
const newHead = 'function publishActiveSite(site, userId = "") {\n  if (!site?.id || !site?.slug) return;\n  rememberActiveSiteV192(site, userId);\n  rememberActiveSiteV195(site, userId);';
const v192Head = 'function publishActiveSite(site, userId = "") {\n  if (!site?.id || !site?.slug) return;\n  rememberActiveSiteV192(site, userId);';

if (!source.includes("rememberActiveSiteV195(site, userId);")) {
  if (source.includes(oldHead)) {
    source = source.replace(oldHead, newHead);
  } else if (source.includes(v192Head)) {
    source = source.replace(v192Head, `${v192Head}\n  rememberActiveSiteV195(site, userId);`);
  } else {
    throw new Error("V195_ACTIVE_SITE_PUBLISH_ANCHOR_MISSING");
  }
}

if (!source.includes('function publishActiveSite(site, userId = "")')) {
  throw new Error("V195_ACTIVE_SITE_PUBLISH_SIGNATURE_MISSING");
}
if (!source.includes("rememberActiveSiteV192(site, userId);")) {
  throw new Error("V195_V192_SNAPSHOT_CALL_MISSING");
}
if (!source.includes("rememberActiveSiteV195(site, userId);")) {
  throw new Error("V195_V195_SNAPSHOT_CALL_MISSING");
}

await writeFile(file, source);
console.log(`Applied ${RELEASE}`);
