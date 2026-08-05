export const RELEASE = "nara-nonmodal-retired-v297-20260805";

export function synchronizeNaraInteraction() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("nara-nonmodal-open-v151", "nara-fullscreen-open-v151");
    document.documentElement.dataset.naraNonmodalLegacyV297 = "retired";
    return;
  }
  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize) ? shell.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  document.body.classList.toggle("nara-nonmodal-open-v151", !full);
  document.body.classList.toggle("nara-fullscreen-open-v151", full);
  document.documentElement.dataset.naraNonmodalLegacyV297 = RELEASE;
}

if (typeof document !== "undefined") {
  document.documentElement.dataset.naraLegacyObserverV297 = "retired";
  window.addEventListener("pageshow", synchronizeNaraInteraction, { passive:true });
  window.addEventListener("ngeblogging:studio-device-mode-change", synchronizeNaraInteraction);
}
