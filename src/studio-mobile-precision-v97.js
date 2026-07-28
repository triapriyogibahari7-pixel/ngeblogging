const RELEASE = "studio-mobile-precision-v97-20260728";

function textOf(node) {
  return (node?.textContent || "").replace(/\s+/g, " ").trim();
}

function copyComputedRow(reference, comments) {
  if (!(reference instanceof HTMLElement) || !(comments instanceof HTMLElement)) return;
  const style = getComputedStyle(reference);
  ["min-height","padding-top","padding-right","padding-bottom","padding-left","gap","border-radius","font-family","font-size","line-height","font-weight","color","text-align"].forEach((property) => {
    const value = style.getPropertyValue(property);
    if (value) comments.style.setProperty(property, value, "important");
  });
  comments.style.setProperty("position", "static", "important");
  comments.style.setProperty("inset", "auto", "important");
  comments.style.setProperty("display", "flex", "important");
  comments.style.setProperty("align-items", "center", "important");
  comments.style.setProperty("justify-content", "flex-start", "important");
  comments.style.setProperty("width", "100%", "important");
  comments.style.setProperty("min-width", "0", "important");
  comments.style.setProperty("margin", "0", "important");
  comments.style.setProperty("transform", "none", "important");
  comments.dataset.phoneRowV97 = "true";
  const refIcon = reference.querySelector("svg");
  const icon = comments.querySelector("svg");
  if (refIcon && icon) {
    const iconStyle = getComputedStyle(refIcon);
    icon.style.setProperty("width", iconStyle.width, "important");
    icon.style.setProperty("height", iconStyle.height, "important");
    icon.style.setProperty("flex", `0 0 ${iconStyle.width}`, "important");
    icon.style.setProperty("margin", "0", "important");
  }
}

function alignComments() {
  document.querySelectorAll(".sn-side > nav").forEach((nav) => {
    const reference = [...nav.querySelectorAll(":scope > button")].find((button) => !button.hidden && !/nara ai/i.test(textOf(button)));
    const comments = nav.querySelector(":scope > .sn-comments-nav-host-v93 > .sn-comments-nav-button-v93");
    copyComputedRow(reference, comments);
  });
}

async function copyActiveCode(workspace, button) {
  const textarea = workspace.querySelector(".tn-code-pane textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  try { await navigator.clipboard.writeText(textarea.value); }
  catch {
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }
  const original = button.textContent;
  button.textContent = "Tersalin";
  setTimeout(() => { button.textContent = original; }, 1400);
}

function installThemeTools(layer) {
  if (!(layer instanceof HTMLElement) || layer.dataset.mobileToolsV97 === "true") return;
  const workspace = layer.querySelector(".tn-code-workspace");
  const footer = layer.querySelector(".tn-modal > footer");
  if (!(workspace instanceof HTMLElement) || !(footer instanceof HTMLElement)) return;
  layer.dataset.mobileToolsV97 = "true";
  workspace.dataset.mobilePreviewV97 = "false";

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "tn-v97-tool tn-v97-copy";
  copy.textContent = "Salin";
  copy.addEventListener("click", () => copyActiveCode(workspace, copy));

  const preview = document.createElement("button");
  preview.type = "button";
  preview.className = "tn-v97-tool tn-v97-preview";
  preview.textContent = "Preview";
  preview.addEventListener("click", () => {
    const active = workspace.dataset.mobilePreviewV97 !== "true";
    workspace.dataset.mobilePreviewV97 = String(active);
    preview.classList.toggle("active", active);
    preview.textContent = active ? "Kembali ke kode" : "Preview";
  });

  const cancel = [...footer.querySelectorAll("button")].find((button) => /batal/i.test(textOf(button)));
  footer.insertBefore(copy, cancel || footer.firstChild);
  footer.insertBefore(preview, cancel || footer.firstChild);
}

function markLayout() {
  const layer = document.querySelector(".lb39-layer");
  const dialog = layer?.querySelector(":scope > .lb39-dialog");
  if (!(layer instanceof HTMLElement) || !(dialog instanceof HTMLElement)) return;
  layer.dataset.layoutPrecisionV97 = RELEASE;
  dialog.dataset.layoutDialogV97 = "true";
}

function sync() {
  document.documentElement.dataset.studioMobilePrecision = RELEASE;
  alignComments();
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    if (layer.querySelector(".tn-code-workspace")) installThemeTools(layer);
  });
  markLayout();
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

function start() {
  new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
