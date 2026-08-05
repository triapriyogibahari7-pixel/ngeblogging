export const RELEASE = "nara-size-authority-retired-v297-20260805";
const VALID_SIZES = new Set(["small", "medium", "full"]);
let speakingButton = null;

export function stopSpeech() {
  try { window.speechSynthesis?.cancel(); } catch { /* browser tanpa speech synthesis */ }
  if (speakingButton) {
    speakingButton.classList.remove("speaking");
    speakingButton.setAttribute("aria-pressed", "false");
    speakingButton = null;
  }
}

export function setSize(shell, size) {
  if (!(shell instanceof HTMLElement)) return;
  const normalized = VALID_SIZES.has(size) ? size : "small";
  const nativeButton = shell.querySelector(`.nara-native-size-controls-v149 button[data-size="${normalized}"],.nara-size-controls-v147 button[data-size="${normalized}"]`);
  if (nativeButton) {
    nativeButton.click();
    return;
  }
  shell.dataset.naraSize = normalized;
  const layer = shell.closest(".nara-assistant-layer");
  if (layer) layer.dataset.naraInteraction = normalized === "full" ? "modal" : "nonmodal";
}

export function enhanceNara() {
  document.documentElement.dataset.naraSizeAuthority = RELEASE;
  document.documentElement.dataset.naraLegacyObserverV297 = "retired";
}

if (typeof document !== "undefined") {
  enhanceNara();
  window.addEventListener("pageshow", enhanceNara, { passive:true });
  window.addEventListener("beforeunload", stopSpeech);
}
