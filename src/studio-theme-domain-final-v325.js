import "./studio-theme-domain-final-v325.css";

export const STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325 = "studio-theme-domain-final-v325-20260806";
export const THEME_CODE_LINE_GUIDE_V325 = 10000;

const V312_MAP_SELECTOR = '[data-theme-layout-v312],[class*="tn-layout-map"][class*="v312"]';
const V312_MODEL_SELECTOR = '.tn-layout-model-v312,[class*="tn-layout-model-"][class*="v312"]';
const NATIVE_GUTTER_SELECTOR = '[data-theme-code-v312="line-numbers-10000"],.tn-code-gutter-v312,.tn-code-gutter-v319,.tn-code-gutter-v265,.tn-code-gutter-v325';
const LINE_GUIDE = Array.from({ length: THEME_CODE_LINE_GUIDE_V325 }, (_, index) => String(index + 1)).join("\n");
let scheduledFrame = 0;

function markModelCard(card) {
  if (!card || !(card instanceof HTMLElement)) return;
  card.dataset.v325ModelCard = "ready";
  card.style.removeProperty("transform");
  const parent = card.parentElement;
  if (parent) parent.dataset.v325ModelStack = "ready";
}

function normalizeThemeLayout() {
  document.querySelectorAll(".tn-layout-studio").forEach((studio) => {
    const maps = [...studio.querySelectorAll(V312_MAP_SELECTOR)];
    if (!maps.length) return;

    studio.dataset.v325ThemeLayout = "ready";

    maps.forEach((map) => {
      map.dataset.v325LayoutMap = "ready";
      const shell = map.parentElement;
      if (shell) shell.dataset.v325MapShell = "ready";
      const explicitModel = map.closest(V312_MODEL_SELECTOR);
      if (explicitModel) markModelCard(explicitModel);
      else if (shell) markModelCard(shell);
    });

    const labeledButtons = [...studio.querySelectorAll("button,[role='button']")]
      .filter((node) => /model\s+(editorial|majalah)/i.test(String(node.textContent || "")));
    labeledButtons.forEach((button) => {
      const explicitModel = button.closest(V312_MODEL_SELECTOR);
      if (explicitModel) markModelCard(explicitModel);
      else {
        let cursor = button.parentElement;
        while (cursor && cursor !== studio) {
          if (cursor.querySelector?.(V312_MAP_SELECTOR)) { markModelCard(cursor); break; }
          cursor = cursor.parentElement;
        }
      }
    });

    // v319 only hid a direct-child fallback. The screenshot regression can leave
    // a nested v264 map visible beside the two real v312 models. Hide only the
    // independent fallback after real v312 maps are positively present.
    studio.querySelectorAll(".tn-layout-map-v264").forEach((legacy) => {
      const belongsToV312 = maps.some((map) => legacy.contains(map) || map.contains(legacy));
      if (!belongsToV312) legacy.dataset.v325LegacyMap = "hidden";
    });
  });
}

function ensureLineGuide(pane) {
  const textarea = pane.querySelector("textarea");
  if (!textarea) return;

  let gutter = pane.querySelector(NATIVE_GUTTER_SELECTOR);
  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "tn-code-gutter-v325";
    gutter.dataset.themeCodeV325 = "line-numbers-10000";
    gutter.setAttribute("aria-hidden", "true");
    gutter.textContent = LINE_GUIDE;
    textarea.insertAdjacentElement("beforebegin", gutter);
  }

  pane.dataset.v325LineGuide = "ready";
  gutter.dataset.v325LineGuide = "ready";
  if (textarea.dataset.v325GutterSync !== "ready") {
    textarea.dataset.v325GutterSync = "ready";
    const sync = () => { gutter.scrollTop = textarea.scrollTop; };
    textarea.addEventListener("scroll", sync, { passive: true });
    sync();
  }
}

function normalizeCodeEditor() {
  document.querySelectorAll(".tn-modal").forEach((modal) => {
    const workspace = modal.querySelector(".tn-code-workspace");
    if (!workspace) return;
    modal.dataset.v325CodeModal = "ready";
    const body = modal.querySelector(":scope > .tn-modal-body");
    if (body) body.dataset.v325CodeBody = "ready";
    workspace.dataset.v325CodeWorkspace = "ready";
    const pane = workspace.querySelector(".tn-code-pane");
    const preview = workspace.querySelector(".tn-code-preview-pane");
    if (pane) {
      pane.dataset.v325CodePane = "ready";
      ensureLineGuide(pane);
    }
    if (preview) preview.dataset.v325PreviewPane = "ready";
  });
}

function normalizeContentEditor() {
  document.querySelectorAll(".ce-app").forEach((editor) => {
    editor.dataset.v325EditorReady = "true";
  });
}

function normalizeDomainPanel() {
  document.querySelectorAll(".sv124-domain-page").forEach((page) => {
    page.dataset.v325DomainReady = "true";
  });
}

function sync() {
  scheduledFrame = 0;
  document.documentElement.dataset.studioThemeDomainFinalV325 = STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325;
  normalizeThemeLayout();
  normalizeCodeEditor();
  normalizeContentEditor();
  normalizeDomainPanel();
}

function schedule(delay = 0) {
  if (typeof window === "undefined") return;
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (scheduledFrame) return;
  scheduledFrame = window.requestAnimationFrame(sync);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => {
    schedule();
    schedule(70);
    schedule(180);
  }, { passive: true });
  window.addEventListener("pageshow", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(), { passive: true });
  window.addEventListener("orientationchange", () => schedule(50), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:active-site-change", () => schedule(30), { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once: true });
  else schedule();
  schedule(250);
  schedule(750);
}