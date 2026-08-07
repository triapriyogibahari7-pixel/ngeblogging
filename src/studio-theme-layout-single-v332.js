import "./studio-theme-layout-single-v332.css";

export const STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332 = "studio-theme-layout-single-v332-20260807";
export const THEME_LAYOUT_AREA_COUNT_V332 = 26;

const STUDIO_SELECTOR = ".tn-layout-studio";
const MAP_SELECTOR = '[data-theme-layout-v312],[class*="tn-layout-map"][class*="v312"]';
const MODEL_SELECTOR = '.tn-layout-model-v312,[class*="tn-layout-model-"][class*="v312"]';
let scheduledFrame = 0;

const SLOT_KEYS = [
  "header-left", "header-right",
  "top-left-1", "top-right-1", "top-left-2", "top-right-2", "top-left-3", "top-right-3",
  "before-post",
  "left-1", "left-2", "left-3", "left-4",
  "right-1", "right-2", "right-3", "right-4",
  "after-post",
  "bottom-left-1", "bottom-right-1", "bottom-left-2", "bottom-right-2", "bottom-left-3", "bottom-right-3",
  "footer-left", "footer-right",
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numbered(text, direction, number, zone) {
  return text.includes(direction) && text.includes(String(number)) && text.includes(zone);
}

function classifyAreaButton(button) {
  const text = normalizeText(button?.textContent);
  if (!text || /model editorial|model majalah|atur widget|buka semua|widget aktif/.test(text)) return "";

  if (text.includes("header") && text.includes("kiri")) return "header-left";
  if (text.includes("header") && text.includes("kanan")) return "header-right";
  if (text.includes("sebelum post") || text.includes("sebelum posting") || text.includes("di atas postingan")) return "before-post";
  if (text.includes("sesudah post") || text.includes("setelah post") || text.includes("setelah posting") || text.includes("di bawah postingan")) return "after-post";
  if (text.includes("footer") && text.includes("kiri")) return "footer-left";
  if (text.includes("footer") && text.includes("kanan")) return "footer-right";

  for (let number = 1; number <= 3; number += 1) {
    if (numbered(text, "kiri", number, "atas")) return `top-left-${number}`;
    if (numbered(text, "kanan", number, "atas")) return `top-right-${number}`;
    if (numbered(text, "kiri", number, "bawah")) return `bottom-left-${number}`;
    if (numbered(text, "kanan", number, "bawah")) return `bottom-right-${number}`;
  }

  for (let number = 1; number <= 4; number += 1) {
    const left = text.includes(`kiri ${number}`) || text.includes(`sidebar kiri ${number}`) || text.includes(`kiri kotak ${number}`);
    const right = text.includes(`kanan ${number}`) || text.includes(`sidebar kanan ${number}`) || text.includes(`kanan kotak ${number}`);
    if (left && !text.includes("atas") && !text.includes("bawah") && !text.includes("header") && !text.includes("footer")) return `left-${number}`;
    if (right && !text.includes("atas") && !text.includes("bawah") && !text.includes("header") && !text.includes("footer")) return `right-${number}`;
  }

  return "";
}

function areaButtons(map) {
  const byKey = new Map();
  [...map.querySelectorAll("button,[role='button']")].forEach((button) => {
    const key = classifyAreaButton(button);
    if (key && !byKey.has(key)) byKey.set(key, button);
  });
  return byKey;
}

function countFrom(button) {
  const match = String(button?.textContent || "").match(/\b(\d{1,3})\b/);
  return match ? match[1] : "0";
}

function makeSlot(byKey, key, label) {
  const source = byKey.get(key);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tn-v332-slot";
  button.dataset.v332Area = key;
  if (!source) button.dataset.v332Missing = "true";
  button.setAttribute("aria-label", source ? `Atur ${label}` : `${label} belum tersedia`);

  const count = document.createElement("span");
  count.className = "tn-v332-slot-count";
  count.textContent = countFrom(source);
  const text = document.createElement("span");
  text.className = "tn-v332-slot-label";
  text.textContent = label;
  button.append(count, text);

  if (source) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      source.click();
      schedule(30);
    });
  } else button.disabled = true;
  return button;
}

function pair(byKey, leftKey, leftLabel, rightKey, rightLabel) {
  const row = document.createElement("div");
  row.className = "tn-v332-pair";
  row.append(makeSlot(byKey, leftKey, leftLabel), makeSlot(byKey, rightKey, rightLabel));
  return row;
}

function band(byKey, title, leftKey, leftLabel, rightKey, rightLabel) {
  const wrap = document.createElement("section");
  wrap.className = "tn-v332-band";
  const heading = document.createElement("span");
  heading.className = "tn-v332-band-title";
  heading.textContent = title;
  const grid = document.createElement("div");
  grid.className = "tn-v332-band-grid";
  grid.append(makeSlot(byKey, leftKey, leftLabel), makeSlot(byKey, rightKey, rightLabel));
  wrap.append(heading, grid);
  return wrap;
}

function fullSlot(byKey, key, label) {
  const wrap = document.createElement("div");
  wrap.append(makeSlot(byKey, key, label));
  return wrap;
}

function buildMainRow(byKey) {
  const row = document.createElement("section");
  row.className = "tn-v332-main-row";
  const left = document.createElement("div");
  left.className = "tn-v332-side-stack";
  const right = document.createElement("div");
  right.className = "tn-v332-side-stack";
  for (let index = 1; index <= 4; index += 1) {
    left.append(makeSlot(byKey, `left-${index}`, `Sidebar kiri · kotak ${index}`));
    right.append(makeSlot(byKey, `right-${index}`, `Sidebar kanan · kotak ${index}`));
  }
  const main = document.createElement("div");
  main.className = "tn-v332-main-canvas";
  main.innerHTML = '<div><small>POST / PAGE</small><b>Kotak postingan / Page</b><span>Konten utama selalu berada di tengah.</span></div>';
  row.append(left, main, right);
  return row;
}

function findWidgetAction(studio) {
  return [...studio.querySelectorAll("button")].find((button) => {
    if (button.closest(".tn-layout-single-v332")) return false;
    const text = normalizeText(button.textContent);
    return text.includes("atur widget") || text.includes("buka semua") && text.includes("widget");
  }) || null;
}

function makeSingleMap(studio, sourceMap, byKey) {
  const shell = document.createElement("section");
  shell.className = "tn-layout-single-v332";
  shell.dataset.themeLayoutSingleV332 = STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332;
  shell.__v332SourceMap = sourceMap;

  const head = document.createElement("header");
  head.className = "tn-v332-map-head";
  const title = document.createElement("div");
  title.innerHTML = "<small>PETA TATA LETAK SITUS</small><h3>Satu denah, dari header sampai copyright.</h3><p>Semua area tetap memakai 26 area widget asli tema; denah kedua yang berhimpitan tidak ditampilkan lagi.</p>";
  const widgetAction = document.createElement("button");
  widgetAction.type = "button";
  widgetAction.className = "tn-v332-widget-action";
  widgetAction.textContent = "▦  Atur widget";
  widgetAction.addEventListener("click", () => findWidgetAction(studio)?.click());
  head.append(title, widgetAction);

  const scroll = document.createElement("div");
  scroll.className = "tn-v332-map-scroll";
  const map = document.createElement("div");
  map.className = "tn-v332-map";
  map.dataset.v332AreaCount = String(SLOT_KEYS.length);

  map.append(
    pair(byKey, "header-left", "Header kiri · kotak 1", "header-right", "Header kanan · kotak 1"),
    band(byKey, "Kotak panjang di bawah header", "top-left-1", "Area header bawah · kiri", "top-right-1", "Area header bawah · kanan"),
    pair(byKey, "top-left-2", "Header kiri · kotak 2", "top-right-2", "Header kanan · kotak 2"),
    band(byKey, "Area atas", "top-left-3", "Area atas · kiri", "top-right-3", "Area atas · kanan"),
    fullSlot(byKey, "before-post", "Kotak di atas postingan"),
    buildMainRow(byKey),
    fullSlot(byKey, "after-post", "Kotak panjang di bawah postingan"),
    pair(byKey, "bottom-left-1", "Footer kiri · kotak 1", "bottom-right-1", "Footer kanan · kotak 1"),
    pair(byKey, "bottom-left-2", "Footer kiri · kotak 2", "bottom-right-2", "Footer kanan · kotak 2"),
    band(byKey, "Kotak footer panjang", "bottom-left-3", "Area footer panjang · kiri", "bottom-right-3", "Area footer panjang · kanan"),
    pair(byKey, "footer-left", "Footer kiri", "footer-right", "Footer kanan"),
  );

  const copyright = document.createElement("div");
  copyright.className = "tn-v332-band";
  copyright.innerHTML = '<span class="tn-v332-band-title">Copyright</span><div class="tn-v332-main-canvas" style="min-height:76px!important"><div><b>Copyright / identitas situs</b><span>Mengikuti tema aktif dan konfigurasi footer.</span></div></div>';
  map.append(copyright);
  scroll.append(map);
  shell.append(head, scroll);
  return shell;
}

function markSourceHidden(studio, maps) {
  maps.forEach((map) => {
    map.dataset.v332SourceMap = "hidden";
    const model = map.closest(MODEL_SELECTOR);
    if (model && model !== studio) model.dataset.v332SourceModel = "hidden";
  });
}

export function normalizeSingleThemeLayoutV332(root = document) {
  let ready = 0;
  root.querySelectorAll(STUDIO_SELECTOR).forEach((studio) => {
    const maps = [...studio.querySelectorAll(MAP_SELECTOR)];
    if (!maps.length) return;
    const sourceMap = maps[0];
    const byKey = areaButtons(sourceMap);
    if (byKey.size < 20) return;

    let shell = studio.querySelector(":scope > .tn-layout-single-v332");
    if (!shell || shell.__v332SourceMap !== sourceMap) {
      shell?.remove();
      shell = makeSingleMap(studio, sourceMap, byKey);
      studio.insertAdjacentElement("afterbegin", shell);
    } else {
      shell.querySelectorAll(".tn-v332-slot[data-v332-area]").forEach((slot) => {
        const source = byKey.get(slot.dataset.v332Area);
        const count = slot.querySelector(".tn-v332-slot-count");
        if (source && count) count.textContent = countFrom(source);
      });
    }

    markSourceHidden(studio, maps);
    studio.dataset.v332SingleLayout = "ready";
    studio.dataset.v332OriginalAreaCount = String(byKey.size);
    ready += 1;
  });
  return ready;
}

function run() {
  scheduledFrame = 0;
  document.documentElement.dataset.studioThemeLayoutSingleV332 = STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332;
  normalizeSingleThemeLayoutV332(document);
}

function schedule(delay = 0) {
  if (typeof window === "undefined") return;
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (scheduledFrame) return;
  scheduledFrame = window.requestAnimationFrame(run);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => { schedule(); schedule(70); schedule(180); }, { passive: true });
  window.addEventListener("pageshow", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(), { passive: true });
  window.addEventListener("orientationchange", () => schedule(40), { passive: true });
  window.addEventListener("hashchange", () => schedule(20), { passive: true });
  window.addEventListener("popstate", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:active-site-change", () => schedule(30), { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once: true });
  else schedule();
  schedule(250);
  schedule(800);
}
