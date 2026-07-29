const RELEASE = "studio-final-v138-20260729";
const DOMAIN_ORDER_RELEASE = "sidebar-domain-order-v113-20260729";
const ACTIONS_CLASS = "tn-code-header-actions-v106";
const COMMENTS_ID = "ngeblogging-comments-native-v106";
const MOBILE_QUERY = "(max-width: 760px)";

function important(node, property, value) {
  if (node instanceof HTMLElement || node instanceof SVGElement) {
    node.style.setProperty(property, value, "important");
  }
}

function mobileViewport() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function labelOf(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function syncNativeCommentsButton() {
  const nav = document.querySelector(".sn-shell > .sn-side > nav");
  const legacyHost = nav?.querySelector(":scope > .sn-comments-nav-host-v93");
  const legacyButton = legacyHost?.querySelector(".sn-comments-nav-button-v93");
  if (!(nav instanceof HTMLElement) || !(legacyButton instanceof HTMLButtonElement)) return;

  let nativeButton = nav.querySelector(`#${COMMENTS_ID}`);
  if (!(nativeButton instanceof HTMLButtonElement)) {
    nativeButton = document.createElement("button");
    nativeButton.id = COMMENTS_ID;
    nativeButton.type = "button";
    nativeButton.className = "sn-comments-native-v106";
    nativeButton.title = "Komentar";
    nativeButton.setAttribute("aria-label", "Komentar");
    nativeButton.addEventListener("click", () => {
      const current = document.querySelector(".sn-comments-nav-host-v93 .sn-comments-nav-button-v93");
      if (current instanceof HTMLButtonElement) current.click();
    });
  }

  const directButtons = [...nav.querySelectorAll(":scope > button")];
  const domain = directButtons.find((button) => labelOf(button) === "Domain") || null;
  if (nativeButton.parentElement !== nav || nativeButton.nextElementSibling !== domain) {
    nav.insertBefore(nativeButton, domain);
  }

  nativeButton.innerHTML = legacyButton.innerHTML;
  const label = nativeButton.querySelector("span");
  if (label) label.textContent = "Komentar";
  nativeButton.classList.toggle("active", legacyButton.classList.contains("active"));
  nativeButton.disabled = legacyButton.disabled;
  nativeButton.hidden = false;
  nativeButton.removeAttribute("style");
  nativeButton.dataset.nativeCommentsAuthority = "v106";
  important(nativeButton, "transform", "none");
  important(nativeButton, "inset", "auto");
  if (label instanceof HTMLElement) {
    important(label, "display", "block");
    important(label, "visibility", "visible");
    important(label, "opacity", "1");
    important(label, "white-space", "nowrap");
  }

  important(legacyHost, "display", "none");
  legacyHost.setAttribute("aria-hidden", "true");
}

function syncDomainMenuOrder() {
  const side = document.querySelector(".sn-shell > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  if (!(side instanceof HTMLElement) || !(nav instanceof HTMLElement)) return;

  const domainCandidates = [...side.querySelectorAll("button")]
    .filter((button) => labelOf(button) === "Domain");
  const domain = domainCandidates.find((button) => button.parentElement === nav)
    || domainCandidates[0]
    || null;
  if (!(domain instanceof HTMLButtonElement)) return;

  const nativeComments = nav.querySelector(`#${COMMENTS_ID}`);
  const legacyComments = nav.querySelector(":scope > .sn-comments-nav-host-v93");
  const members = [...nav.querySelectorAll(":scope > button")]
    .find((button) => labelOf(button) === "Anggota") || null;
  const anchor = nativeComments instanceof HTMLElement
    ? nativeComments
    : legacyComments instanceof HTMLElement
      ? legacyComments
      : members;

  if (domain.parentElement !== nav) nav.append(domain);
  if (anchor instanceof HTMLElement && domain.previousElementSibling !== anchor) {
    nav.insertBefore(domain, anchor.nextElementSibling);
  }

  domain.dataset.sidebarDomainOrderV113 = "true";
  side.dataset.sidebarDomainOrderRelease = DOMAIN_ORDER_RELEASE;
  important(nav, "justify-content", "flex-start");
  important(domain, "position", "static");
  important(domain, "inset", "auto");
  important(domain, "top", "auto");
  important(domain, "right", "auto");
  important(domain, "bottom", "auto");
  important(domain, "left", "auto");
  important(domain, "flex", "0 0 auto");
  important(domain, "order", "0");
  important(domain, "margin-top", "0");
  important(domain, "margin-right", "0");
  important(domain, "margin-bottom", "0");
  important(domain, "margin-left", "0");
  important(domain, "border-top", "0");
  important(domain, "transform", "none");
  important(domain, "box-shadow", "none");

  const active = domain.classList.contains("active");
  important(domain, "background", active ? "#eaf2ff" : "transparent");
  important(domain, "background-image", "none");
  important(domain, "color", active ? "#245fc9" : "#69788d");
  important(domain, "font-weight", active ? "800" : "500");

  const footer = side.querySelector(":scope > .sn-account-footer");
  footer?.querySelectorAll(":scope > button").forEach((button) => {
    if (labelOf(button) === "Domain" && button !== domain) button.remove();
  });
}

function draftHtml(layer) {
  const frame = layer.querySelector(".tn-code-workspace .tn-frame-shell iframe");
  if (!(frame instanceof HTMLIFrameElement)) return "";
  return frame.srcdoc || frame.getAttribute("srcdoc") || "";
}

function feedback(button, text, restore) {
  if (!(button instanceof HTMLButtonElement)) return;
  button.disabled = true;
  const previous = restore || button.dataset.label || button.textContent || "";
  const span = button.querySelector("span");
  if (span) span.textContent = text;
  else button.textContent = text;
  window.setTimeout(() => {
    if (!button.isConnected) return;
    button.disabled = false;
    const currentSpan = button.querySelector("span");
    if (currentSpan) currentSpan.textContent = previous;
    else button.textContent = previous;
  }, 1500);
}

function openDraftPreview(layer, button) {
  let html = draftHtml(layer);
  if (!html.trim()) {
    feedback(button, "Draf belum siap", "Preview situs draf");
    return;
  }
  const robots = '<meta name="robots" content="noindex,nofollow,noarchive">';
  html = /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1>${robots}`)
    : `${robots}${html}`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.append(link);
    link.click();
    link.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
}

function publishCode(layer, button) {
  const footer = layer.querySelector(":scope > .tn-modal > footer");
  const candidates = [...(footer?.querySelectorAll("button") || [])];
  const save = candidates.find((candidate) => /simpan\s+kode/i.test(candidate.textContent || ""))
    || candidates.find((candidate) => candidate.classList.contains("primary"));
  if (!(save instanceof HTMLButtonElement)) {
    feedback(button, "Publish belum siap", "Publish");
    return;
  }
  layer.dataset.publishRequestedV106 = "true";
  button.disabled = true;
  save.click();
}

function iconMarkup(kind) {
  if (kind === "preview") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg><span>Preview situs draf</span>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5V20h16v-3.5"/><path d="M12 3v13"/><path d="m7.5 8 4.5-5 4.5 5"/></svg><span>Publish</span>';
}

function ensureActions(layer, header, close) {
  header.querySelectorAll(":scope > .tn-draft-preview-v104,:scope > .tn-code-header-actions-v105")
    .forEach((legacy) => legacy.remove());

  let actions = header.querySelector(`:scope > .${ACTIONS_CLASS}`);
  if (!(actions instanceof HTMLElement)) {
    actions = document.createElement("div");
    actions.className = ACTIONS_CLASS;

    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "tn-code-preview-v106";
    preview.dataset.label = "Preview situs draf";
    preview.title = "Buka draf situs di tab baru tanpa publish";
    preview.setAttribute("aria-label", "Preview situs draf");
    preview.innerHTML = iconMarkup("preview");
    preview.addEventListener("click", () => openDraftPreview(layer, preview));

    const publish = document.createElement("button");
    publish.type = "button";
    publish.className = "tn-code-publish-v106";
    publish.dataset.label = "Publish";
    publish.title = "Simpan dan aktifkan kode tema";
    publish.setAttribute("aria-label", "Publish kode tema");
    publish.innerHTML = iconMarkup("publish");
    publish.addEventListener("click", () => publishCode(layer, publish));

    actions.append(preview, publish);
  }

  if (actions.parentElement !== header || actions.nextElementSibling !== close) {
    header.insertBefore(actions, close);
  }

  const preview = actions.querySelector(".tn-code-preview-v106");
  if (preview instanceof HTMLButtonElement) preview.hidden = mobileViewport();
  important(actions, "display", "inline-flex");
  important(actions, "visibility", "visible");
  important(actions, "opacity", "1");
  important(actions, "position", "relative");
  important(actions, "z-index", "5");
  return actions;
}

function enforceTextarea(textarea) {
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  textarea.wrap = "soft";
  textarea.setAttribute("wrap", "soft");
  textarea.setAttribute("data-code-wrap-authority", "v106");
  important(textarea, "display", "block");
  important(textarea, "position", "relative");
  important(textarea, "inset", "auto");
  important(textarea, "width", "100%");
  important(textarea, "max-width", "100%");
  important(textarea, "height", "100%");
  important(textarea, "min-width", "0");
  important(textarea, "min-height", "0");
  important(textarea, "white-space", "pre-wrap");
  important(textarea, "overflow-wrap", "anywhere");
  important(textarea, "word-break", "break-word");
  important(textarea, "overflow-x", "hidden");
  important(textarea, "overflow-y", "auto");
  important(textarea, "resize", "none");
  important(textarea, "background", "#0f1929");
  important(textarea, "color", "#e8eef8");
  important(textarea, "caret-color", "#7eabff");
  important(textarea, "padding", mobileViewport() ? "10px" : "14px");
}

function enforceSplitWorkspace(layer, workspace) {
  workspace.dataset.editorSplitV106 = "true";
  workspace.dataset.previewOpenV99 = "true";
  workspace.dataset.previewOpenV98 = "true";
  workspace.classList.remove("tn-v100-previewing");

  important(workspace, "display", "grid");
  important(workspace, "grid-template-columns", "minmax(0,1fr) minmax(0,1fr)");
  important(workspace, "grid-template-rows", "minmax(0,1fr)");
  important(workspace, "width", "100%");
  important(workspace, "height", "100%");
  important(workspace, "min-width", "0");
  important(workspace, "min-height", "0");
  important(workspace, "overflow", "hidden");
  important(workspace, "background", "#0f1929");

  const pane = workspace.querySelector(":scope > .tn-code-pane");
  const frameShell = workspace.querySelector(":scope > .tn-frame-shell");
  if (pane instanceof HTMLElement) {
    important(pane, "display", "grid");
    important(pane, "grid-template-rows", "auto auto minmax(0,1fr)");
    important(pane, "width", "100%");
    important(pane, "height", "100%");
    important(pane, "min-width", "0");
    important(pane, "min-height", "0");
    important(pane, "overflow", "hidden");
  }
  if (frameShell instanceof HTMLElement) {
    important(frameShell, "display", "block");
    important(frameShell, "visibility", "visible");
    important(frameShell, "opacity", "1");
    important(frameShell, "position", "relative");
    important(frameShell, "width", "100%");
    important(frameShell, "height", "100%");
    important(frameShell, "min-width", "0");
    important(frameShell, "min-height", "0");
    important(frameShell, "padding", mobileViewport() ? "3px" : "6px");
    important(frameShell, "margin", "0");
    important(frameShell, "border", "0");
    important(frameShell, "border-left", "1px solid #d8e1ed");
    important(frameShell, "overflow", "hidden");
    important(frameShell, "pointer-events", "auto");
    important(frameShell, "background", "#e8edf4");
    const iframe = frameShell.querySelector("iframe");
    if (iframe instanceof HTMLIFrameElement) {
      important(iframe, "display", "block");
      important(iframe, "width", "100%");
      important(iframe, "height", "100%");
      important(iframe, "min-width", "0");
      important(iframe, "min-height", "0");
      important(iframe, "border", "0");
      important(iframe, "border-radius", mobileViewport() ? "6px" : "9px");
      important(iframe, "background", "#fff");
    }
  }

  workspace.querySelectorAll(".tn-code-pane textarea").forEach(enforceTextarea);
  layer.dataset.themeEditorAuthority = RELEASE;
}

function syncEditorLayer(layer) {
  if (!(layer instanceof HTMLElement)) return;
  const modal = layer.querySelector(":scope > .tn-modal");
  const header = modal?.querySelector(":scope > header");
  const workspace = modal?.querySelector(".tn-code-workspace");
  if (!(modal instanceof HTMLElement) || !(header instanceof HTMLElement) || !(workspace instanceof HTMLElement)) return;

  const close = [...header.querySelectorAll(":scope > button")]
    .find((candidate) => candidate.getAttribute("aria-label") === "Tutup")
    || header.querySelector(":scope > button:last-of-type");
  if (!(close instanceof HTMLButtonElement)) return;

  important(header, "display", "grid");
  important(header, "grid-template-columns", "minmax(0,1fr) auto auto");
  important(header, "align-items", "center");
  important(header, "gap", mobileViewport() ? "6px" : "9px");
  important(header, "min-width", "0");
  const title = header.querySelector(":scope > div:first-child");
  if (title instanceof HTMLElement) {
    important(title, "min-width", "0");
    important(title, "overflow", "hidden");
    const heading = title.querySelector("h2");
    if (heading instanceof HTMLElement) {
      important(heading, "overflow", "hidden");
      important(heading, "text-overflow", "ellipsis");
      important(heading, "white-space", "nowrap");
    }
  }

  ensureActions(layer, header, close);
  enforceSplitWorkspace(layer, workspace);
}

function sync() {
  document.documentElement.dataset.studioFinalAuthority = RELEASE;
  syncNativeCommentsButton();
  syncDomainMenuOrder();
  document.querySelectorAll(".tn-modal-layer").forEach(syncEditorLayer);
}

let animationFrame = 0;
function schedule() {
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(sync);
}

function start() {
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) {
      schedule();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

/* Marker contract: dashboard-session-v106 native-comments-v106 sidebar-domain-order-v113 desktop-draft-preview-v106 mobile-publish-v106 split-editor-v106 wrapped-code-v106 */
