import "./studio-production-v201.css";

const RELEASE = "studio-production-v201-20260802";
let frame = 0;

function text(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function visibleLabel(button, label) {
  if (!button) return;
  const textNodes = [...button.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
  if (textNodes.length) {
    textNodes.forEach((node, index) => { node.textContent = index === 0 ? ` ${label}` : ""; });
  } else {
    let span = button.querySelector(":scope > .v201-button-label");
    if (!span) {
      span = document.createElement("span");
      span.className = "v201-button-label";
      button.append(span);
    }
    span.textContent = label;
  }
  button.setAttribute("aria-label", label);
  button.dataset.v201Label = label;
}

function normalizeThemeActions() {
  const groups = document.querySelectorAll(".tn-hero-actions,.tn-command nav,.tn-command,.tn-library>header nav");
  for (const group of groups) {
    let layout = null;
    let code = null;
    const buttons = [...group.querySelectorAll(":scope > button")];
    for (const button of buttons) {
      const label = text(button);
      const layoutAction = /edit\s+tata\s+letak|tata\s+letak/i.test(label);
      const codeAction = /edit\s+(html|css|java\s*script|javascript|kode)|html\s*\/\s*css|css\s*\/\s*js/i.test(label);
      if (layoutAction) {
        if (!layout) {
          layout = button;
          button.hidden = false;
          button.removeAttribute("aria-hidden");
          delete button.dataset.v201Duplicate;
          visibleLabel(button, "Edit Tata Letak");
        } else {
          button.hidden = true;
          button.dataset.v201Duplicate = "layout";
          button.setAttribute("aria-hidden", "true");
        }
      }
      if (codeAction) {
        if (!code) {
          code = button;
          button.hidden = false;
          button.removeAttribute("aria-hidden");
          delete button.dataset.v201Duplicate;
          visibleLabel(button, "Edit Kode");
        } else {
          button.hidden = true;
          button.dataset.v201Duplicate = "code";
          button.setAttribute("aria-hidden", "true");
        }
      }
    }
  }
}

function normalizeDrawer() {
  const root = document.documentElement;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const main = document.querySelector(".sn-main");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));

  root.dataset.studioDrawerV201 = open ? "open" : "closed";
  main?.removeAttribute("inert");
  sidebar?.removeAttribute("inert");
  sidebar?.querySelectorAll("[inert]").forEach((node) => node.removeAttribute("inert"));

  if (sidebar) {
    sidebar.dataset.v201Interactive = "true";
    setImportant(sidebar, "filter", "none");
    setImportant(sidebar, "backdrop-filter", "none");
    if (open) {
      setImportant(sidebar, "pointer-events", "auto");
      sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
        node.removeAttribute("inert");
        node.removeAttribute("aria-hidden");
        setImportant(node, "pointer-events", "auto");
      });
    }
  }

  if (backdrop) {
    backdrop.dataset.v201Backdrop = "outside-close-only";
    setImportant(backdrop, "filter", "none");
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v201Launcher = "stable";
    setImportant(launcher, "animation", "none");
    setImportant(launcher, "filter", "none");
    setImportant(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v201Mode = full ? "modal" : "nonmodal";
  shell.dataset.v201Controls = "compact";
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    if (!full) {
      setImportant(backdrop, "display", "none");
      setImportant(backdrop, "pointer-events", "none");
      setImportant(backdrop, "background", "transparent");
      setImportant(backdrop, "backdrop-filter", "none");
    } else {
      backdrop.style.removeProperty("display");
    }
  }

  const close = shell.querySelector('button[aria-label="Tutup Nara AI"],button[title="Tutup"],button[aria-label="Tutup Nara"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
    setImportant(close, "display", "grid");
    setImportant(close, "visibility", "visible");
    setImportant(close, "opacity", "1");
  }

  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "background", "transparent");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
    for (const className of ["nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full"]) {
      document.body.classList.remove(className);
      document.documentElement.classList.remove(className);
    }
  }
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-api-page", ".sn-api-card",
    ".tn-studio", ".tn-theme-grid", ".tn-theme-grid>article", ".tn-frame-shell",
    ".tn-layout-studio", ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioProductionV201 = RELEASE;
  normalizeThemeActions();
  normalizeDrawer();
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
  attributeFilter: ["class", "data-nara-size", "aria-expanded", "data-studio-responsive-mode", "data-studio-handheld"],
});

for (const eventName of ["pageshow", "resize", "orientationchange"]) {
  window.addEventListener(eventName, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
schedule();

export { RELEASE, normalizeThemeActions, normalizeDrawer, normalizeNara, sync };
