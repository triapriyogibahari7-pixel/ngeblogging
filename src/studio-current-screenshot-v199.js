import "./studio-current-screenshot-v199.css";

const RELEASE = "studio-current-screenshot-v199-20260802";
let frame = 0;

function normalizedText(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function replaceVisibleButtonText(button, label) {
  if (!button) return;
  const directText = [...button.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
  if (directText.length) {
    directText.forEach((node, index) => { node.textContent = index === 0 ? ` ${label}` : ""; });
  } else {
    let text = button.querySelector(":scope > .v199-button-label");
    if (!text) {
      text = document.createElement("span");
      text.className = "v199-button-label";
      button.append(text);
    }
    text.textContent = label;
  }
  button.setAttribute("aria-label", label);
  button.dataset.v199NormalizedLabel = label;
}

function normalizeThemeActions() {
  for (const group of document.querySelectorAll(".tn-hero-actions,.tn-command nav")) {
    let layoutButton = null;
    let codeButton = null;
    for (const button of group.querySelectorAll(":scope > button")) {
      const text = normalizedText(button);
      const isLayout = /edit\s+tata\s+letak|tata\s+letak/i.test(text);
      const isCode = /edit\s+(html|css|java\s*script|javascript|kode)|html\s*\/\s*css\s*\/\s*js/i.test(text);

      if (isLayout) {
        if (layoutButton) {
          button.dataset.v199HiddenDuplicate = "true";
          button.hidden = true;
        } else {
          layoutButton = button;
          button.hidden = false;
          delete button.dataset.v199HiddenDuplicate;
          replaceVisibleButtonText(button, "Edit Tata Letak");
        }
      }

      if (isCode) {
        if (codeButton) {
          button.dataset.v199HiddenDuplicate = "true";
          button.hidden = true;
        } else {
          codeButton = button;
          button.hidden = false;
          delete button.dataset.v199HiddenDuplicate;
          replaceVisibleButtonText(button, "Edit Kode");
        }
      }
    }
  }
}

function setSectionVisible(section, visible) {
  if (!section) return;
  section.hidden = !visible;
  section.setAttribute("aria-hidden", String(!visible));
  section.dataset.v199AccountVisible = String(visible);
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function normalizeAccountSurface() {
  const mode = document.documentElement.dataset.studioAccountViewV189;
  if (!mode) return;
  const grid = document.querySelector(".sn-settings-grid");
  const page = grid?.closest(".sn-view-pad");
  const sections = grid ? [...grid.children].filter((node) => node.tagName === "SECTION") : [];
  if (!page || sections.length < 2) return;

  const title = page.querySelector(".sn-page-title h1");
  const description = page.querySelector(".sn-page-title p");
  const save = page.querySelector(".sn-save-settings");

  if (mode === "profile") {
    setSectionVisible(sections[0], true);
    setSectionVisible(sections[1], false);
    setText(title, "Profil");
    setText(description, "Kelola nama tampilan, biografi, avatar, dan informasi publik akun Anda.");
    replaceVisibleButtonText(save, "Simpan profil");
    page.dataset.v199AccountSurface = "profile";
  } else {
    setSectionVisible(sections[0], false);
    setSectionVisible(sections[1], true);
    setText(title, "Pengaturan");
    setText(description, "Kelola nama situs, deskripsi, bahasa, zona waktu, dan preferensi workspace.");
    replaceVisibleButtonText(save, "Simpan pengaturan");
    page.dataset.v199AccountSurface = "settings";
  }
}

function normalizeDrawer() {
  const drawer = document.querySelector("#ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const open = Boolean(drawer?.classList.contains("mobile-open"));
  if (drawer) {
    drawer.dataset.v199DrawerInteractive = "true";
    drawer.style.removeProperty("filter");
  }
  if (backdrop) {
    backdrop.dataset.v199TransparentBackdrop = "true";
    backdrop.style.removeProperty("backdrop-filter");
    backdrop.style.removeProperty("-webkit-backdrop-filter");
  }
  document.documentElement.dataset.studioDrawerOpenV199 = String(open);
}

function normalizeNara() {
  const shell = document.querySelector(".nara-assistant-shell");
  const layer = shell?.closest(".nara-assistant-layer");
  const backdrop = layer?.querySelector(":scope > .nara-assistant-backdrop");
  if (!shell || !layer) return;

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));
  layer.dataset.naraModalV199 = full ? "modal" : "nonmodal";
  shell.dataset.naraControlsV199 = "single-header-row-single-action-row";

  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    backdrop.tabIndex = full ? 0 : -1;
  }

  if (!full && document.body.style.overflow === "hidden") {
    document.body.style.removeProperty("overflow");
  }
}

function normalizeTables() {
  for (const table of document.querySelectorAll(".sn-view-pad table")) {
    table.style.maxWidth = "100%";
    table.dataset.v199Contained = "true";
  }
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioCurrentScreenshotV199 = "true";
  document.documentElement.dataset.studioCurrentScreenshotReleaseV199 = RELEASE;
  normalizeThemeActions();
  normalizeAccountSurface();
  normalizeDrawer();
  normalizeNara();
  normalizeTables();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class",
    "data-nara-size",
    "data-studio-account-view-v189",
    "aria-expanded",
  ],
});

window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
schedule();

export {
  RELEASE,
  normalizeAccountSurface,
  normalizeDrawer,
  normalizeNara,
  normalizeThemeActions,
  sync,
};
