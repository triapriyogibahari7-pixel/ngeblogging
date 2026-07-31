import "./studio-mobile-hardening-v181.css";

const RELEASE = "studio-mobile-hardening-v181-20260731";
const loadingTimers = new WeakMap();
let frame = 0;

function text(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function isVisible(node) {
  if (!node?.isConnected) return false;
  const style = getComputedStyle(node);
  return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length > 0;
}

function scrollStudioToTop() {
  requestAnimationFrame(() => {
    document.querySelector(".sn-main")?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  });
}

function retryTarget(node) {
  const page = node.closest(".sn-view-pad,.sv124-page,.sn-api-page,.mv176-page,.ce-app") || document;
  const buttons = [...page.querySelectorAll("button")];
  return buttons.find((button) => /^(muat ulang|coba lagi|refresh|ulangi)$/i.test(text(button)))
    || buttons.find((button) => /(muat ulang|coba lagi|refresh|ulangi)/i.test(text(button)))
    || null;
}

function markLoadingStalled(node) {
  if (!isVisible(node) || node.dataset.v181LoadingStalled === "true") return;
  const label = text(node);
  if (label && !/(memuat|menyiapkan|loading|menghubungkan|menyinkronkan)/i.test(label)) return;

  node.dataset.v181LoadingStalled = "true";
  node.classList.add("v181-loading-stalled");

  if (!node.querySelector(".v181-loading-note")) {
    const note = document.createElement("p");
    note.className = "v181-loading-note";
    note.textContent = "Pemuatan melewati batas waktu. Sesi login dan draf perangkat tetap dipertahankan; coba lagi tanpa keluar dari akun.";
    node.append(note);
  }

  if (!node.querySelector(".v181-loading-retry")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "v181-loading-retry";
    button.textContent = "Coba lagi";
    button.addEventListener("click", () => {
      node.dataset.v181LoadingStalled = "false";
      node.classList.remove("v181-loading-stalled");
      node.querySelector(".v181-loading-note")?.remove();
      button.remove();
      const target = retryTarget(node);
      if (target && !target.disabled) target.click();
      else window.dispatchEvent(new Event("online"));
    });
    node.append(button);
  }
}

function loadingCandidates() {
  const explicit = [
    ".sv124-domain-loading",
    ".sv124-panel-loading",
    ".sn-api-loading",
    ".mv176-loading",
    ".sn-loading",
    ".sn-analytics-loading",
    ".sn-comments-loading",
    "[aria-busy='true']",
  ].join(",");

  const nodes = new Set(document.querySelectorAll(explicit));
  document.querySelectorAll(".spin,[class*='spinner' i]").forEach((spinner) => {
    const container = spinner.closest(".sn-view-pad,.sv124-page,.sn-api-page,.mv176-page,section,article,div");
    if (container && /(memuat|menyiapkan|loading|menghubungkan|menyinkronkan)/i.test(text(container))) nodes.add(container);
  });
  return [...nodes];
}

function watchLoading() {
  loadingCandidates().forEach((node) => {
    if (loadingTimers.has(node) || node.dataset.v181LoadingStalled === "true") return;
    const timer = window.setTimeout(() => markLoadingStalled(node), 15000);
    loadingTimers.set(node, timer);
  });
}

function recoverDrawer() {
  const sidebar = document.querySelector(".sn-shell > .sn-side");
  const main = document.querySelector(".sn-main");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));

  main?.removeAttribute("inert");
  if (sidebar) {
    sidebar.removeAttribute("inert");
    sidebar.setAttribute("aria-hidden", open ? "false" : sidebar.getAttribute("aria-hidden") || "true");
    if (open) {
      sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
        node.removeAttribute("inert");
        node.removeAttribute("aria-hidden");
      });
    }
  }

  if (!open) {
    document.body.classList.remove("sn-mobile-sidebar-open", "sm177-drawer-open", "v179-drawer-open");
  }
}

function recoverNara() {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) return;

  const size = shell.dataset.naraSize || shell.getAttribute("data-size") || "small";
  const full = size === "full";
  layer.dataset.naraInteractionV179 = full ? "modal" : "nonmodal";

  if (!full) {
    document.body.classList.remove("nara-scroll-lock", "nara-fullscreen-open", "sm177-nara-full", "v179-nara-full");
    document.documentElement.classList.remove("nara-scroll-lock");
  }

  const close = shell.querySelector('[data-nara-close-v177],button[aria-label*="Tutup" i],button[title*="Tutup" i]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("aria-hidden");
  }
}

function markRuntime() {
  document.documentElement.dataset.studioMobileHardeningV181 = RELEASE;
  document.documentElement.dataset.studioSessionPolicyV181 = "persist-until-explicit-logout";
  recoverDrawer();
  recoverNara();
  watchLoading();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(markRuntime);
}

document.addEventListener("click", (event) => {
  const navigation = event.target.closest(".sn-side button,.sn-account-footer button,.sn-account-menu-v179 button");
  if (navigation) scrollStudioToTop();
}, true);

const observer = new MutationObserver((mutations) => {
  const relevant = mutations.some((mutation) => {
    if (mutation.type === "childList") return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
    return mutation.type === "attributes";
  });
  if (relevant) schedule();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "aria-hidden", "aria-busy", "inert", "data-nara-size"],
});

window.addEventListener("resize", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("online", schedule, { passive: true });

markRuntime();

export { RELEASE, markRuntime, markLoadingStalled, recoverDrawer, recoverNara, scrollStudioToTop };
