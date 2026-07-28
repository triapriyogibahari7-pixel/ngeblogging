const RELEASE = "studio-final-v105-20260728";
const ACTIONS_CLASS = "tn-code-header-actions-v105";

function codeLayer(node = document) {
  const layers = node.querySelectorAll?.(".tn-modal-layer") || [];
  return [...layers].filter((layer) => layer.querySelector(".tn-code-workspace"));
}

function draftHtml(layer) {
  const frame = layer.querySelector(".tn-code-workspace .tn-frame-shell iframe");
  if (!(frame instanceof HTMLIFrameElement)) return "";
  return frame.srcdoc || frame.getAttribute("srcdoc") || "";
}

function flash(button, message, restore) {
  if (!(button instanceof HTMLButtonElement)) return;
  const original = restore || button.dataset.label || button.textContent || "";
  button.disabled = true;
  button.textContent = message;
  window.setTimeout(() => {
    if (!button.isConnected) return;
    button.disabled = false;
    button.textContent = original;
  }, 1500);
}

function openDraftPreview(layer, button) {
  let html = draftHtml(layer);
  if (!html.trim()) {
    flash(button, "Draf belum siap", "Preview situs draf");
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
  const buttons = [...(footer?.querySelectorAll("button") || [])];
  const save = buttons.find((candidate) => candidate.classList.contains("primary"))
    || buttons.find((candidate) => /simpan\s+kode/i.test(candidate.textContent || ""));

  if (!(save instanceof HTMLButtonElement)) {
    flash(button, "Publish belum siap", "Publish");
    return;
  }

  button.disabled = true;
  layer.dataset.publishRequestedV105 = "true";
  save.click();
}

function buttonMarkup(kind) {
  if (kind === "preview") {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg><span>Preview situs draf</span>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5V20h16v-3.5"/><path d="M12 3v13"/><path d="m7.5 8 4.5-5 4.5 5"/></svg><span>Publish</span>';
}

function enforceWrappedEditors(workspace) {
  workspace.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    textarea.setAttribute("wrap", "soft");
    textarea.setAttribute("data-code-wrap-v105", "soft");
    textarea.style.setProperty("white-space", "pre-wrap", "important");
    textarea.style.setProperty("overflow-wrap", "anywhere", "important");
    textarea.style.setProperty("word-break", "break-word", "important");
    textarea.style.setProperty("overflow-x", "hidden", "important");
    textarea.style.setProperty("max-width", "100%", "important");
  });
}

function installActions(layer) {
  if (!(layer instanceof HTMLElement)) return;
  const modal = layer.querySelector(":scope > .tn-modal");
  const header = modal?.querySelector(":scope > header");
  const workspace = modal?.querySelector(".tn-code-workspace");
  if (!(header instanceof HTMLElement) || !(workspace instanceof HTMLElement)) return;

  header.querySelectorAll(":scope > .tn-draft-preview-v104").forEach((legacy) => {
    legacy.hidden = true;
    legacy.setAttribute("aria-hidden", "true");
  });

  const close = [...header.querySelectorAll(":scope > button")]
    .find((candidate) => candidate.getAttribute("aria-label") === "Tutup")
    || header.querySelector(":scope > button:last-of-type");
  if (!(close instanceof HTMLButtonElement)) return;

  let actions = header.querySelector(`:scope > .${ACTIONS_CLASS}`);
  if (!(actions instanceof HTMLElement)) {
    actions = document.createElement("div");
    actions.className = ACTIONS_CLASS;

    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "tn-code-preview-v105";
    preview.dataset.label = "Preview situs draf";
    preview.title = "Buka draf situs di tab baru tanpa publish";
    preview.setAttribute("aria-label", "Preview situs draf");
    preview.innerHTML = buttonMarkup("preview");
    preview.addEventListener("click", () => openDraftPreview(layer, preview));

    const publish = document.createElement("button");
    publish.type = "button";
    publish.className = "tn-code-publish-v105";
    publish.dataset.label = "Publish";
    publish.title = "Simpan dan terapkan kode pada tema aktif";
    publish.setAttribute("aria-label", "Publish kode tema");
    publish.innerHTML = buttonMarkup("publish");
    publish.addEventListener("click", () => publishCode(layer, publish));

    actions.append(preview, publish);
  }

  if (actions.parentElement !== header || actions.nextElementSibling !== close) {
    header.insertBefore(actions, close);
  }

  workspace.dataset.editorSplitV105 = "true";
  workspace.dataset.previewOpenV99 = "true";
  workspace.dataset.previewOpenV98 = "true";
  enforceWrappedEditors(workspace);
  layer.dataset.codeHeaderActionsV105 = "true";
}

function sync() {
  document.documentElement.dataset.studioFinalAuthority = RELEASE;
  codeLayer().forEach(installActions);
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

function start() {
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "attributes")) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "wrap"] });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
