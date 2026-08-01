import "./studio-production-authority-v187.css";

const RELEASE = "studio-production-authority-v187-20260801";
let frame = 0;

function label(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function removeInert(root) {
  root?.removeAttribute?.("inert");
  root?.querySelectorAll?.("[inert]").forEach((node) => node.removeAttribute("inert"));
}

function normalizeDrawer() {
  const sidebar = document.querySelector("#ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const main = document.querySelector(".sn-shell > .sn-main");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));

  removeInert(sidebar);
  removeInert(main);
  if (sidebar) {
    sidebar.dataset.productionDrawerV187 = open ? "open" : "closed";
    sidebar.setAttribute("aria-hidden", open ? "false" : "true");
  }
  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
  }
  if (!open) document.body.classList.remove("sn-mobile-sidebar-open");
}

function normalizeNara() {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;

  const size = shell.dataset.naraSize || shell.getAttribute("data-nara-size") || "small";
  const full = size === "full";
  layer.dataset.productionNaraModeV187 = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    backdrop.tabIndex = full ? 0 : -1;
  }

  const close = shell.querySelector('button[aria-label="Tutup Nara AI"],button[title="Tutup"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.setAttribute("aria-label", "Tutup Nara AI");
  }

  if (!full) {
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
    for (const name of ["nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full"]) {
      document.body.classList.remove(name);
      document.documentElement.classList.remove(name);
    }
  }
}

function openThemeCodeTab(tabLabel) {
  const editHtml = [...document.querySelectorAll(".tn-hero-actions button,.tn-command button")]
    .find((node) => /edit html/i.test(label(node)));
  editHtml?.click();
  let attempts = 0;
  const select = () => {
    const button = [...document.querySelectorAll(".tn-code-pane nav button")]
      .find((node) => new RegExp(`^${tabLabel}$`, "i").test(label(node)));
    if (button) {
      button.click();
      button.focus({ preventScroll: true });
      return;
    }
    if (attempts++ < 30) window.setTimeout(select, 60);
  };
  select();
}

function actionButton(className, text, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
}

function ensureThemeActions() {
  const actions = document.querySelector(".tn-hero-actions");
  if (!actions) return;

  if (!actions.querySelector(".tn-edit-layout-v187")) {
    const button = actionButton("tn-edit-layout-v187", "Edit Tata Letak", () => {
      const layout = document.querySelector(".tn-layout-studio");
      layout?.scrollIntoView({ behavior: "smooth", block: "start" });
      layout?.setAttribute("tabindex", "-1");
      window.setTimeout(() => layout?.focus({ preventScroll: true }), 350);
    });
    const html = [...actions.querySelectorAll("button")].find((node) => /edit html/i.test(label(node)));
    actions.insertBefore(button, html || null);
  }

  if (!actions.querySelector(".tn-edit-css-v187")) {
    actions.append(actionButton("tn-edit-css-v187", "Edit CSS", () => openThemeCodeTab("CSS")));
  }
  if (!actions.querySelector(".tn-edit-js-v187")) {
    actions.append(actionButton("tn-edit-js-v187", "Edit JavaScript", () => openThemeCodeTab("JavaScript")));
  }

  actions.querySelectorAll("button,a").forEach((node) => {
    node.hidden = false;
    node.removeAttribute("aria-hidden");
    node.removeAttribute("inert");
  });
}

function normalizeProfile() {
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (menu && menu.parentElement !== document.body) document.body.append(menu);
}

function normalizeOperationalPages() {
  document.querySelectorAll(".sn-media-tools nav,.mv176-title-actions,.sv124-page-title,.sn-api-title").forEach(removeInert);
  document.querySelectorAll(".sn-media-tools nav button,.mv176-title-actions button,.sv124-page-title button,.sn-api-title button").forEach((node) => {
    node.hidden = false;
    node.disabled = false;
  });
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioProductionAuthorityV187 = RELEASE;
  removeInert(document.querySelector(".sn-shell"));
  normalizeDrawer();
  normalizeNara();
  normalizeProfile();
  ensureThemeActions();
  normalizeOperationalPages();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "inert", "aria-hidden", "data-nara-size"],
});

document.addEventListener("click", (event) => {
  if (event.target.closest("#ngeblogging-studio-sidebar button")) {
    requestAnimationFrame(() => {
      document.querySelector(".sn-main")?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
      window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    });
  }
  schedule();
}, true);

window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
sync();

export { RELEASE, ensureThemeActions, normalizeDrawer, normalizeNara, sync };
