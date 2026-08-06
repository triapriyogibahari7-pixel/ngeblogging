import "./studio-theme-code-device-v330.css";

export const STUDIO_THEME_CODE_DEVICE_RELEASE_V330 = "studio-theme-code-device-v330-20260806";
export const THEME_CODE_LINE_GUIDE_V330 = 10000;

const LARGE_DEVICES = new Set(["laptop", "desktop", "computer"]);
const COMPACT_DEVICES = new Set(["application", "phone", "mobile", "compact", "tablet"]);
const GUTTER_SELECTOR = "[data-theme-code-v312=\"line-numbers-10000\"],.tn-code-gutter-v312,.tn-code-gutter-v319,.tn-code-gutter-v265,.tn-code-gutter-v325,.tn-code-gutter-v330";
const LINE_GUIDE = Array.from({ length: THEME_CODE_LINE_GUIDE_V330 }, (_, index) => String(index + 1)).join("\n");
let frame = 0;

function selectedDevice(workspace) {
  const preview = workspace?.querySelector?.(".tn-code-preview-pane [data-preview-device]");
  const explicit = String(preview?.dataset?.previewDevice || "").trim();
  if (LARGE_DEVICES.has(explicit) || COMPACT_DEVICES.has(explicit)) return explicit;

  const pressed = workspace?.querySelector?.('.tn-device-switch button[aria-pressed="true"]');
  const label = String(pressed?.title || pressed?.textContent || "").toLowerCase();
  if (label.includes("aplikasi")) return "application";
  if (label.includes("handphone")) return "phone";
  if (label.includes("perangkat kecil")) return "compact";
  if (label.includes("tablet")) return "tablet";
  if (label.includes("laptop")) return "laptop";
  if (label.includes("komputer")) return "computer";
  if (label.includes("desktop")) return "desktop";
  if (label.includes("mobile")) return "mobile";

  const root = document.documentElement;
  const responsive = String(root.dataset.studioResponsiveMode || "");
  const variant = String(root.dataset.studioDeviceVariant || "");
  if (LARGE_DEVICES.has(variant) || COMPACT_DEVICES.has(variant)) return variant;
  if (LARGE_DEVICES.has(responsive) || COMPACT_DEVICES.has(responsive)) return responsive;
  return "desktop";
}

function ensureLineGuide(pane) {
  if (!pane) return;
  const textarea = pane.querySelector("textarea");
  if (!textarea) return;

  let gutter = pane.querySelector(GUTTER_SELECTOR);
  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "tn-code-gutter-v330";
    gutter.dataset.themeCodeV330 = "line-numbers-10000";
    gutter.setAttribute("aria-hidden", "true");
    gutter.textContent = LINE_GUIDE;
    textarea.insertAdjacentElement("beforebegin", gutter);
  }

  pane.dataset.v330LineGuide = "ready";
  gutter.dataset.v330LineGuide = "ready";
  if (textarea.dataset.v330GutterSync !== "ready") {
    textarea.dataset.v330GutterSync = "ready";
    const syncGutter = () => { gutter.scrollTop = textarea.scrollTop; };
    textarea.addEventListener("scroll", syncGutter, { passive: true });
    syncGutter();
  }
}

function normalizeWorkspace(workspace) {
  if (!(workspace instanceof HTMLElement)) return;
  const device = selectedDevice(workspace);
  const family = LARGE_DEVICES.has(device) ? "large" : "compact";
  workspace.dataset.v330CodeDevice = device;
  workspace.dataset.v330CodeFamily = family;
  workspace.dataset.v330CodeWorkspace = "ready";

  const pane = workspace.querySelector(".tn-code-pane");
  const preview = workspace.querySelector(".tn-code-preview-pane");
  if (pane) {
    pane.dataset.v330CodePane = "ready";
    ensureLineGuide(pane);
  }
  if (preview) preview.dataset.v330PreviewPane = "ready";

  const modal = workspace.closest(".tn-modal");
  if (modal) {
    modal.dataset.v330CodeModal = "ready";
    const body = modal.querySelector(":scope > .tn-modal-body");
    if (body) body.dataset.v330CodeBody = "ready";
    const layer = modal.closest(".tn-modal-layer");
    if (layer) layer.dataset.v330CodeLayer = "ready";
  }
}

export function syncThemeCodeDeviceV330() {
  frame = 0;
  document.documentElement.dataset.studioThemeCodeDeviceV330 = STUDIO_THEME_CODE_DEVICE_RELEASE_V330;
  document.querySelectorAll(".tn-code-workspace").forEach(normalizeWorkspace);
}

function schedule(delay = 0) {
  if (typeof window === "undefined") return;
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = window.requestAnimationFrame(syncThemeCodeDeviceV330);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => {
    schedule();
    schedule(60);
    schedule(160);
  }, { passive: true });
  window.addEventListener("pageshow", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(30), { passive: true });
  window.addEventListener("orientationchange", () => schedule(60), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:active-site-change", () => schedule(30), { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once: true });
  else schedule();
  schedule(220);
  schedule(700);
}
