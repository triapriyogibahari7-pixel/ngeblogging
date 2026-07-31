import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE = "studio-mobile-patch-v176-20260731";

function replaceOnce(source, anchor, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(anchor)) throw new Error(`PATCH_V176_${label}_ANCHOR_MISSING`);
  return source.replace(anchor, replacement);
}

const studioPath = resolve("src/StudioNext.jsx");
let studio = readFileSync(studioPath, "utf8");
studio = replaceOnce(
  studio,
  'import ApiKeysPanel from "./ApiKeysPanel.jsx";',
  'import ApiKeysPanel from "./ApiKeysPanel.jsx";\nimport MembersPanelV176 from "./MembersPanelV176.jsx";',
  "MEMBERS_IMPORT",
);
studio = replaceOnce(
  studio,
  '      {view === "members" && <MembersView site={site} user={user} profile={profile} setToast={setToast}/>} ',
  '      {view === "members" && <MembersPanelV176 site={site} user={user} profile={profile} setToast={setToast}/>} ',
  "MEMBERS_RENDER",
);
if (!studio.includes("MembersPanelV176") || !studio.includes("function MembersView")) {
  throw new Error("PATCH_V176_MEMBERS_FALLBACK_MISSING");
}
writeFileSync(studioPath, studio, "utf8");

const recoveryPath = resolve("src/studio-recovery-v150.js");
let recovery = readFileSync(recoveryPath, "utf8");
if (!recovery.includes("onboarding-check-v176")) {
  recovery = replaceOnce(
    recovery,
    "let onboardingBusy = false;",
    `let onboardingBusy = false;\nlet onboardingCheckPromise = null;\nlet onboardingCheckedAt = 0;\nlet onboardingResolvedUser = \"\";\nconst ONBOARDING_CHECK_RELEASE = \"onboarding-check-v176\";`,
    "ONBOARDING_STATE",
  );

  const start = recovery.indexOf("async function maybeShowOnboarding() {");
  const end = recovery.indexOf("\n\nasync function refreshSessionIfNeeded()", start);
  if (start < 0 || end < 0) throw new Error("PATCH_V176_ONBOARDING_FUNCTION_MISSING");
  const replacement = `function maybeShowOnboarding() {
  if (!supabaseConfigured || !supabase || !document.querySelector(".sn-shell") || document.querySelector(".sn-onboarding-layer-v150")) return Promise.resolve();
  if (onboardingResolvedUser) return Promise.resolve();
  if (onboardingCheckPromise) return onboardingCheckPromise;
  const now = Date.now();
  if (now - onboardingCheckedAt < 30_000) return Promise.resolve();
  onboardingCheckedAt = now;
  onboardingCheckPromise = (async () => {
    const sessionResult = await supabase.auth.getSession().catch(() => ({ data: {} }));
    const user = sessionResult.data?.session?.user;
    if (!user) return;
    if (safeGet(\`${ONBOARDING_PREFIX}\${user.id}\`) === "complete") {
      onboardingResolvedUser = user.id;
      return;
    }
    const sites = await listUserSites(user.id).catch(() => []);
    if (sites.length && !recentAutomaticSite(sites)) {
      safeSet(\`${ONBOARDING_PREFIX}\${user.id}\`, "complete");
      onboardingResolvedUser = user.id;
      return;
    }
    const baseName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Situs Saya";
    const defaultName = \`${baseName} — Ngeblogging\`;
    const defaultSlug = \`${slugify(baseName) || "situs"}-\${String(user.id).replaceAll("-", "").slice(0, 6)}\`;
    document.body.insertAdjacentHTML("beforeend", onboardingMarkup(defaultName, defaultSlug));
    const layer = document.querySelector(".sn-onboarding-layer-v150");
    if (!layer) return;
    onboardingResolvedUser = user.id;
    layer.dataset.onboardingCheckRelease = ONBOARDING_CHECK_RELEASE;
    layer.querySelectorAll("[data-blueprint]").forEach((button) => button.addEventListener("click", () => {
      layer.querySelectorAll("[data-blueprint]").forEach((node) => node.classList.toggle("active", node === button));
    }));
    const nameInput = layer.querySelector('[name="name"]');
    const slugInput = layer.querySelector('[name="slug"]');
    let slugTouched = false;
    slugInput.addEventListener("input", () => { slugTouched = true; slugInput.value = slugify(slugInput.value); });
    nameInput.addEventListener("input", () => { if (!slugTouched) slugInput.value = slugify(nameInput.value); });
    layer.querySelector("footer button").addEventListener("click", () => saveOnboarding(layer, user, sites));
  })().catch((error) => {
    console.error("Onboarding v176 check failed", error);
  }).finally(() => {
    onboardingCheckPromise = null;
  });
  return onboardingCheckPromise;
}`;
  recovery = `${recovery.slice(0, start)}${replacement}${recovery.slice(end)}`;
}
if (!recovery.includes("ONBOARDING_CHECK_RELEASE") || !recovery.includes("onboardingCheckPromise")) {
  throw new Error("PATCH_V176_ONBOARDING_INCOMPLETE");
}
writeFileSync(recoveryPath, recovery, "utf8");

console.log(`Studio mobile patch ${RELEASE} aktif.`);
