import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/studio-shell-controller-v147.js", import.meta.url);
let source = await readFile(file, "utf8");
const RELEASE = "studio-v214-react-profile-authority";

if (!source.includes(RELEASE)) {
  const anchor = `  const avatar = event.target.closest(".sn-shell .sn-avatar");
  if (avatar) {`;
  const replacement = `  const avatar = event.target.closest(".sn-shell .sn-avatar");
  // ${RELEASE}: when StudioNext owns the profile menu, do not stop the React
  // click during capture phase. The historical v147 menu remains a fallback
  // only for shells that do not render .sn-profile-menu-wrap.
  if (avatar && !avatar.closest(".sn-profile-menu-wrap")) {`;
  if (!source.includes(anchor)) throw new Error("V214_PROFILE_CAPTURE_ANCHOR_MISSING");
  source = source.replace(anchor, replacement);
  await writeFile(file, source);
}

for (const marker of [RELEASE, '!avatar.closest(".sn-profile-menu-wrap")']) {
  if (!source.includes(marker)) throw new Error(`V214_PROFILE_CONTROLLER_VERIFY_FAILED:${marker}`);
}
console.log(`Applied ${RELEASE}`);
