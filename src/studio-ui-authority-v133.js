const RELEASE = "studio-ui-authority-v133-20260729";
const NARA_SIZE_KEY = "ngeblogging-nara-panel-size-v130";
const SIDEBAR_KEY = "ngeblogging-sidebar-expanded-v125";
const PHONE_MIGRATION_KEY = "ngeblogging-phone-sidebar-v133-migrated";
const API_ORIGIN = "https://ngeblogging.triapriyogibahari7.workers.dev";
const initializedNaraShells = new WeakSet();
let scheduledFrame = 0;

function ensureAuthorityStyles() {
  let link = document.querySelector('link[data-studio-ui-authority="v133"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/src/studio-ui-authority-v133.css?v=133";
    link.dataset.studioUiAuthority = "v133";
    document.head.append(link);
    return;
  }
  /* The recovery runtime appends its stylesheet dynamically. Moving this link
     to the end makes the user's approved geometry the final cascade authority. */
  if (link !== document.head.lastElementChild) document.head.append(link);
}

function physicalPhone() {
  const root = document.documentElement;
  const shortestScreenEdge = Math.min(Number(screen?.width || 0), Number(screen?.height || 0));
  return root.dataset.physicalScreenMobile === "true"
    || root.dataset.desktopSitePhone === "true"
    || window.matchMedia("(max-width:760px)").matches
    || (shortestScreenEdge > 0 && shortestScreenEdge <= 760 && window.matchMedia("(pointer:coarse)").matches);
}

function labelOf(button) {
  return button?.querySelector(":scope > span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function removeSidebarNara() {
  document.querySelectorAll(".sv124-side nav button,.sn-side nav button").forEach((button) => {
    if (labelOf(button).toLocaleLowerCase("id-ID") !== "nara ai") return;
    button.dataset.naraSidebarDuplicate = "true";
    button.hidden = true;
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
  });
}

function activateNaraSize(shell, size) {
  shell.dataset.naraSize = size;
  const layer = shell.closest(".nara-assistant-layer");
  layer?.setAttribute("data-nara-size", size);
  layer?.setAttribute("aria-modal", String(size === "full"));
  shell.querySelectorAll(".nara-window-controls button[data-size]").forEach((button) => {
    const active = button.dataset.size === size;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  try { localStorage.setItem(NARA_SIZE_KEY, size); } catch { /* storage optional */ }
}

function initializeNaraShell(shell) {
  if (!(shell instanceof HTMLElement)) return;
  if (!initializedNaraShells.has(shell)) {
    initializedNaraShells.add(shell);
    /* Every fresh opening starts as the requested floating mini window.
       The compact/medium/full controls remain usable after opening. */
    activateNaraSize(shell, "compact");
  } else {
    const size = ["compact", "medium", "full"].includes(shell.dataset.naraSize)
      ? shell.dataset.naraSize
      : "compact";
    shell.closest(".nara-assistant-layer")?.setAttribute("data-nara-size", size);
  }
}

function migratePhoneSidebar() {
  if (!physicalPhone()) return;
  let migrated = false;
  try {
    migrated = localStorage.getItem(PHONE_MIGRATION_KEY) === RELEASE;
  } catch { migrated = false; }
  if (migrated) return;

  const shell = document.querySelector(".sv124-shell,.sn-shell");
  if (!(shell instanceof HTMLElement)) return;
  try { localStorage.setItem(SIDEBAR_KEY, "false"); } catch { /* storage optional */ }

  const expanded = shell.classList.contains("expanded") && !shell.classList.contains("collapsed");
  const toggle = shell.querySelector(".sv124-desktop-toggle,.sn-desktop-toggle");
  if (expanded && toggle instanceof HTMLButtonElement) toggle.click();

  try { localStorage.setItem(PHONE_MIGRATION_KEY, RELEASE); } catch { /* storage optional */ }
}

function normalizeSidebar() {
  const shell = document.querySelector(".sv124-shell,.sn-shell");
  const side = shell?.querySelector(":scope > .sv124-side,:scope > .sn-side");
  if (!(shell instanceof HTMLElement) || !(side instanceof HTMLElement)) return;
  side.hidden = false;
  side.removeAttribute("aria-hidden");
  side.style.removeProperty("display");
  side.style.removeProperty("visibility");
  side.style.removeProperty("opacity");
  side.style.removeProperty("transform");

  const collapsed = shell.classList.contains("collapsed") || side.classList.contains("collapsed");
  if (shell.classList.contains("sv124-shell")) {
    shell.classList.toggle("collapsed", collapsed);
    shell.classList.toggle("expanded", !collapsed);
  }
  document.documentElement.dataset.v133SidebarState = collapsed ? "collapsed" : "expanded";
}

function synchronize() {
  cancelAnimationFrame(scheduledFrame);
  scheduledFrame = requestAnimationFrame(() => {
    ensureAuthorityStyles();
    removeSidebarNara();
    migratePhoneSidebar();
    normalizeSidebar();
    document.querySelectorAll(".nara-assistant-shell").forEach(initializeNaraShell);
    document.body.classList.toggle("nara-modal-open", Boolean(document.querySelector(".nara-assistant-shell")));
    document.documentElement.dataset.studioUiAuthorityV133 = RELEASE;
  });
}

/* Domain requests are sent directly to the production Worker. This avoids a
   7-second primary attempt followed by a 14-second fallback while the Domain
   page itself has a 12-second safety deadline. Other API routes retain their
   existing failover behavior, including Nara's longer inference window. */
if (!window.__ngebloggingDomainDirectV133) {
  const previousFetch = window.fetch.bind(window);
  window.fetch = function studioAuthorityFetch(input, init) {
    try {
      const source = input instanceof Request ? new URL(input.url) : new URL(String(input), location.href);
      const relativeSameOrigin = source.origin === location.origin;
      if (relativeSameOrigin && source.pathname.startsWith("/api/domains/")) {
        const destination = new URL(`${source.pathname}${source.search}`, API_ORIGIN);
        if (input instanceof Request) {
          const redirected = new Request(destination, input);
          return previousFetch(init ? new Request(redirected, init) : redirected);
        }
        return previousFetch(destination.href, init);
      }
    } catch {
      /* Invalid inputs continue through the native compatibility path. */
    }
    return previousFetch(input, init);
  };
  window.__ngebloggingDomainDirectV133 = RELEASE;
}

new MutationObserver(synchronize).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "aria-hidden", "data-nara-size"],
});
window.addEventListener("resize", synchronize, { passive: true });
window.addEventListener("orientationchange", synchronize, { passive: true });
window.addEventListener("pageshow", synchronize, { passive: true });
window.addEventListener("ngeblogging:active-site-change", synchronize);
synchronize();
