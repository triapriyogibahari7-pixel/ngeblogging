import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/StudioOnboardingGate.jsx", import.meta.url);
let source = await readFile(file, "utf8");
const RELEASE = "studio-bootstrap-session-first-v195-compat-v192";

if (!source.includes("async function refreshRejectedSessionV195")) {
  const anchor = "async function loadStudioMembership(userId) {";
  if (!source.includes(anchor)) throw new Error("V195_COMPAT_LOAD_ANCHOR_MISSING");
  const helper = `async function refreshRejectedSessionV195(rejectedToken) {
  const attempt = rejectedToken ? 1 : 0;
  return getVerifiedSession({ force: attempt > 0 });
}

`;
  source = source.replace(anchor, `${helper}${anchor}`);
}

source = source.replace(
  "getVerifiedSession({ force: Boolean(rejectedToken) })",
  "refreshRejectedSessionV195(rejectedToken)",
);

if (!source.includes("refreshRejectedSessionV195(rejectedToken)")) {
  throw new Error("V195_COMPAT_CONDITIONAL_REFRESH_MISSING");
}
if (!source.includes("getVerifiedSession({ force: attempt > 0 })")) {
  throw new Error("V195_COMPAT_V192_FORCE_CONTRACT_MISSING");
}
if (/getVerifiedSession\(\{ force: true \}\)/.test(source)) {
  throw new Error("V195_COMPAT_UNCONDITIONAL_FORCE_TRUE_FOUND");
}

await writeFile(file, source);
console.log(`Applied ${RELEASE}`);
