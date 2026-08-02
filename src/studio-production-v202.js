import "./studio-production-v202.css";

const RELEASE = "studio-production-v202-20260802";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function text(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function setButtonLabel(button, label) {
  if (!button) return;
  const textNodes = [...button.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
  if (textNodes.length) {
    textNodes.forEach((node, index) => { node.textContent = index === 0 ? ` ${label}` : ""; });
  } else {
    let span = button.querySelector(":scope > .v202-button-label");
    if (!span) {
      span = document.createElement("span");
      span.className = "v202-button-label";
      button.append(span);
    }
    span.textContent = label;
  }
  button.setAttribute("aria-label", label);
  button.dataset.v202Label = label;
}

function mobileLike() {
  const root = document.documentElement;
  const family = root.dataset.studioResponsiveMode
    || root.dataset.studioResponsiveFamilyV193
    || root.dataset.studioResponsiveFamily
    || "";
  const physical = root.dataset.studioPhysicalMobileV193 === "true"
    || root.dataset.studioPhysicalMobileV191 === "true"
    || root.dataset.studioHandheld === "true"
    || MOBILE_FAMILIES.has(family);
  let physicalWidth = 0;
  try {
    physicalWidth = Number.parseFloat(getComputedStyle(root).getPropertyValue("--studio-physical-width")) || 0;
  } catch {
    physicalWidth = 0;
  }
  const uaMobile = navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "");
  return physical || uaMobile || (physicalWidth > 0 && physicalWidth <= 760) || window.innerWidth <= 760;
}

function hideV202(node, reason) {
  if (!node) return;
  node.dataset.v202Hidden = reason || "duplicate";
  node.setAttribute("aria-hidden", "true");
  node.tabIndex = -1;
}

function showV202(node) {
  if (!node) return;
  delete node.dataset.v202Hidden;
  node.removeAttribute("aria-hidden");
  if (node.tabIndex < 0) node.tabIndex = 0;
}

function ensureLayoutButton(hero, customize) {
  let layout = hero.querySelector(':scope > button[data-v202-theme-action="layout"]');
  if (!layout) {
    layout = document.createElement("button");
    layout.type = "button";
    layout.dataset.v202ThemeAction = "layout";
    layout.className = "v202-theme-layout-button";
    layout.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></svg><span>Edit Tata Letak</span>';
    layout.addEventListener("click", () => {
      const target = document.querySelector(".tn-layout-studio");
      if (!target) return;
      target.setAttribute("tabindex", "-1");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => target.focus({ preventScroll: true }), 260);
    });
    if (customize?.nextSibling) hero.insertBefore(layout, customize.nextSibling);
    else hero.append(layout);
  }
  showV202(layout);
  setButtonLabel(layout, "Edit Tata Letak");
  return layout;
}

function normalizeThemeGroup(group, { hero = false } = {}) {
  if (!group) return;
  const buttons = [...group.querySelectorAll("button")];
  const customize = buttons.find((button) => /sesuaikan/i.test(text(button))) || null;
  const site = buttons.find((button) => /lihat situs|buka situs/i.test(text(button))) || null;
  const layout = hero ? ensureLayoutButton(group, customize) : null;

  const refreshed = [...group.querySelectorAll("button")];
  const codeCandidates = refreshed.filter((button) => {
    if (button === layout) return false;
    const label = text(button);
    return /edit\s*(html|css|java\s*script|javascript|kode)|html\s*\/\s*css|css\s*\/\s*js|advanced\s*theme\s*editor/i.test(label);
  });
  const code = codeCandidates.find((button) => !button.dataset.v202Hidden) || codeCandidates[0] || null;
  if (code) {
    showV202(code);
    code.dataset.v202ThemeAction = "code";
    setButtonLabel(code, "Edit Kode");
  }
  codeCandidates.forEach((button) => { if (button !== code) hideV202(button, "duplicate-code"); });

  const layoutCandidates = refreshed.filter((button) => button !== layout && /edit\s*tata\s*letak|tata\s*letak/i.test(text(button)));
  layoutCandidates.forEach((button) => hideV202(button, "duplicate-layout"));

  if (hero) {
    const widgetCandidates = refreshed.filter((button) => button !== layout && /widget/i.test(text(button)));
    widgetCandidates.forEach((button) => hideV202(button, "hero-widget-moved-to-layout-map"));
    if (customize) { showV202(customize); customize.dataset.v202ThemeAction = "customize"; }
    if (site) { showV202(site); site.dataset.v202ThemeAction = "site"; }
  }
}

function normalizeTheme() {
  const studio = document.querySelector(".tn-studio");
  if (!studio) return;
  studio.dataset.v202Theme = "contained-mobile-library";
  normalizeThemeGroup(studio.querySelector(".tn-hero-actions"), { hero: true });
  normalizeThemeGroup(studio.querySelector(".tn-command nav"));

  for (const node of studio.querySelectorAll([
    ".tn-hero", ".tn-active-stage", ".tn-command", ".tn-layout-studio", ".tn-blueprints", ".tn-library",
    ".tn-theme-grid", ".tn-theme-grid>article", ".tn-theme-preview", ".tn-card-mock", ".tn-frame-shell",
  ].join(","))) {
    node.style.removeProperty("left");
    node.style.removeProperty("right");
    node.style.removeProperty("top");
    node.style.removeProperty("bottom");
    node.style.removeProperty("transform");
    node.style.removeProperty("filter");
  }
}

const ICONS = {
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"/><circle cx="12" cy="13" r="3"/></svg>',
  photo: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>',
};

function directTool(kind, input, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.v202DirectAttachment = kind;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = ICONS[kind];
  button.addEventListener("click", () => input?.click());
  return button;
}

function ensureNaraDirectTools(shell) {
  const tools = shell.querySelector(".nara-composer-tools");
  if (!tools) return;
  let direct = tools.querySelector(":scope > .nara-direct-attachments-v202");
  if (!direct) {
    direct = document.createElement("div");
    direct.className = "nara-direct-attachments-v202";
    direct.setAttribute("role", "group");
    direct.setAttribute("aria-label", "Kamera foto dan file");
    const camera = shell.querySelector('input[accept="image/*"][capture]');
    const photos = [...shell.querySelectorAll('input[accept="image/*"]')].find((node) => !node.hasAttribute("capture"));
    const files = shell.querySelector('input[accept*=".txt"]');
    direct.append(
      directTool("camera", camera, "Kamera"),
      directTool("photo", photos, "Foto"),
      directTool("file", files, "File"),
    );
    const attachment = tools.querySelector(":scope > .nara-attachment-menu-wrap");
    if (attachment?.nextSibling) tools.insertBefore(direct, attachment.nextSibling);
    else tools.prepend(direct);
  }
}

function bindNaraLauncher() {
  const launcher = document.querySelector(".nara-floating-button");
  if (!launcher || launcher.dataset.v202Bound === "true") return;
  launcher.dataset.v202Bound = "true";
  launcher.addEventListener("click", () => {
    document.documentElement.dataset.naraRequestedSizeV202 = "small";
  }, { capture: true });
}

function normalizeNara() {
  bindNaraLauncher();
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;

  if (document.documentElement.dataset.naraRequestedSizeV202 === "small") {
    delete document.documentElement.dataset.naraRequestedSizeV202;
    if (shell.dataset.naraSize !== "small") {
      const small = shell.querySelector('.nara-size-controls-v147 button[data-size="small"]');
      small?.click();
    }
  }

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v202Mode = full ? "modal" : "nonmodal";
  shell.dataset.v202Nara = "single-header-single-composer-row";
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
  }
  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "background", "transparent");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  const close = shell.querySelector('button[title="Tutup"],button[aria-label="Tutup Nara AI"],button[aria-label="Tutup Nara"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
  }
  ensureNaraDirectTools(shell);
}

function normalizeDrawer() {
  const root = document.documentElement;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));
  root.dataset.studioMobileV202 = String(mobileLike());
  root.dataset.studioDrawerV202 = open ? "open" : "closed";

  sidebar?.removeAttribute("inert");
  if (sidebar && open) {
    sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
      node.removeAttribute("inert");
      node.removeAttribute("aria-hidden");
    });
  }
  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
    setImportant(backdrop, "filter", "none");
  }
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".sn-api-page", ".sn-api-page>*",
    ".tn-studio", ".tn-studio>*", ".ce-app", ".ce-app>*", ".mv176-page", ".sv124-page", ".op41-host",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV202 = RELEASE;
  root.dataset.studioMobileV202 = String(mobileLike());
  normalizeDrawer();
  normalizeTheme();
  normalizeNara();
  normalizeContainment();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class", "hidden", "data-nara-size", "aria-expanded",
    "data-studio-responsive-mode", "data-studio-handheld", "data-studio-physical-mobile-v193",
  ],
});

for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
  window.addEventListener(eventName, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
sync();

export {
  RELEASE,
  mobileLike,
  normalizeTheme,
  normalizeNara,
  normalizeDrawer,
  normalizeContainment,
  sync,
};
