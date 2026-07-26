const RELEASE = "studio-interaction-v49-20260726";
let frame = 0;
let userOpenedNara = false;
let closingUnexpectedLayer = false;

function textOf(node) {
  return String(node?.getAttribute?.("aria-label") || node?.getAttribute?.("title") || node?.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("id-ID");
}

function naraTrigger(target) {
  const control = target?.closest?.("button, a, [role='button']");
  if (!control) return null;
  if (control.matches(".nara-floating-button, .sn-nara-button, .ce-nara, [data-open-nara], [data-nara-open]")) return control;
  const label = textOf(control);
  if (/tutup|close|kecilkan|minimize|pulihkan|restore/.test(label)) return null;
  return /\bnara\b|assistant/.test(label) ? control : null;
}

function naraCloseControl(target) {
  const control = target?.closest?.("button, [role='button']");
  if (!control) return null;
  if (control.matches(".nara-assistant-backdrop")) return control;
  if (!control.closest(".nara-assistant-layer")) return null;
  return /tutup|close/.test(textOf(control)) ? control : null;
}

function blockSyntheticLauncher(event) {
  const launcher = event.target?.closest?.(".nara-floating-button");
  if (!launcher || event.isTrusted) return;
  launcher.dataset.autoOpenedV30 = "true";
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

document.addEventListener("click", (event) => {
  blockSyntheticLauncher(event);
  if (!event.isTrusted) return;
  if (naraCloseControl(event.target)) {
    userOpenedNara = false;
    document.documentElement.dataset.naraManualOpenV49 = "false";
    return;
  }
  if (naraTrigger(event.target)) {
    userOpenedNara = true;
    document.documentElement.dataset.naraManualOpenV49 = "true";
  }
}, true);

function markLaunchers() {
  document.querySelectorAll(".nara-floating-button").forEach((launcher) => {
    // studio-shell-v30 used this marker to avoid repeating its automatic click.
    // The launcher still opens normally for a real trusted user click.
    launcher.dataset.autoOpenedV30 = "true";
    launcher.dataset.manualOpenOnlyV49 = "true";
  });
}

function removeLegacyDomainSurface() {
  document.querySelectorAll(".dm-root, .dm-panel").forEach((node) => node.remove());
}

function closeUnexpectedNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  if (!layer || userOpenedNara || closingUnexpectedLayer) return;
  const close = [...layer.querySelectorAll("button")].find((button) => /tutup|close/.test(textOf(button)));
  if (!close) return;
  closingUnexpectedLayer = true;
  layer.dataset.unrequestedOpenV49 = "true";
  close.click();
  queueMicrotask(() => { closingUnexpectedLayer = false; });
}

function normalizeStudioHeaders() {
  document.querySelectorAll([
    ".sn-view-pad > .sn-page-title",
    ".op41-card > header",
    ".op41-domain > header",
    ".op41-domain > footer",
    ".sn-media-library > .sn-page-title",
  ].join(",")).forEach((node) => {
    node.dataset.normalFlowV49 = "true";
  });
}

function scan() {
  document.documentElement.dataset.studioInteractionV49 = RELEASE;
  document.documentElement.dataset.naraManualOpenV49 = String(userOpenedNara);
  markLaunchers();
  removeLegacyDomainSurface();
  normalizeStudioHeaders();
  closeUnexpectedNara();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "characterData")) schedule();
}).observe(document.documentElement, { childList:true, subtree:true, characterData:true });

window.addEventListener("resize", schedule, { passive:true });
window.addEventListener("orientationchange", schedule, { passive:true });
window.addEventListener("pageshow", schedule, { passive:true });
scan();
