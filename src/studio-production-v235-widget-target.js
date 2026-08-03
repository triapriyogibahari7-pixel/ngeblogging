const RELEASE = "studio-production-v235-widget-target-20260803";
const LABELS = new Map([
  ["search", "pencarian"], ["recent-posts", "post terbaru"], ["popular-posts", "post populer"],
  ["categories", "kategori"], ["tags", "tag"], ["author", "profil penulis"],
  ["comments", "komentar"], ["custom-html", "html / javascript"],
]);
const SLOT_KEYS = [
  "top-left-1","top-left-2","top-left-3","top-right-1","top-right-2","top-right-3",
  "before-content","sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4",
  "sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4","after-content",
  "bottom-left-1","bottom-left-2","bottom-left-3","bottom-right-1","bottom-right-2","bottom-right-3",
];
let pending = null;
let frame = 0;

function slotKey(node) {
  if (!node) return "";
  if (node.classList.contains("content-main")) return "after-content";
  return SLOT_KEYS.find((key) => node.classList.contains(key)) || "";
}

function setReactSelect(select, value) {
  const option = [...select.options].find((item) => item.value === value);
  if (!option) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function applyPending() {
  frame = 0;
  if (!pending) return;
  const label = LABELS.get(pending.widgetId);
  if (!label) { pending = null; return; }
  const card = [...document.querySelectorAll(".tn-widget-studio .tn-widget-grid>article")].find((item) => {
    return String(item.querySelector(".tn-widget-toggle b")?.textContent || "").trim().toLowerCase() === label;
  });
  if (!card) {
    if (pending.attempts++ < 45) frame = requestAnimationFrame(applyPending);
    else pending = null;
    return;
  }
  if (!card.classList.contains("active")) {
    card.querySelector(".tn-widget-toggle")?.click();
    if (pending.attempts++ < 45) frame = requestAnimationFrame(applyPending);
    return;
  }
  const select = card.querySelector(".tn-widget-settings select");
  if (!select) {
    if (pending.attempts++ < 45) frame = requestAnimationFrame(applyPending);
    else pending = null;
    return;
  }
  const applied = setReactSelect(select, pending.area);
  card.dataset.v235AssignedArea = applied ? pending.area : "area-unavailable";
  card.scrollIntoView({ block: "center", behavior: "smooth" });
  select.focus({ preventScroll: true });
  pending = null;
}

window.addEventListener("click", (event) => {
  const button = event.target.closest?.(".v235-layout-popover button[data-widget]");
  if (!button) return;
  const panel = button.closest(".v235-layout-popover");
  const area = slotKey(panel?.__trigger);
  if (!area) return;
  pending = { widgetId: button.dataset.widget, area, attempts: 0 };
  if (!frame) frame = requestAnimationFrame(applyPending);
}, true);

document.documentElement.dataset.studioProductionV235WidgetTarget = RELEASE;
export { RELEASE, SLOT_KEYS, slotKey };