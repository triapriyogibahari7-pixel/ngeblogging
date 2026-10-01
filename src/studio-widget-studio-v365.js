import "./studio-widget-studio-v365.css";

export const STUDIO_WIDGET_STUDIO_RELEASE_V365 = "studio-widget-studio-v365-20261001";

const LAYER = ".tn-modal-layer";
const WIDGET = ".tn-widget-studio";
let timer = 0;
let raf = 0;

function findLayer() {
  if (typeof document === "undefined") return null;
  for (const layer of document.querySelectorAll(LAYER)) {
    if (layer.querySelector(WIDGET)) return layer;
  }
  return null;
}

function set(node, property, value) {
  node?.style.setProperty(property, value, "important");
}

function lock(layer) {
  const modal = layer.querySelector(":scope > .tn-modal");
  const header = modal?.querySelector(":scope > header");
  const body = modal?.querySelector(":scope > .tn-modal-body");
  const footer = modal?.querySelector(":scope > footer");
  const studio = layer.querySelector(WIDGET);
  if (!modal || !studio) return;

  const desktop = window.matchMedia?.("(min-width: 761px)")?.matches;
  const collapsed = document.querySelector(".sn-side.collapsed");
  const sidebarWidth = collapsed ? "70px" : "220px";

  if (desktop) {
    set(layer, "left", sidebarWidth);
    set(layer, "right", "0");
    set(layer, "width", `calc(100vw - ${sidebarWidth})`);
    set(layer, "padding", "14px");
  } else {
    set(layer, "left", "0");
    set(layer, "right", "0");
    set(layer, "width", "100vw");
    set(layer, "padding", "max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom))");
  }

  set(layer, "box-sizing", "border-box");
  set(modal, "width", "100%");
  set(modal, "max-width", "100%");
  set(modal, "min-width", "0");
  set(modal, "min-height", "0");
  set(modal, "overflow", "hidden");
  set(modal, "display", "grid");
  set(modal, "grid-template-rows", "auto minmax(0,1fr) auto");

  set(header, "position", "relative");
  set(header, "inset", "auto");
  set(header, "width", "100%");
  set(header, "min-width", "0");
  set(header, "min-height", "72px");
  set(header, "height", "auto");
  set(header, "display", "grid");
  set(header, "grid-template-columns", "minmax(0,1fr) 44px");
  set(header, "align-items", "center");
  set(header, "gap", "12px");
  set(header, "overflow", "visible");
  set(header, "box-sizing", "border-box");

  const titleBox = header?.querySelector(":scope > div");
  const eyebrow = header?.querySelector("small");
  const title = header?.querySelector("h2");
  const close = header?.querySelector(":scope > button");
  set(titleBox, "min-width", "0");
  set(titleBox, "max-width", "100%");
  set(eyebrow, "position", "static");
  set(eyebrow, "display", "block");
  set(eyebrow, "margin", "0 0 4px");
  set(eyebrow, "line-height", "1.3");
  set(title, "position", "static");
  set(title, "display", "block");
  set(title, "margin", "0");
  set(title, "max-width", "100%");
  set(title, "line-height", "1.08");
  set(title, "white-space", "normal");
  set(title, "overflow-wrap", "anywhere");
  set(title, "word-break", "normal");
  set(title, "transform", "none");
  set(close, "position", "static");
  set(close, "width", "44px");
  set(close, "height", "44px");
  set(close, "min-width", "44px");

  set(body, "min-width", "0");
  set(body, "min-height", "0");
  set(body, "width", "100%");
  set(body, "max-width", "100%");
  set(body, "overflow", "auto");
  set(body, "box-sizing", "border-box");

  set(studio, "width", "100%");
  set(studio, "max-width", "100%");
  set(studio, "min-width", "0");
  set(studio, "min-height", "0");
  set(studio, "box-sizing", "border-box");
  set(studio, "overflow", "auto");

  set(footer, "min-width", "0");
  set(footer, "max-width", "100%");
}

function sync() {
  raf = 0;
  const layer = findLayer();
  if (layer) {
    layer.dataset.widgetStudioV365 = "sidebar-bounded-no-overlap";
    lock(layer);
  }
}

function schedule() {
  if (raf) return;
  raf = requestAnimationFrame(sync);
}

function boot() {
  schedule();
  [60, 180, 420, 900].forEach((delay) => setTimeout(schedule, delay));
  if (!timer) timer = setInterval(schedule, 250);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  document.addEventListener("click", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
}
