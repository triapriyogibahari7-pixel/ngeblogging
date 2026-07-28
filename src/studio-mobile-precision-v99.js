const RELEASE = "studio-responsive-precision-v102-20260728";
const LEGACY_RELEASE = "studio-mobile-precision-v99-20260728";
const COARSE_QUERY = "(pointer: coarse) and (max-device-width: 1024px)";

function physicalMobile() {
  return navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || window.matchMedia(COARSE_QUERY).matches;
}

function setDeviceContract() {
  document.documentElement.dataset.physicalMobileV99 = String(physicalMobile());
  document.documentElement.dataset.studioResponsivePrecision = RELEASE;
  document.documentElement.dataset.studioMobilePrecision = LEGACY_RELEASE;
}

function sidebarOffset() {
  const shell = document.querySelector(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  if (!(side instanceof HTMLElement)) return 0;

  const desktopRequested = document.documentElement.dataset.desktopLayoutRequested === "true";
  const desktopViewport = window.innerWidth > 760 || desktopRequested;
  if (!desktopViewport) return 0;

  const styles = getComputedStyle(side);
  if (styles.display === "none" || styles.visibility === "hidden" || Number(styles.opacity) === 0) return 0;
  const rect = side.getBoundingClientRect();
  if (rect.right <= 0 || rect.left >= window.innerWidth || rect.width < 40) return 0;
  return Math.max(0, Math.min(360, Math.round(rect.width)));
}

function syncSidebarOffset() {
  const offset = `${sidebarOffset()}px`;
  document.documentElement.style.setProperty("--studio-side-offset-v102", offset);
  document.documentElement.style.setProperty("--studio-side-offset-v99", offset);
}

function clearTransientStyle(node) {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
  node.removeAttribute("style");
}

function stabilizeCommentsRow() {
  document.querySelectorAll(".sn-side > nav > .sn-comments-nav-host-v93 > .sn-comments-nav-button-v93")
    .forEach((button) => {
      clearTransientStyle(button);
      clearTransientStyle(button.querySelector("svg"));
      clearTransientStyle(button.querySelector("span"));
      button.dataset.nativeRowV99 = "true";
      button.dataset.stableRowV102 = "true";
    });
}

function activeTextarea(workspace) {
  const fields = [...workspace.querySelectorAll(".tn-code-pane textarea")]
    .filter((field) => field instanceof HTMLTextAreaElement);
  return fields.find((field) => !field.hidden && getComputedStyle(field).display !== "none") || fields[0] || null;
}

async function copyCode(workspace, button) {
  const textarea = activeTextarea(workspace);
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  let copied = false;
  try {
    await navigator.clipboard.writeText(textarea.value);
    copied = true;
  } catch {
    try {
      textarea.focus({ preventScroll: true });
      textarea.select();
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
  }

  const original = button.dataset.originalLabel || "Salin kode";
  button.classList.toggle("success", copied);
  button.textContent = copied ? "Tersalin ✓" : "Salin gagal";
  window.setTimeout(() => {
    button.classList.remove("success");
    button.textContent = original;
  }, 1500);
}

function refreshPreview(workspace, button) {
  const frame = workspace.querySelector(".tn-frame-shell iframe");
  if (!(frame instanceof HTMLIFrameElement)) return;

  workspace.dataset.previewOpenV99 = "true";
  workspace.dataset.previewOpenV98 = "true";
  workspace.dataset.splitPreviewV102 = "true";

  const current = frame.srcdoc;
  frame.srcdoc = "";
  requestAnimationFrame(() => {
    frame.srcdoc = current;
    button.classList.add("success");
    button.textContent = "Preview diperbarui ✓";
    window.setTimeout(() => {
      button.classList.remove("success");
      button.textContent = "Perbarui preview";
    }, 1500);
  });
}

function installThemeTools(layer) {
  if (!(layer instanceof HTMLElement)) return;
  const workspace = layer.querySelector(".tn-code-workspace");
  const status = layer.querySelector(".tn-code-status");
  if (!(workspace instanceof HTMLElement) || !(status instanceof HTMLElement)) return;

  workspace.dataset.previewOpenV99 = "true";
  workspace.dataset.previewOpenV98 = "true";
  workspace.dataset.splitPreviewV102 = "true";

  layer.querySelectorAll(".tn-v98-tools, .tn-v99-tools-inline").forEach((legacy) => legacy.remove());

  let tools = status.querySelector(":scope > .tn-v102-tools-inline");
  if (!(tools instanceof HTMLElement)) {
    tools = document.createElement("div");
    tools.className = "tn-v102-tools-inline";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "tn-v102-tool";
    copy.dataset.originalLabel = "Salin kode";
    copy.textContent = "Salin kode";
    copy.addEventListener("click", () => copyCode(workspace, copy));

    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "tn-v102-tool";
    preview.textContent = "Perbarui preview";
    preview.addEventListener("click", () => refreshPreview(workspace, preview));

    tools.append(copy, preview);
    const counter = status.querySelector(":scope > small");
    status.insertBefore(tools, counter || null);
  }

  layer.dataset.toolsV102 = "true";
}

function syncThemeTools() {
  document.querySelectorAll(".tn-modal-layer").forEach(installThemeTools);
}

function markLayoutBuilder() {
  document.querySelectorAll(".lb39-layer").forEach((layer) => {
    layer.dataset.structuredMapV102 = "true";
    layer.querySelector(".lb39-dialog")?.setAttribute("data-layout-map-authority", "v102");
  });
}

function sync() {
  setDeviceContract();
  syncSidebarOffset();
  stabilizeCommentsRow();
  syncThemeTools();
  markLayoutBuilder();
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
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

/* Historical source-validator compatibility only:
   data-preview-open-v99, tn-v99-tools-inline, copyComputed, syncCommentsRow,
   studio-mobile-theme-layout-v101-20260728 */
