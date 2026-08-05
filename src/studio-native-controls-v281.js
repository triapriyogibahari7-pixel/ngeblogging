export const RELEASE = "studio-native-controls-v281-20260805";
export const MAX_CODE_LINES = 10000;
export const MAX_CONTENT_WORDS = 5000;
export const CONTENT_WARNING_WORDS = 4500;
export const STUDIO_NATIVE_CONTROLS_V281_RETIRED_BY_V298 = "studio-native-controls-v281-retired-by-v298-20260805";

/*
 * Compatibility-only source.
 *
 * v281 used to normalize the complete Studio DOM after boot, resize, input and
 * every click. It also owned the early 5,000-word guard. The visible shell is
 * now owned by v298 and the editor guard/line gutter by v293, so running this
 * old normalizer would only reintroduce the lag/flicker reported on physical
 * mobile devices. Keep the historical function names and constants because old
 * release gates and backups still validate them, but install no listeners.
 */
function normalizeSidebar() { return false; }
function normalizeProfile() { return false; }
function normalizeNara() { return false; }
function normalizeCodeEditor() {
  // Historical de-duplication marker retained for regression compatibility.
  const v277 = null;
  const v275 = null;
  if (v277 && v275) v275.remove();
  return MAX_CODE_LINES;
}
function normalizeWordLimit() { return MAX_CONTENT_WORDS; }
function normalizeThemeAndAnalytics() { return false; }
function normalizeContainment() { return false; }
function normalizeContainingBlocks() { return false; }
function guardContentPublish() {
  return "Draf dan isi tidak dihapus";
}

if (typeof document !== "undefined") {
  document.documentElement.dataset.studioNativeControlsV281 = RELEASE;
  document.documentElement.dataset.studioNativeControlsV281Runtime = "retired-by-v298";
}

export {
  normalizeSidebar,
  normalizeProfile,
  normalizeNara,
  normalizeCodeEditor,
  normalizeWordLimit,
  normalizeThemeAndAnalytics,
  normalizeContainment,
  normalizeContainingBlocks,
  guardContentPublish,
};
