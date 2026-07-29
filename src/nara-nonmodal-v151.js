const RELEASE = "nara-nonmodal-v151-20260729";
let frame = 0;

function synchronizeNaraInteraction() {
  frame = 0;
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");

  if (!layer || !shell) {
    document.body.classList.remove("nara-nonmodal-open-v151", "nara-fullscreen-open-v151");
    document.documentElement.removeAttribute("data-nara-interaction-v151");
    return;
  }

  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize)
    ? shell.dataset.naraSize
    : "small";
  const modal = size === "full";
  layer.dataset.naraInteraction = size;
  layer.dataset.naraRelease = RELEASE;
  shell.dataset.naraRelease = RELEASE;
  layer.setAttribute("aria-modal", String(modal));
  document.documentElement.dataset.naraInteractionV151 = size;
  document.body.classList.toggle("nara-nonmodal-open-v151", !modal);
  document.body.classList.toggle("nara-fullscreen-open-v151", modal);

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.tabIndex = modal ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!modal));
    backdrop.disabled = !modal;
  }
}

function scheduleNaraInteraction() {
  if (frame) return;
  frame = requestAnimationFrame(synchronizeNaraInteraction);
}

new MutationObserver(scheduleNaraInteraction).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-nara-size"],
});
window.addEventListener("resize", scheduleNaraInteraction, { passive: true });
window.addEventListener("orientationchange", scheduleNaraInteraction, { passive: true });
window.addEventListener("pageshow", scheduleNaraInteraction, { passive: true });

scheduleNaraInteraction();

export { RELEASE, synchronizeNaraInteraction };
