import "./studio-theme-card-preview-v440.css";
import { BUILT_IN_THEMES, buildThemeSrcDoc, configFromTheme } from "./theme-system";

export const STUDIO_THEME_CARD_PREVIEW_V440 = "studio-theme-card-preview-v440-20261128";

/* Replaces the colour-block mock on every theme card with a real, scaled-down,
 * non-interactive render of the theme itself. Only the card preview area is
 * touched; the mock node is hidden by CSS (never removed) so React stays in sync.
 * The preview is always rendered at desktop-site width (1280px) and scaled to fill the card. */
const BASE_WIDTH = 1280;
const CARD = ".tn-theme-grid > article";
const owners = new WeakMap();
let index = null;
let queued = 0;
let loader = null;
let resizer = null;

function themeIndex() {
  if (index) return index;
  index = new Map();
  for (const theme of BUILT_IN_THEMES) index.set(`${theme.name}|${theme.category} · ${theme.layout}`, theme);
  return index;
}

function force(frame, values) {
  for (const [name, value] of Object.entries(values)) frame.style.setProperty(name, value, "important");
}

function fit(box) {
  const frame = box.querySelector("iframe");
  if (!frame) return;
  const width = box.clientWidth, height = box.clientHeight;
  if (!width || !height) { requestAnimationFrame(() => fit(box)); return; }
  const scale = width / BASE_WIDTH;
  force(frame, {
    position: "absolute", left: "0", top: "0", right: "auto", bottom: "auto", margin: "0", border: "0",
    width: `${BASE_WIDTH}px`, "min-width": `${BASE_WIDTH}px`, "max-width": "none",
    height: `${Math.ceil(height / scale)}px`, "min-height": "0", "max-height": "none",
    "transform-origin": "0 0", transform: `scale(${scale})`, "pointer-events": "none",
  });
}

function load(box) {
  const theme = owners.get(box);
  if (!theme || box.querySelector("iframe")) return;
  let doc = "";
  try { doc = buildThemeSrcDoc(theme.code, configFromTheme(theme), []); }
  catch (error) { box.dataset.state = "error"; return; }
  const frame = document.createElement("iframe");
  frame.title = `Pratinjau ${theme.name}`;
  frame.setAttribute("sandbox", "");
  frame.setAttribute("tabindex", "-1");
  frame.setAttribute("aria-hidden", "true");
  force(frame, { width: `${BASE_WIDTH}px`, "min-width": `${BASE_WIDTH}px`, "max-width": "none" });
  frame.srcdoc = doc;
  box.appendChild(frame);
  box.dataset.state = "ready";
  fit(box);
}

function mount(card) {
  if (card.dataset.previewV440) return;
  const button = card.querySelector(":scope > .tn-theme-preview");
  const meta = card.querySelector(":scope > div > small");
  const title = card.querySelector(":scope > div > h3");
  if (!button || !meta || !title) return;
  const theme = themeIndex().get(`${title.textContent}|${meta.textContent}`);
  if (!theme) return;
  card.dataset.previewV440 = "1";
  const box = document.createElement("div");
  box.className = "tn-live-preview-v440";
  box.dataset.themeId = theme.id;
  box.dataset.state = "waiting";
  box.setAttribute("aria-hidden", "true");
  button.insertBefore(box, button.firstChild);
  owners.set(box, theme);
  if (resizer) resizer.observe(box);
  if (loader) loader.observe(box); else load(box);
}

function scan() {
  queued = 0;
  if (!document.querySelector(".tn-theme-grid")) return;
  document.querySelectorAll(CARD).forEach(mount);
}

function schedule() {
  if (queued) return;
  queued = requestAnimationFrame(scan);
}

function boot() {
  if (typeof IntersectionObserver !== "undefined") {
    loader = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { load(entry.target); loader.unobserve(entry.target); }
    }, { rootMargin: "400px 0px" });
  }
  if (typeof ResizeObserver !== "undefined") resizer = new ResizeObserver((entries) => entries.forEach((entry) => fit(entry.target)));
  schedule();
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
}
