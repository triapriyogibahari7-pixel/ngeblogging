import "./studio-theme-code-editor-v342.css";

export const STUDIO_THEME_CODE_EDITOR_RELEASE_V342 = "studio-theme-code-editor-v342-20260807";
export const THEME_CODE_EDITOR_LINE_GUIDE_V342 = 10000;

const COMPACT_MODES = new Set(["application", "phone", "mobile", "compact", "tablet"]);
const LARGE_MODES = new Set(["laptop", "desktop", "computer"]);
const LEGACY_GUTTER_SELECTOR = [
  '[data-theme-code-v312="line-numbers-10000"]',
  ".tn-code-gutter-v312",
  ".tn-code-gutter-v319",
  ".tn-code-gutter-v265",
  ".tn-code-gutter-v325",
  ".tn-code-gutter-v330",
  ".tn-code-gutter-v342",
].join(",");
const LINE_GUIDE = Array.from({ length: THEME_CODE_EDITOR_LINE_GUIDE_V342 }, (_, index) => String(index + 1)).join("\n");
let frame = 0;

function editorFamily() {
  const root = document.documentElement;
  const responsive = String(root.dataset.studioResponsiveMode || "");
  const variant = String(root.dataset.studioDeviceVariant || "");

  // The Studio shell owns editor composition. A compact Theme preview selected
  // inside a desktop Studio must not collapse the whole editor into the mobile
  // stack. This is the regression visible in the supplied screenshot.
  if (COMPACT_MODES.has(responsive) || (responsive !== "desktop" && COMPACT_MODES.has(variant))) return "compact";
  if (LARGE_MODES.has(variant) || responsive === "desktop") return "large";
  return root.dataset.studioDeviceMode === "small" ? "compact" : "large";
}

function ensureSingleGutter(pane) {
  const textarea = pane?.querySelector?.(":scope > textarea");
  if (!textarea) return;

  const gutters = [...pane.querySelectorAll(LEGACY_GUTTER_SELECTOR)];
  let gutter = gutters.find((node) => node.classList.contains("tn-code-gutter-v342"));
  gutters.forEach((node) => {
    if (node !== gutter) node.remove();
  });

  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "tn-code-gutter-v342";
    gutter.dataset.themeCodeV342 = "line-numbers-10000";
    gutter.setAttribute("aria-hidden", "true");
    gutter.textContent = LINE_GUIDE;
    textarea.insertAdjacentElement("beforebegin", gutter);
  } else if (gutter.textContent !== LINE_GUIDE) {
    gutter.textContent = LINE_GUIDE;
  }

  textarea.wrap = "off";
  textarea.spellcheck = false;
  textarea.autocomplete = "off";
  textarea.dataset.v342CodeSource = "ready";
  pane.dataset.v342LineGuide = "10000";

  if (textarea.__ngebloggingV342Gutter !== gutter) {
    textarea.__ngebloggingV342Gutter = gutter;
    textarea.addEventListener("scroll", () => {
      const active = textarea.__ngebloggingV342Gutter;
      if (active?.isConnected) active.scrollTop = textarea.scrollTop;
    }, { passive: true });
  }
  gutter.scrollTop = textarea.scrollTop;
}

function normalizeTabs(pane) {
  const tabs = [...(pane?.querySelectorAll?.(":scope > nav > button") || [])];
  tabs.forEach((button, index) => {
    const label = String(button.textContent || "").trim() || ["HTML", "CSS", "JavaScript"][index] || `Tab ${index + 1}`;
    button.dataset.v342CodeTab = label.toLowerCase().replace(/\s+/g, "-");
    button.setAttribute("aria-label", `Edit ${label}`);
  });
}

function normalizeWorkspace(workspace) {
  if (!(workspace instanceof HTMLElement)) return;
  const family = editorFamily();
  const pane = workspace.querySelector(":scope > .tn-code-pane");
  const preview = workspace.querySelector(":scope > .tn-code-preview-pane");
  const modal = workspace.closest(".tn-modal");
  const body = modal?.querySelector(":scope > .tn-modal-body");
  const layer = modal?.closest(".tn-modal-layer");

  workspace.dataset.v342Editor = "ready";
  workspace.dataset.v342EditorFamily = family;
  if (pane) {
    pane.dataset.v342CodePane = "ready";
    normalizeTabs(pane);
    ensureSingleGutter(pane);
  }
  if (preview) preview.dataset.v342PreviewPane = "ready";
  if (modal) modal.dataset.v342CodeModal = "ready";
  if (body) body.dataset.v342CodeBody = "ready";
  if (layer) layer.dataset.v342CodeLayer = "ready";
}

export function syncThemeCodeEditorV342() {
  frame = 0;
  document.documentElement.dataset.studioThemeCodeEditorV342 = STUDIO_THEME_CODE_EDITOR_RELEASE_V342;
  document.querySelectorAll(".tn-code-workspace").forEach(normalizeWorkspace);
}

function schedule(delay = 0) {
  if (typeof window === "undefined") return;
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = window.requestAnimationFrame(syncThemeCodeEditorV342);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => {
    schedule();
    schedule(70);
    schedule(180);
    schedule(420);
  }, { passive: true });
  window.addEventListener("pageshow", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(30), { passive: true });
  window.addEventListener("orientationchange", () => schedule(70), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(20), { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once: true });
  else schedule();
  schedule(220);
  schedule(700);
}
