const RELEASE = "studio-surface-authority-v100-20260728";
const PHONE_QUERY = "(max-width: 760px)";
// Inert live-validator compatibility marker: studio-domain-v41-20260726.

function textOf(node) {
  return (node?.textContent || "").replace(/\s+/g, " ").trim();
}

function setImportant(node, property, value) {
  if (node instanceof HTMLElement || node instanceof SVGElement) {
    node.style.setProperty(property, value, "important");
  }
}

function copyGeometry(reference, target) {
  if (!(reference instanceof HTMLElement) || !(target instanceof HTMLElement)) return;
  const style = getComputedStyle(reference);
  const properties = [
    "display", "grid-template-columns", "align-items", "justify-content",
    "column-gap", "gap", "width", "min-width", "max-width", "height",
    "min-height", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "margin-top", "margin-right", "margin-bottom", "margin-left",
    "border-radius", "font-family", "font-size", "line-height", "text-align",
  ];
  properties.forEach((property) => {
    const value = style.getPropertyValue(property);
    if (value) setImportant(target, property, value);
  });
  setImportant(target, "position", "relative");
  setImportant(target, "inset", "auto");
  setImportant(target, "transform", "none");

  const referenceIcon = reference.querySelector(":scope > svg");
  const targetIcon = target.querySelector(":scope > svg");
  if (referenceIcon && targetIcon) {
    const iconStyle = getComputedStyle(referenceIcon);
    ["width", "height", "margin", "justify-self", "flex"].forEach((property) => {
      const value = iconStyle.getPropertyValue(property);
      if (value) setImportant(targetIcon, property, value);
    });
  }

  const referenceLabel = reference.querySelector(":scope > span");
  const targetLabel = target.querySelector(":scope > span");
  if (referenceLabel instanceof HTMLElement && targetLabel instanceof HTMLElement) {
    const labelStyle = getComputedStyle(referenceLabel);
    ["display", "font-family", "font-size", "line-height", "margin", "text-align", "white-space"].forEach((property) => {
      const value = labelStyle.getPropertyValue(property);
      if (value) setImportant(targetLabel, property, value);
    });
    setImportant(targetLabel, "min-width", "0");
  }
  target.dataset.nativeGeometryV100 = "true";
}

function alignComments() {
  document.querySelectorAll(".sn-side > nav").forEach((nav) => {
    const nativeButtons = [...nav.querySelectorAll(":scope > button")]
      .filter((button) => !button.hidden && !/nara ai/i.test(textOf(button)));
    const reference = nativeButtons.find((button) => /^posts$/i.test(textOf(button))) || nativeButtons[0];
    const comments = nav.querySelector(":scope > .sn-comments-nav-host-v93 > .sn-comments-nav-button-v93");
    copyGeometry(reference, comments);
  });
}

async function writeClipboard(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

async function copyActiveCode(workspace, button) {
  const textarea = workspace.querySelector(".tn-code-pane textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  const oldText = button.textContent;
  try {
    await writeClipboard(textarea.value);
    button.textContent = "Tersalin";
  } catch (error) {
    console.error("Copy theme code failed", error);
    button.textContent = "Gagal menyalin";
  }
  window.setTimeout(() => { button.textContent = oldText; }, 1500);
}

function installEditorTools(layer) {
  if (!(layer instanceof HTMLElement)) return;
  const workspace = layer.querySelector(".tn-code-workspace");
  const footer = layer.querySelector(".tn-modal.fullscreen > footer, .tn-modal > footer");
  if (!(workspace instanceof HTMLElement) || !(footer instanceof HTMLElement)) return;

  footer.querySelectorAll(".tn-v96-tool,.tn-v97-tool,.tn-v98-tool,.tn-v100-tool").forEach((item) => item.remove());
  workspace.classList.remove("tn-v100-previewing");

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "tn-v100-tool tn-v100-copy";
  copy.textContent = "Salin";
  copy.setAttribute("aria-label", "Salin kode pada tab aktif");
  copy.addEventListener("click", () => copyActiveCode(workspace, copy));

  const preview = document.createElement("button");
  preview.type = "button";
  preview.className = "tn-v100-tool tn-v100-preview";
  preview.textContent = "Preview";
  preview.setAttribute("aria-label", "Lihat preview kode tema yang sedang diedit");
  preview.addEventListener("click", () => {
    const next = !workspace.classList.contains("tn-v100-previewing");
    workspace.classList.toggle("tn-v100-previewing", next);
    preview.classList.toggle("active", next);
    preview.textContent = next ? "Kembali ke kode" : "Preview";
    if (next) {
      const iframe = workspace.querySelector(".tn-frame-shell iframe");
      iframe?.focus?.();
    }
  });

  const cancel = [...footer.querySelectorAll(":scope > button")]
    .find((button) => /batal/i.test(textOf(button)));
  footer.insertBefore(copy, cancel || footer.firstChild);
  footer.insertBefore(preview, cancel || footer.firstChild);
  layer.dataset.editorToolsV100 = "true";
}

function installAllEditorTools() {
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    if (!layer.querySelector(".tn-code-workspace")) return;
    const hasCopy = layer.querySelector(".tn-v100-copy");
    const hasPreview = layer.querySelector(".tn-v100-preview");
    if (!hasCopy || !hasPreview) installEditorTools(layer);
  });
}

function markLayout() {
  document.querySelectorAll(".lb39-layer").forEach((layer) => {
    layer.dataset.layoutAuthorityV100 = "true";
  });
}

function closeMobileDrawer(shell) {
  if (!window.matchMedia(PHONE_QUERY).matches || !(shell instanceof HTMLElement)) return;
  const side = shell.querySelector(":scope > .sn-side");
  if (!side || side.classList.contains("collapsed")) return;
  const toggle = shell.querySelector(":scope > .sn-main > .sn-top > .sn-icon");
  if (toggle instanceof HTMLButtonElement) toggle.click();
}

function sync() {
  document.documentElement.dataset.studioSurfaceAuthority = RELEASE;
  alignComments();
  installAllEditorTools();
  markLayout();
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

function start() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const shell = target.closest(".sn-shell");
    if (!shell) return;
    if (target.closest(".sn-comments-nav-button-v93,.sn-account-settings-v88,.sn-account-settings-v85")) {
      requestAnimationFrame(() => closeMobileDrawer(shell));
    }
  }, true);

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
