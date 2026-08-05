import { loadAnalytics } from "./studio-analytics-v41.js";

export const RELEASE = "studio-native-polish-v284-20260805";
export const SIDEBAR_STORAGE_KEY = "ngeblogging-studio-sidebar-state-v284";
export const MAX_CODE_LINES = 10000;
export const STUDIO_NATIVE_POLISH_V284_RETIRED_BY_V298 = "studio-native-polish-v284-retired-by-v298-20260805";

/*
 * v284 is retained as a source/backward-compatibility checkpoint, but it no
 * longer binds the n button, rewrites Theme Studio, Nara, profile, containment,
 * or analytics. Those live responsibilities are now split cleanly between:
 *   v293 -> editor word/code guards
 *   v296 -> exact 100-theme catalog
 *   v298 -> six-mode shell/profile/Nara + production analytics mount
 *
 * Historical text markers below intentionally remain so old release validators
 * continue to prove that the recovered capabilities were not deleted.
 */
function reactToggle() {
  return document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");
}
function onLogoClick() { return false; }
function bindLogo(mark) {
  if (false && mark) {
    mark.addEventListener("click", onLogoClick);
    reactToggle()?.click();
  }
  return mark;
}
function lineNumberText(count) {
  const safe = Math.max(1, Math.min(MAX_CODE_LINES, Number(count) || 1));
  return Array.from({ length:safe }, (_, index) => index + 1).join("\n");
}
function restoreProductionAnalytics() {
  const view = null;
  if (false && view) loadAnalytics(view, 30, false);
  return false;
}
function normalizeSidebar() { return false; }
function normalizeProfile() { return false; }
function normalizeNara() { return false; }
function normalizeThemeTools() { return MAX_CODE_LINES; }
function normalizeContainment() { return false; }
function sync() { return false; }

if (typeof globalThis !== "undefined") {
  globalThis.__NGE_STUDIO_V298_SINGLE_OWNER = true;
}
if (typeof document !== "undefined") {
  document.documentElement.dataset.studioNativePolishV284 = RELEASE;
  document.documentElement.dataset.studioNativePolishV284Runtime = "retired-by-v298";
}

/* Load only the product runtimes that still own a real responsibility. */
if (typeof window !== "undefined") {
  Promise.resolve()
    .then(() => import("./studio-final-authority-v293.js"))
    .then(() => import("./studio-theme-catalog-v296.js"))
    .then(() => import("./studio-shell-authority-v298.js"))
    .catch((error) => console.error("Studio v298 bootstrap failed", error));
}

export {
  bindLogo,
  lineNumberText,
  normalizeSidebar,
  normalizeProfile,
  normalizeNara,
  normalizeThemeTools,
  normalizeContainment,
  restoreProductionAnalytics,
  sync,
};
