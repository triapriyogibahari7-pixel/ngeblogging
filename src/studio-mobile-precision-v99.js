const RELEASE = "studio-mobile-precision-v99-20260728";
const PHONE_QUERY = "(max-width: 760px)";
const COARSE_QUERY = "(pointer: coarse) and (max-device-width: 1024px)";

function labelOf(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function physicalMobile() {
  return navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || window.matchMedia(COARSE_QUERY).matches;
}

function copyComputed(source, target, properties) {
  if (!(source instanceof Element) || !(target instanceof HTMLElement)) return;
  const styles = getComputedStyle(source);
  for (const property of properties) {
    const value = styles.getPropertyValue(property);
    if (value) target.style.setProperty(property, value, "important");
  }
}

function setDeviceContract() {
  document.documentElement.dataset.physicalMobileV99 = String(physicalMobile());
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
  return Math.max(0, Math.min(320, Math.round(rect.width)));
}

function syncSidebarOffset() {
  document.documentElement.style.setProperty("--studio-side-offset-v99", `${sidebarOffset()}px`);
}

function nativeReference(nav) {
  const buttons = [...nav.querySelectorAll(":scope > button")]
    .filter((button) => !button.hidden && !["Nara AI", "Komentar"].includes(labelOf(button)));
  return buttons.find((button) => labelOf(button) === "Anggota") || buttons[0] || null;
}

function syncCommentsRow() {
  document.querySelectorAll(".sn-side > nav").forEach((nav) => {
    const comments = nav.querySelector(":scope > .sn-comments-nav-host-v93 > .sn-comments-nav-button-v93");
    const reference = nativeReference(nav);
    if (!(comments instanceof HTMLElement) || !(reference instanceof HTMLElement)) return;

    copyComputed(reference, comments, [
      "display", "grid-template-columns", "align-items", "justify-content",
      "min-height", "height", "padding-top", "padding-right", "padding-bottom", "padding-left",
      "gap", "border-radius", "font-family", "font-size", "font-weight", "line-height",
      "letter-spacing", "text-align",
    ]);

    const referenceIcon = reference.querySelector("svg");
    const commentsIcon = comments.querySelector("svg");
    if (referenceIcon && commentsIcon instanceof SVGElement) {
      const iconStyle = getComputedStyle(referenceIcon);
      commentsIcon.style.setProperty("width", iconStyle.width || "25px", "important");
      commentsIcon.style.setProperty("height", iconStyle.height || "25px", "important");
      commentsIcon.style.setProperty("min-width", iconStyle.width || "25px", "important");
      commentsIcon.style.setProperty("margin", "0", "important");
      commentsIcon.style.setProperty("flex", `0 0 ${iconStyle.width || "25px"}`, "important");
    }

    const referenceText = reference.querySelector("span");
    const commentsText = comments.querySelector("span");
    if (referenceText && commentsText instanceof HTMLElement) {
      copyComputed(referenceText, commentsText, [
        "font-family", "font-size", "font-weight", "line-height", "letter-spacing",
        "text-align", "color", "white-space",
      ]);
      commentsText.style.setProperty("display", "block", "important");
      commentsText.style.setProperty("margin", "0", "important");
      commentsText.style.setProperty("padding", "0", "important");
    }

    comments.dataset.nativeRowV99 = "true";
  });
}

async function copyCode(workspace, button) {
  const textarea = workspace.querySelector(".tn-code-pane textarea:not([hidden]), .tn-code-pane textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  try {
    await navigator.clipboard.writeText(textarea.value);
  } catch {
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
  }
  const original = button.dataset.originalLabel || "Salin kode";
  button.classList.add("success");
  button.textContent = "Tersalin ✓";
  window.setTimeout(() => {
    button.classList.remove("success");
    button.textContent = original;
  }, 1400);
}

function setPreview(workspace, button, open) {
  workspace.dataset.previewOpenV99 = String(open);
  workspace.dataset.previewOpenV98 = String(open);
  button.classList.toggle("active", open);
  button.textContent = open ? "Kembali ke kode" : "Lihat pratinjau";
}

function installThemeTools(layer) {
  if (!(layer instanceof HTMLElement)) return;
  const workspace = layer.querySelector(".tn-code-workspace");
  const status = layer.querySelector(".tn-code-status");
  if (!(workspace instanceof HTMLElement) || !(status instanceof HTMLElement)) return;

  layer.querySelectorAll(".tn-v98-tools").forEach((legacy) => legacy.remove());
  let tools = status.querySelector(":scope > .tn-v99-tools-inline");
  if (!(tools instanceof HTMLElement)) {
    tools = document.createElement("div");
    tools.className = "tn-v99-tools-inline";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "tn-v99-tool";
    copy.dataset.originalLabel = "Salin kode";
    copy.textContent = "Salin kode";
    copy.addEventListener("click", () => copyCode(workspace, copy));

    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "tn-v99-tool";
    preview.textContent = "Lihat pratinjau";
    preview.addEventListener("click", () => {
      const open = workspace.dataset.previewOpenV99 !== "true";
      setPreview(workspace, preview, open);
    });

    tools.append(copy, preview);
    const counter = status.querySelector(":scope > small");
    status.insertBefore(tools, counter || null);
  }

  if (!workspace.dataset.previewOpenV99) setPreview(workspace, tools.querySelectorAll("button")[1], false);
  layer.dataset.toolsV99 = "true";
}

function syncThemeTools() {
  document.querySelectorAll(".tn-modal-layer").forEach(installThemeTools);
}

function sync() {
  document.documentElement.dataset.studioMobilePrecision = RELEASE;
  setDeviceContract();
  syncSidebarOffset();
  syncCommentsRow();
  syncThemeTools();
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
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
