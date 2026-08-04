export const RELEASE = "studio-theme-layout-v264-20260804-r2";

const STORAGE_KEY = "ngeblogging-theme-studio-v3";
const AREAS = [
  ["header-primary-left", "Header kiri"], ["header-primary-right", "Header kanan"],
  ["top-left-1", "Atas kiri 1"], ["top-left-2", "Atas kiri 2"], ["top-left-3", "Atas kiri 3"],
  ["top-right-1", "Atas kanan 1"], ["top-right-2", "Atas kanan 2"], ["top-right-3", "Atas kanan 3"],
  ["before-content", "Sebelum post"],
  ["sidebar-left-1", "Kiri 1"], ["sidebar-left-2", "Kiri 2"], ["sidebar-left-3", "Kiri 3"], ["sidebar-left-4", "Kiri 4"],
  ["sidebar-right-1", "Kanan 1"], ["sidebar-right-2", "Kanan 2"], ["sidebar-right-3", "Kanan 3"], ["sidebar-right-4", "Kanan 4"],
  ["after-content", "Sesudah post"],
  ["bottom-left-1", "Bawah kiri 1"], ["bottom-left-2", "Bawah kiri 2"], ["bottom-left-3", "Bawah kiri 3"],
  ["bottom-right-1", "Bawah kanan 1"], ["bottom-right-2", "Bawah kanan 2"], ["bottom-right-3", "Bawah kanan 3"],
  ["footer-copyright-left", "Footer kiri"], ["footer-copyright-right", "Footer kanan"],
];

const AREA_LABELS = new Map(AREAS);
const QUICK_WIDGETS = [
  ["search", "Pencarian"], ["recent-posts", "Post terbaru"], ["popular-posts", "Post populer"],
  ["categories", "Kategori"], ["tags", "Tag"], ["author", "Profil penulis"],
  ["comments", "Komentar"], ["custom-html", "HTML / JavaScript"],
];

let raf = 0;
let popover = null;
let pendingAssignment = null;

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
}

function readThemeState() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return state && typeof state === "object" ? state : null;
  } catch {
    return null;
  }
}

function activeWidgetCounts() {
  const counts = new Map();
  const widgets = readThemeState()?.widgets;
  if (!Array.isArray(widgets)) return counts;
  for (const widget of widgets) {
    if (!widget || widget.enabled === false || !widget.area) continue;
    counts.set(widget.area, (counts.get(widget.area) || 0) + 1);
  }
  return counts;
}

function slot(id) {
  const label = AREA_LABELS.get(id) || id;
  return `<button type="button" class="tn-layout-slot-v264" data-layout-area-v264="${id}" aria-label="${escapeHtml(label)}"><span>${escapeHtml(label)}</span><b>0</b></button>`;
}

function createMap() {
  const wrapper = document.createElement("div");
  wrapper.className = "tn-layout-map-v264";
  wrapper.dataset.layoutMapV264 = RELEASE;
  wrapper.innerHTML = `
    <section class="tn-layout-row-v264 header">${slot("header-primary-left")}${slot("header-primary-right")}</section>
    <section class="tn-layout-row-v264 top"><div>${slot("top-left-1")}${slot("top-left-2")}${slot("top-left-3")}</div><div>${slot("top-right-1")}${slot("top-right-2")}${slot("top-right-3")}</div></section>
    <section class="tn-layout-before-v264">${slot("before-content")}</section>
    <section class="tn-layout-content-v264">
      <div class="tn-layout-stack-v264 left">${slot("sidebar-left-1")}${slot("sidebar-left-2")}${slot("sidebar-left-3")}${slot("sidebar-left-4")}</div>
      <article class="tn-layout-post-v264" aria-label="Konten utama"><small>POST / PAGE</small><strong>Konten utama</strong><span>Preview tema berada di tengah.</span></article>
      <div class="tn-layout-stack-v264 right">${slot("sidebar-right-1")}${slot("sidebar-right-2")}${slot("sidebar-right-3")}${slot("sidebar-right-4")}</div>
    </section>
    <section class="tn-layout-after-v264">${slot("after-content")}</section>
    <section class="tn-layout-row-v264 bottom"><div>${slot("bottom-left-1")}${slot("bottom-left-2")}${slot("bottom-left-3")}</div><div>${slot("bottom-right-1")}${slot("bottom-right-2")}${slot("bottom-right-3")}</div></section>
    <section class="tn-layout-row-v264 footer">${slot("footer-copyright-left")}${slot("footer-copyright-right")}</section>`;
  return wrapper;
}

function syncMap() {
  const studio = document.querySelector(".tn-layout-studio");
  if (!studio) return;
  let map = studio.querySelector(":scope > .tn-layout-map-v264");
  if (!map) {
    map = createMap();
    const canvas = studio.querySelector(":scope > .tn-layout-canvas");
    if (canvas) canvas.insertAdjacentElement("afterend", map);
    else studio.prepend(map);
    studio.dataset.themeLayoutV264 = RELEASE;
  }
  const counts = activeWidgetCounts();
  map.querySelectorAll("[data-layout-area-v264]").forEach((button) => {
    const area = button.dataset.layoutAreaV264;
    const count = counts.get(area) || 0;
    const badge = button.querySelector(":scope > b");
    if (badge && badge.textContent !== String(count)) badge.textContent = String(count);
    const label = AREA_LABELS.get(area) || area;
    const aria = `${label}, ${count} widget aktif`;
    if (button.getAttribute("aria-label") !== aria) button.setAttribute("aria-label", aria);
  });
}

function ensureAreaOptions(select) {
  if (!select) return;
  const current = select.value;
  const existing = new Set([...select.options].map((option) => option.value));
  for (const [id, label] of AREAS) {
    if (existing.has(id)) continue;
    const option = document.createElement("option");
    option.value = id;
    option.textContent = label;
    select.append(option);
  }
  if (current && [...select.options].some((option) => option.value === current)) select.value = current;
  select.dataset.layoutAreasV264 = "26";
}

function syncWidgetStudio() {
  document.querySelectorAll(".tn-widget-studio .tn-widget-settings select").forEach(ensureAreaOptions);
}

function setReactSelect(select, value) {
  ensureAreaOptions(select);
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

  const cards = [...document.querySelectorAll(".tn-widget-studio .tn-widget-grid>article")];
  const card = cards.find((article) => String(article.querySelector(".tn-widget-toggle b")?.textContent || "").trim().toLowerCase() === widgetName.toLowerCase());
  if (!card) return;
  if (!card.classList.contains("active")) {
    card.querySelector(".tn-widget-toggle")?.click();
    return;
  }
  const select = card.querySelector(".tn-widget-settings select");
  if (!select || !setReactSelect(select, area)) return;
  card.dataset.layoutAssignedV264 = area;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  select.focus({ preventScroll: true });
  pendingAssignment = null;
}

function closePopover() {
  popover?.remove();
  popover = null;
}

function placePopover(panel, trigger) {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(330, window.innerWidth - 24);
  panel.style.width = `${width}px`;
  const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12));
  const estimatedHeight = Math.min(panel.scrollHeight || 420, Math.max(220, window.innerHeight - 24));
  const below = rect.bottom + 8;
  const top = below + estimatedHeight <= window.innerHeight - 8 ? below : Math.max(12, rect.top - estimatedHeight - 8);
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

function openPopover(trigger) {
  closePopover();
  const area = trigger.dataset.layoutAreaV264;
  const label = AREA_LABELS.get(area) || "Area widget";
  const panel = document.createElement("div");
  panel.className = "tn-layout-popover-v264";
  panel.dataset.area = area;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", `Pilih widget untuk ${label}`);
  panel.innerHTML = `
    <header><div><small>AREA</small><b>${escapeHtml(label)}</b></div><button type="button" data-close aria-label="Tutup">×</button></header>
    <div class="tn-layout-quick-v264">${QUICK_WIDGETS.map(([id, name]) => `<button type="button" data-widget="${id}"><span>${escapeHtml(name)}</span><b>+</b></button>`).join("")}</div>
    <footer><button type="button" data-all-widgets>Semua 26 widget</button><button type="button" data-code-editor>Edit HTML / CSS / JavaScript</button></footer>`;
  document.body.append(panel);
  popover = panel;
  placePopover(panel, trigger);
  panel.querySelector("button")?.focus({ preventScroll: true });
}

function openCodeEditor() {
  const button = [...document.querySelectorAll(".tn-hero-actions button,.tn-command nav button")].find((node) => /Edit HTML/i.test(node.textContent || ""));
  button?.click();
}

function sync() {
  raf = 0;
  document.documentElement.dataset.studioThemeLayoutV264 = RELEASE;
  syncMap();
  syncWidgetStudio();
  applyPendingAssignment();
}

function schedule() {
  if (raf) return;
  raf = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const slotButton = event.target.closest?.(".tn-layout-slot-v264");
    if (slotButton) {
      event.preventDefault();
      event.stopPropagation();
      openPopover(slotButton);
      return;
    }

    const action = event.target.closest?.(".tn-layout-popover-v264 button");
    if (action) {
      event.preventDefault();
      const area = action.closest(".tn-layout-popover-v264")?.dataset.area || "";
      if (action.dataset.close !== undefined) closePopover();
      else if (action.dataset.widget) {
        pendingAssignment = { widgetId: action.dataset.widget, area };
        closePopover();
        openWidgetStudio();
        setTimeout(schedule, 30);
      } else if (action.dataset.allWidgets !== undefined) {
        closePopover();
        openWidgetStudio();
      } else if (action.dataset.codeEditor !== undefined) {
        closePopover();
        openCodeEditor();
      }
      return;
    }

    if (popover && !event.target.closest?.(".tn-layout-popover-v264")) closePopover();
    setTimeout(schedule, 25);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePopover();
  }, true);

  window.addEventListener("storage", (event) => { if (event.key === STORAGE_KEY) schedule(); });
  window.addEventListener("resize", schedule, { passive: true });

  new MutationObserver((records) => {
    if (records.some((record) => record.addedNodes.length || record.removedNodes.length)) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true });

  schedule();
}
