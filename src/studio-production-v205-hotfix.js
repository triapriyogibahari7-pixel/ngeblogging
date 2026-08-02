import "./studio-production-v205-hotfix.css";

const HOTFIX = "studio-production-v205-hotfix-logo-auth-20260802";
let frame = 0;

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function syncLogoState() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.dataset.v205HotfixLogo = open ? "open-blue-on-white" : "closed-white-on-blue";
  }
  if (sidebar) sidebar.dataset.v205HotfixLogo = open ? "open-blue-on-white" : "closed";
}

function ensureThemeActions() {
  const studio = document.querySelector(".tn-studio");
  const hero = studio?.querySelector(".tn-hero-actions");
  if (!hero) return;

  const buttons = [...hero.querySelectorAll(":scope > button")];
  const layout = buttons.find((button) => button.dataset.v202ThemeAction === "layout" || /edit\s*tata\s*letak|tata\s*letak/i.test(button.textContent || ""));
  const code = buttons.find((button) => button.dataset.v202ThemeAction === "code" || /edit\s*(kode|html|css|javascript|java\s*script)/i.test(button.textContent || ""));

  if (layout) {
    layout.dataset.v205HotfixThemeAction = "layout";
    layout.hidden = false;
    layout.disabled = false;
    layout.removeAttribute("hidden");
    layout.removeAttribute("inert");
    layout.removeAttribute("aria-hidden");
    setImportant(layout, "pointer-events", "auto");
    if (layout.dataset.v205HotfixBound !== "true") {
      layout.dataset.v205HotfixBound = "true";
      layout.addEventListener("click", () => {
        const target = document.querySelector(".tn-layout-studio");
        if (!target) return;
        target.removeAttribute("inert");
        target.setAttribute("tabindex", "-1");
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => target.focus({ preventScroll: true }), 240);
      });
    }
  }

  if (code) {
    code.dataset.v205HotfixThemeAction = "code";
    code.hidden = false;
    code.disabled = false;
    code.removeAttribute("hidden");
    code.removeAttribute("inert");
    code.removeAttribute("aria-hidden");
    setImportant(code, "pointer-events", "auto");
  }

  studio.querySelectorAll(".tn-layout-studio button,.tn-code-workspace button,.tn-code-workspace textarea").forEach((node) => {
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
    if ("disabled" in node) node.disabled = false;
    setImportant(node, "pointer-events", "auto");
  });
}

function normalizeNara() {
  const shell = document.querySelector(".nara-assistant-shell");
  if (!shell) return;
  shell.dataset.v205HotfixControls = "plus-menu-compact";
  const direct = shell.querySelector(".nara-direct-attachments-v202");
  if (direct) {
    direct.setAttribute("aria-hidden", "true");
    direct.inert = true;
  }
  const plus = shell.querySelector(".nara-attachment-menu-wrap > button");
  if (plus) {
    plus.setAttribute("aria-haspopup", "menu");
    plus.setAttribute("aria-label", "Tambah kamera, foto, atau file");
  }
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioV205Hotfix = "true";
  root.dataset.studioV205HotfixRelease = HOTFIX;
  syncLogoState();
  ensureThemeActions();
  normalizeNara();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-nara-size", "data-studio-mobile-v205"],
});
for (const eventName of ["pageshow", "resize", "orientationchange"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();

export { HOTFIX, syncLogoState, ensureThemeActions, normalizeNara, sync };
