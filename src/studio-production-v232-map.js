import "./studio-production-v232-map.css";

const RELEASE = "studio-production-v232-layout-target-companion-20260803";
let frame = 0;

function targetArea() {
  return document.documentElement.dataset.themeTargetAreaV232 || "sidebar-right-1";
}

function applyTargetToWidget(article) {
  if (!article) return;
  const select = article.querySelector(".tn-widget-settings select");
  if (!select || !select.querySelector(`option[value="${CSS.escape(targetArea())}"]`)) return;
  if (select.value === targetArea()) return;
  select.value = targetArea();
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function normalizeWidgetTarget() {
  const studio = document.querySelector(".tn-widget-studio");
  if (!studio) return;
  studio.dataset.v232TargetArea = targetArea();

  studio.querySelectorAll(".tn-widget-grid>article").forEach((article) => {
    const toggle = article.querySelector(".tn-widget-toggle");
    if (!toggle || toggle.dataset.v232TargetBound === "true") return;
    toggle.dataset.v232TargetBound = "true";
    toggle.addEventListener("click", () => {
      requestAnimationFrame(() => requestAnimationFrame(() => applyTargetToWidget(article)));
    });
  });
}

function normalizeMapAccessibility() {
  const map = document.getElementById("ngeblogging-layout-map");
  if (!map) return;
  map.dataset.v232LayoutCompanion = "exact-green-reference";
  map.querySelectorAll(".tn-layout-slot-v170,.content-main").forEach((slot) => {
    slot.removeAttribute("aria-disabled");
    slot.removeAttribute("inert");
    if (slot.tagName === "BUTTON") slot.type = "button";
  });
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioProductionV232Map = RELEASE;
  normalizeMapAccessibility();
  normalizeWidgetTarget();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-theme-target-area-v232"],
});
document.addEventListener("click", (event) => {
  const slot = event.target.closest("#ngeblogging-layout-map .tn-layout-slot-v170");
  if (!slot) return;
  const area = [...slot.classList].find((name) => /^(header|sidebar|footer|below-header|top-wide|before-content|after-content|copyright)/.test(name));
  if (area) document.documentElement.dataset.themeTargetAreaV232 = area;
}, true);
schedule();

export { RELEASE };
