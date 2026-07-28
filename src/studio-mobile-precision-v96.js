const RELEASE = "studio-mobile-precision-v96-20260728";
const PHONE_QUERY = "(max-width: 760px)";

function textOf(node) {
  return (node?.textContent || "").replace(/\s+/g, " ").trim();
}

async function copyActiveCode(workspace, button) {
  const textarea = workspace?.querySelector(".tn-code-pane textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  try {
    await navigator.clipboard.writeText(textarea.value);
  } catch {
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }
  const previous = button.textContent;
  button.textContent = "Tersalin";
  setTimeout(() => { button.textContent = previous; }, 1400);
}

function installThemeTools(layer) {
  if (!(layer instanceof HTMLElement) || layer.dataset.mobileToolsV96 === "true") return;
  const workspace = layer.querySelector(".tn-code-workspace");
  const footer = layer.querySelector(".tn-modal > footer");
  if (!(workspace instanceof HTMLElement) || !(footer instanceof HTMLElement)) return;

  layer.dataset.mobileToolsV96 = "true";
  workspace.dataset.mobilePreviewV96 = "false";

  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "tn-v96-tool tn-v96-copy";
  copy.textContent = "Salin";
  copy.addEventListener("click", () => copyActiveCode(workspace, copy));

  const preview = document.createElement("button");
  preview.type = "button";
  preview.className = "tn-v96-tool tn-v96-preview";
  preview.textContent = "Preview";
  preview.addEventListener("click", () => {
    const active = workspace.dataset.mobilePreviewV96 !== "true";
    workspace.dataset.mobilePreviewV96 = String(active);
    preview.classList.toggle("active", active);
    preview.textContent = active ? "Kembali ke kode" : "Preview";
  });

  const cancel = [...footer.querySelectorAll("button")].find((button) => /batal/i.test(textOf(button)));
  footer.insertBefore(copy, cancel || footer.firstChild);
  footer.insertBefore(preview, cancel || footer.firstChild);
}

function findLayoutPanel(root) {
  const heading = [...root.querySelectorAll("h1,h2,h3")]
    .find((node) => /susun semua bagian situs/i.test(textOf(node)));
  if (!heading) return null;

  let panel = heading.closest("section, article, .sn-modal, .layout-builder, [role='dialog']");
  if (!panel) panel = heading.parentElement;
  if (!(panel instanceof HTMLElement)) return null;

  let layer = panel.parentElement;
  while (layer && layer !== document.body) {
    const style = getComputedStyle(layer);
    if (style.position === "fixed" || style.position === "absolute" || layer.getAttribute("role") === "dialog") break;
    layer = layer.parentElement;
  }
  if (!(layer instanceof HTMLElement) || layer === document.body) layer = panel.parentElement;
  if (!(layer instanceof HTMLElement)) return null;
  return { layer, panel };
}

function normalizeLayout(root = document) {
  const match = findLayoutPanel(root);
  if (!match) return;
  match.layer.classList.add("sn-layout-precision-v96");
  match.panel.classList.add("sn-layout-panel-v96");
  match.layer.dataset.layoutPrecisionRelease = RELEASE;
}

function sync() {
  document.documentElement.dataset.studioMobilePrecision = RELEASE;
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    if (layer.querySelector(".tn-code-workspace")) installThemeTools(layer);
  });
  normalizeLayout(document);
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

function start() {
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.matchMedia(PHONE_QUERY).addEventListener?.("change", schedule);
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();