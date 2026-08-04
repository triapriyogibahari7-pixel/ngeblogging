export const RELEASE = "studio-theme-layout-v264-20260804";

const STORAGE_KEY = "ngeblogging-theme-studio-v3";
const AREAS = [
  ["header-primary-left", "Header kiri", "header"],
  ["header-primary-right", "Header kanan", "header"],
  ["top-left-1", "Atas kiri 1", "top"],
  ["top-left-2", "Atas kiri 2", "top"],
  ["top-left-3", "Atas kiri 3", "top"],
  ["top-right-1", "Atas kanan 1", "top"],
  ["top-right-2", "Atas kanan 2", "top"],
  ["top-right-3", "Atas kanan 3", "top"],
  ["before-content", "Sebelum post", "content"],
  ["sidebar-left-1", "Kiri 1", "content"],
  ["sidebar-left-2", "Kiri 2", "content"],
  ["sidebar-left-3", "Kiri 3", "content"],
  ["sidebar-left-4", "Kiri 4", "content"],
  ["sidebar-right-1", "Kanan 1", "content"],
  ["sidebar-right-2", "Kanan 2", "content"],
  ["sidebar-right-3", "Kanan 3", "content"],
  ["sidebar-right-4", "Kanan 4", "content"],
  ["after-content", "Sesudah post", "content"],
  ["bottom-left-1", "Bawah kiri 1", "bottom"],
  ["bottom-left-2", "Bawah kiri 2", "bottom"],
  ["bottom-left-3", "Bawah kiri 3", "bottom"],
  ["bottom-right-1", "Bawah kanan 1", "bottom"],
  ["bottom-right-2", "Bawah kanan 2", "bottom"],
  ["bottom-right-3", "Bawah kanan 3", "bottom"],
  ["footer-copyright-left", "Footer kiri", "footer"],
  ["footer-copyright-right", "Footer kanan", "footer"],
];

const AREA_LABELS = new Map(AREAS.map(([id, label]) => [id, label]));
const QUICK_WIDGETS = [
  ["search", "Pencarian"],
  ["recent-posts", "Post terbaru"],
  ["popular-posts", "Post populer"],
  ["categories", "Kategori"],
  ["tags", "Tag"],
  ["author", "Profil penulis"],
  ["comments", "Komentar"],
  ["custom-html", "HTML / JavaScript"],
];

let observer = null;
let frame = 0;
let popover = null;
let pendingAssignment = null;

function readThemeState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function widgetCounts() {
  const counts = new Map();
  const widgets = readThemeState()?.widgets;
  if (!Array.isArray(widgets)) return counts;
  for (const widget of widgets) {
    if (!widget || widget.enabled === false || !widget.area) continue;
    counts.set(widget.area, (counts.get(widget.area) || 0) + 1);
  }
  return counts;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]));
}

function slotMarkup(id, label, counts) {
  const count = counts.get(id) || 0;
  return `<button type="button" class="tn-layout-slot-v264" data-layout-area-v264="${id}" aria-label="${escapeHtml(label)}, ${count} widget aktif"><span>${escapeHtml(label)}</span><b>${count}</b></button>`;
}

function detailedMapMarkup(counts) {
  const slots = new Map(AREAS.map(([id, label]) => [id, slotMarkup(id, label, counts)]));
  return `
    <div class="tn-layout-map-v264" data-layout-map-v264="${RELEASE}">
      <section class="tn-layout-row-v264 header">${slots.get("header-primary-left")}${slots.get("header-primary-right")}</section>
      <section class="tn-layout-row-v264 top">
        <div>${slots.get("top-left-1")}${slots.get("top-left-2")}${slots.get("top-left-3")}</div>
        <div>${slots.get("top-right-1")}${slots.get("top-right-2")}${slots.get("top-right-3")}</div>
      </section>
      <section class="tn-layout-before-v264">${slots.get("before-content")}</section>
      <section class="tn-layout-content-v264">
        <div class="tn-layout-stack-v264 left">${slots.get("sidebar-left-1")}${slots.get("sidebar-left-2")}${slots.get("sidebar-left-3")}${slots.get("sidebar-left-4")}</div>
        <article class="tn-layout-post-v264" aria-label="Konten utama"><small>POST / PAGE</small><strong>Konten utama</strong><span>Preview tema tetap berada di tengah.</span></article>
        <div class="tn-layout-stack-v264 right">${slots.get("sidebar-right-1")}${slots.get("sidebar-right-2")}${slots.get("sidebar-right-3")}${slots.get("sidebar-right-4")}</div>
      </section>
      <section class="tn-layout-after-v264">${slots.get("after-content")}</section>
      <section class="tn-layout-row-v264 bottom">
        <div>${slots.get("bottom-left-1")}${slots.get("bottom-left-2")}${slots.get("bottom-left-3")}</div>
        <div>${slots.get("bottom-right-1")}${slots.get("bottom-right-2")}${slots.get("bottom-right-3")}</div>
      </section>
      <section class="tn-layout-row-v264 footer">${slots.get("footer-copyright-left")}${slots.get("footer-copyright-right")}</section>
    </div>`;
}

function syncDetailedMap() {
  const studio = document.querySelector(".tn-layout-studio");
  if (!studio) return;
  let map = studio.querySelector(":scope > .tn-layout-map-v264");
  const markup = detailedMapMarkup(widgetCounts());
  if (!map) {
    studio.dataset.themeLayoutV264 = RELEASE;
    const canvas = studio.querySelector(":scope > .tn-layout-canvas");
    canvas?.insertAdjacentHTML("afterend", markup);
    map = studio.querySelector(":scope > .tn-layout-map-v264");
  } else if (map.outerHTML !== markup.trim()) {
    map.outerHTML = markup.trim();
  }
}

function addAreaOptions(select) {
  if (!select) return;
  const current = select.value;
  const existing = new Set([...select.options].map((option) => option.value));
  if (![...AREA_LABELS.keys()].every((id) => existing.has(id))) {
    for (const [id, label] of AREA_LABELS) {
      if (existing.has(id)) continue;
      const option = document.createElement("option");
      option.value = id;
      option.textContent = label;
      select.append(option);
    }
  }
  if (current && [...select.options].some((option) => option.value === current)) select.value = current;
  select.dataset.layoutAreasV264 = String(AREAS.length);
}

function syncWidgetStudioAreas() {
  document.querySelectorAll(".tn-widget-studio .tn-widget-settings select").forEach(addAreaOptions);
}

function setReactSelect(select, value) {
  addAreaOptions(select);
  if (![...select.options].some((option) => option.value === value)) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function openWidgetStudio() {
  const button = document.querySelector(".tn-layout-studio-header button");
  if (!button) return false;
  button.click();
  return true;
}

function applyPendingAssignment() {
  if (!pendingAssignment) return;
  const { widgetId, area } = pendingAssignment;
  const widgetName = QUICK_WIDGETS.find(([id]) => id === widgetId)?.[1];
  if (!widgetName) { pendingAssignment = null; return; }
  const articles = [...document.querySelectorAll(".tn-widget-studio .tn-widget-grid>article")];
  const card = articles.find((article) => String(article.querySelector(".tn-widget-toggle b")?.textContent || "").trim().toLowerCase() === widgetName.toLowerCase());
  if (!card) return;

  if (!card.classList.contains("active")) {
    card.querySelector(".tn-widget-toggle")?.click();
    return;
  }
  const select = card.querySelector(".tn-widget-settings select");
  if (!select) return;
  if (!setReactSelect(select, area)) return;
  card.dataset.layoutAssignedV264 = area;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  select.focus({ preventScroll: true });
  pendingAssignment = null;
  window.setTimeout(schedule, 80);
}

function removePopover() {
  popover?.remove();
  popover = null;
}

function positionPopover(panel, trigger) {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(330, window.innerWidth - 24);
  const height = Math.min(panel.scrollHeight || 430, Math.max(220, window.innerHeight - 24));
  const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12));
  const below = rect.bottom + 8;
  const top = below + height <= window.innerHeight - 8 ? below : Math.max(12, rect.top - height - 8);
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

function openPopover(trigger) {
  removePopover();
  const area = trigger.dataset.layoutAreaV264;
  const label = AREA_LABELS.get(area) || "Area widget";
  const panel = document.createElement("div");
  panel.className = "tn-layout-popover-v264";
  panel.dataset.area = area;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", `Pilih widget untuk ${label}`);
  panel.innerHTML = `
    <header><div><small>AREA</small><b>${escapeHtml(label)}</b></div><button type="button" data-close aria-label="Tutup">×</button></header>
    <div class="tn-layout-quick-v264">
      ${QUICK_WIDGETS.map(([id, name]) => `<button type="button" data-widget="${id}"><span>${escapeHtml(name)}</span><b>+</b></button>`).join("")}
    </div>
    <footer>
      <button type="button" data-all-widgets>Semua 26 widget</button>
      <button type="button" data-code-editor>Edit HTML / CSS / JavaScript</button>
    </footer>`;
  document.body.append(panel);
  popover = panel;
  positionPopover(panel, trigger);
  panel.querySelector("button")?.focus({ preventScroll: true });
}

function openCodeEditor() {
  const button = [...document.querySelectorAll(".tn-hero-actions button,.tn-command nav button")].find((node) => /Edit HTML/i.test(node.textContent || ""));
  button?.click();
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioThemeLayoutV264 = RELEASE;
  syncDetailedMap();
  syncWidgetStudioAreas();
  applyPendingAssignment();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const slot = event.target.closest?.(".tn-layout-slot-v264");
    if (slot) {
      event.preventDefault();
      event.stopPropagation();
      openPopover(slot);
      return;
    }

    const action = event.target.closest?.(".tn-layout-popover-v264 button");
    if (action) {
      event.preventDefault();
      const area = action.closest(".tn-layout-popover-v264")?.dataset.area || "";
      if (action.dataset.close !== undefined) removePopover();
      else if (action.dataset.widget) {
        pendingAssignment = { widgetId: action.dataset.widget, area };
        removePopover();
        openWidgetStudio();
        window.setTimeout(schedule, 30);
      } else if (action.dataset.allWidgets !== undefined) {
        removePopover();
        openWidgetStudio();
      } else if (action.dataset.codeEditor !== undefined) {
        removePopover();
        openCodeEditor();
      }
      return;
    }

    if (popover && !event.target.closest?.(".tn-layout-popover-v264")) removePopover();
    window.setTimeout(schedule, 40);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") removePopover();
  }, true);

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) schedule();
  });
  window.addEventListener("resize", () => {
    if (popover) {
      const area = popover.dataset.area;
      const trigger = document.querySelector(`.tn-layout-slot-v264[data-layout-area-v264="${CSS.escape(area)}"]`);
      if (trigger) positionPopover(popover, trigger);
    }
    schedule();
  }, { passive: true });

  observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.type === "attributes")) schedule();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  schedule();
}
