import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/studio-shell-controller-v147.js", import.meta.url);
let source = await readFile(file, "utf8");
const RELEASE = "studio-v214-separated-profile-controller";

if (!source.includes(RELEASE)) {
  const oldAction = `function runProfileAction(action) {
  closeProfileMenu();
  if (action === "profile" || action === "settings") {
    findStudioButton("Pengaturan")?.click();
    return;
  }
  if (action === "logout") findStudioButton("Keluar")?.click();
}`;
  const newAction = `function runProfileAction(action) {
  closeProfileMenu();
  // ${RELEASE}: Profil and Pengaturan are different destinations. Keep the
  // proven v147 dropdown/capture behavior, but bridge Profil into React v214.
  if (action === "profile") {
    window.dispatchEvent(new CustomEvent("ngeblogging:open-profile-v214"));
    return;
  }
  if (action === "settings") {
    findStudioButton("Pengaturan")?.click();
    return;
  }
  if (action === "logout") findStudioButton("Keluar")?.click();
}`;
  if (!source.includes(oldAction)) throw new Error("V214_PROFILE_CONTROLLER_ACTION_ANCHOR_MISSING");
  source = source.replace(oldAction, newAction);
  await writeFile(file, source);
}

for (const marker of [RELEASE, 'CustomEvent("ngeblogging:open-profile-v214")', 'action === "settings"']) {
  if (!source.includes(marker)) throw new Error(`V214_PROFILE_CONTROLLER_VERIFY_FAILED:${marker}`);
}
console.log(`Applied ${RELEASE}`);
