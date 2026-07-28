const RELEASE = "studio-final-v104-20260728";
const NATIVE_COMMENTS_ID = "ngeblogging-comments-native-v104";
const DRAFT_BUTTON_CLASS = "tn-draft-preview-v104";

function labelOf(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function findDomainButton(nav) {
  return [...nav.querySelectorAll(":scope > button")]
    .find((button) => labelOf(button) === "Domain") || null;
}

function syncNativeCommentsButton() {
  const nav = document.querySelector(".sn-shell > .sn-side > nav");
  const legacyHost = nav?.querySelector(":scope > .sn-comments-nav-host-v93");
  const legacyButton = legacyHost?.querySelector(".sn-comments-nav-button-v93");
  if (!(nav instanceof HTMLElement) || !(legacyButton instanceof HTMLButtonElement)) return;

  let nativeButton = nav.querySelector(`#${NATIVE_COMMENTS_ID}`);
  if (!(nativeButton instanceof HTMLButtonElement)) {
    nativeButton = document.createElement("button");
    nativeButton.id = NATIVE_COMMENTS_ID;
    nativeButton.type = "button";
    nativeButton.className = "sn-comments-native-v104";
    nativeButton.title = "Komentar";
    nativeButton.setAttribute("aria-label", "Komentar");
    nativeButton.addEventListener("click", () => {
      const current = document.querySelector(".sn-comments-nav-host-v93 .sn-comments-nav-button-v93");
      if (current instanceof HTMLButtonElement) current.click();
    });
  }

  const domainButton = findDomainButton(nav);
  if (nativeButton.parentElement !== nav || nativeButton.nextElementSibling !== domainButton) {
    nav.insertBefore(nativeButton, domainButton);
  }

  const markup = legacyButton.innerHTML;
  if (nativeButton.innerHTML !== markup) nativeButton.innerHTML = markup;
  const label = nativeButton.querySelector("span");
  if (label && label.textContent?.trim() !== "Komentar") label.textContent = "Komentar";

  nativeButton.classList.toggle("active", legacyButton.classList.contains("active"));
  nativeButton.disabled = legacyButton.disabled;
  nativeButton.hidden = false;
  nativeButton.removeAttribute("style");
  nativeButton.dataset.nativeCommentsAuthority = "v104";

  legacyHost.style.setProperty("display", "none", "important");
  legacyHost.setAttribute("aria-hidden", "true");
}

function draftHtmlFromLayer(layer) {
  const frame = layer.querySelector(".tn-code-workspace .tn-frame-shell iframe");
  if (frame instanceof HTMLIFrameElement) {
    const source = frame.srcdoc || frame.getAttribute("srcdoc") || "";
    if (source.trim()) return source;
  }
  return "";
}

function openDraftPreview(layer, button) {
  let html = draftHtmlFromLayer(layer);
  if (!html) {
    const original = button.textContent;
    button.textContent = "Draf belum siap";
    window.setTimeout(() => { button.textContent = original; }, 1600);
    return;
  }

  const robots = '<meta name="robots" content="noindex,nofollow,noarchive">';
  html = /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1>${robots}`)
    : `${robots}${html}`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const preview = window.open(url, "_blank", "noopener,noreferrer");
  if (!preview) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.append(link);
    link.click();
    link.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

function installHeaderDraftPreview(layer) {
  if (!(layer instanceof HTMLElement)) return;
  const modal = layer.querySelector(":scope > .tn-modal");
  const header = modal?.querySelector(":scope > header");
  const workspace = modal?.querySelector(".tn-code-workspace");
  if (!(header instanceof HTMLElement) || !(workspace instanceof HTMLElement)) return;

  const close = [...header.querySelectorAll(":scope > button")]
    .find((button) => button.getAttribute("aria-label") === "Tutup")
    || header.querySelector(":scope > button:last-of-type");
  if (!(close instanceof HTMLButtonElement)) return;

  let button = header.querySelector(`:scope > .${DRAFT_BUTTON_CLASS}`);
  if (!(button instanceof HTMLButtonElement)) {
    button = document.createElement("button");
    button.type = "button";
    button.className = DRAFT_BUTTON_CLASS;
    button.title = "Buka preview draf situs tanpa menerbitkan";
    button.setAttribute("aria-label", "Preview draf situs");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg><span>Preview draf situs</span>';
    button.addEventListener("click", () => openDraftPreview(layer, button));
  }

  if (button.parentElement !== header || button.nextElementSibling !== close) {
    header.insertBefore(button, close);
  }
  layer.dataset.headerDraftPreviewV104 = "true";
}

function removeMobilePreviewArtifacts() {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  document.documentElement.dataset.mobileCodeOnlyV104 = String(mobile);
  if (!mobile) return;

  document.querySelectorAll(".tn-modal-layer .tn-code-workspace").forEach((workspace) => {
    workspace.classList.remove("tn-v100-previewing");
    workspace.dataset.previewOpenV99 = "false";
    workspace.dataset.previewOpenV98 = "false";
  });
}

function sync() {
  document.documentElement.dataset.studioFinalAuthority = RELEASE;
  syncNativeCommentsButton();
  document.querySelectorAll(".tn-modal-layer").forEach(installHeaderDraftPreview);
  removeMobilePreviewArtifacts();
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

function start() {
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.attributeName === "class")) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
