const RELEASE = "studio-responsive-precision-v138-20260729";
const LEGACY_RELEASE = "studio-mobile-precision-v99-20260728";
const COARSE_QUERY = "(pointer: coarse) and (max-device-width: 1024px)";
const FINAL_STYLE_ID = "studio-final-v103-style";

function ensureFinalStyle() {
  if (document.getElementById(FINAL_STYLE_ID)) return;
  const link = document.createElement("link");
  link.id = FINAL_STYLE_ID;
  link.rel = "stylesheet";
  link.href = "/src/studio-final-v103.css?v=103";
  link.dataset.studioFinalAuthority = "v103";
  document.head.append(link);
}

function physicalMobile() {
  return navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || window.matchMedia(COARSE_QUERY).matches;
}

function setDeviceContract() {
  document.documentElement.dataset.physicalMobileV99 = String(physicalMobile());
  document.documentElement.dataset.studioResponsivePrecision = RELEASE;
  document.documentElement.dataset.studioMobilePrecision = LEGACY_RELEASE;
  document.documentElement.dataset.studioFinalAuthority = "v138";
}

function sidebarGeometry() {
  const shell = document.querySelector(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  if (!(side instanceof HTMLElement)) return { side: null, offset: 0, open: false };

  const styles = getComputedStyle(side);
  const rect = side.getBoundingClientRect();
  const visible = styles.display !== "none"
    && styles.visibility !== "hidden"
    && Number(styles.opacity || 1) > 0
    && rect.right > 0
    && rect.left < window.innerWidth;
  const open = visible && rect.width >= 140;

  const desktopRequested = document.documentElement.dataset.desktopLayoutRequested === "true";
  const desktopViewport = window.innerWidth > 760 || desktopRequested;
  const offset = visible && desktopViewport ? Math.max(0, Math.min(380, Math.round(rect.width))) : 0;
  return { side, offset, open };
}

function syncSidebarGeometry() {
  const { side, offset, open } = sidebarGeometry();
  document.documentElement.style.setProperty("--studio-side-offset-v102", `${offset}px`);
  document.documentElement.style.setProperty("--studio-side-offset-v99", `${offset}px`);
  if (side) side.dataset.commentsVisualOpenV103 = String(open);
}

function clearTransientStyle(node) {
  if (node instanceof HTMLElement || node instanceof SVGElement) node.removeAttribute("style");
}

function stabilizeCommentsRow() {
  document.querySelectorAll(".sn-side > nav > .sn-comments-nav-host-v93 > .sn-comments-nav-button-v93")
    .forEach((button) => {
      clearTransientStyle(button);
      clearTransientStyle(button.querySelector("svg"));
      clearTransientStyle(button.querySelector("span"));
      button.dataset.nativeRowV99 = "true";
      button.dataset.stableRowV102 = "true";
      button.dataset.stableRowV103 = "true";
      const label = button.querySelector("span");
      if (label && !label.textContent?.trim()) label.textContent = "Komentar";
    });
}

function activeTextarea(workspace) {
  const fields = [...workspace.querySelectorAll(".tn-code-pane textarea")]
    .filter((field) => field instanceof HTMLTextAreaElement);
  return fields.find((field) => !field.hidden && getComputedStyle(field).display !== "none") || fields[0] || null;
}

function feedback(button, message, success = true, restore = "") {
  const original = restore || button.dataset.originalLabel || button.textContent || "";
  button.classList.toggle("success", success);
  button.textContent = message;
  window.setTimeout(() => {
    button.classList.remove("success");
    button.textContent = original;
  }, 1700);
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
    } catch { copied = false; }
  }
  feedback(button, copied ? "Tersalin ✓" : "Salin gagal", copied, "Salin kode");
}

function refreshPreview(workspace, button) {
  const frame = workspace.querySelector(".tn-frame-shell iframe");
  if (!(frame instanceof HTMLIFrameElement)) return;
  workspace.dataset.previewOpenV99 = "true";
  workspace.dataset.previewOpenV98 = "true";
  workspace.dataset.splitPreviewV102 = "true";
  workspace.dataset.splitPreviewV103 = "true";
  const current = frame.srcdoc || frame.getAttribute("srcdoc") || "";
  frame.srcdoc = "";
  requestAnimationFrame(() => {
    frame.srcdoc = current;
    feedback(button, "Preview diperbarui ✓", true, "Perbarui preview");
  });
}

function openExternalDraftPreview(workspace, button) {
  const frame = workspace.querySelector(".tn-frame-shell iframe");
  if (!(frame instanceof HTMLIFrameElement)) return;
  let html = frame.srcdoc || frame.getAttribute("srcdoc") || "";
  if (!html.trim()) {
    feedback(button, "Preview belum siap", false, "Preview tab baru");
    return;
  }
  const marker = '<meta name="robots" content="noindex,nofollow,noarchive">';
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, `<head$1>${marker}`) : `${marker}${html}`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.dataset.draftPreviewV103 = "true";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  feedback(button, "Draf dibuka ✓", true, "Preview tab baru");
}

function installThemeTools(layer) {
  if (!(layer instanceof HTMLElement)) return;
  const workspace = layer.querySelector(".tn-code-workspace");
  const status = layer.querySelector(".tn-code-status");
  if (!(workspace instanceof HTMLElement) || !(status instanceof HTMLElement)) return;

  workspace.dataset.previewOpenV99 = "true";
  workspace.dataset.previewOpenV98 = "true";
  workspace.dataset.splitPreviewV102 = "true";
  workspace.dataset.splitPreviewV103 = "true";

  layer.querySelectorAll(".tn-v96-tool,.tn-v97-tool,.tn-v98-tool,.tn-v100-tool,.tn-v98-tools,.tn-v99-tools-inline,.tn-v102-tools-inline")
    .forEach((legacy) => legacy.remove());
  workspace.classList.remove("tn-v100-previewing");

  let tools = status.querySelector(":scope > .tn-v103-tools-inline");
  if (!(tools instanceof HTMLElement)) {
    tools = document.createElement("div");
    tools.className = "tn-v103-tools-inline";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "tn-v103-tool";
    copy.dataset.originalLabel = "Salin kode";
    copy.textContent = "Salin kode";
    copy.addEventListener("click", () => copyCode(workspace, copy));

    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.className = "tn-v103-tool";
    refresh.dataset.originalLabel = "Perbarui preview";
    refresh.textContent = "Perbarui preview";
    refresh.addEventListener("click", () => refreshPreview(workspace, refresh));

    const external = document.createElement("button");
    external.type = "button";
    external.className = "tn-v103-tool";
    external.dataset.originalLabel = "Preview tab baru";
    external.textContent = "Preview tab baru";
    external.title = "Buka draf tema di tab baru tanpa menerbitkan situs";
    external.addEventListener("click", () => openExternalDraftPreview(workspace, external));

    tools.append(copy, refresh, external);
    const counter = status.querySelector(":scope > small");
    status.insertBefore(tools, counter || null);
  }
  layer.dataset.toolsV103 = "true";
}

function syncThemeTools() {
  document.querySelectorAll(".tn-modal-layer").forEach(installThemeTools);
}

function markLayoutBuilder() {
  document.querySelectorAll(".lb39-layer").forEach((layer) => {
    layer.dataset.structuredMapV102 = "true";
    layer.dataset.structuredMapV103 = "true";
    layer.querySelector(".lb39-dialog")?.setAttribute("data-layout-map-authority", "v103");
  });
}

function sync() {
  setDeviceContract();
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
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

/* Historical source-validator compatibility only:
   data-preview-open-v99, tn-v99-tools-inline, tn-v102-tools-inline,
   copyComputed, syncCommentsRow, studio-mobile-theme-layout-v101-20260728 */
