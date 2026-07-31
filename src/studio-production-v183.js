import "./studio-production-v183.css";

const RELEASE = "studio-production-v183-20260801";
const loadingTimers = new WeakMap();
let frame = 0;

function visible(node) {
  if (!node?.isConnected) return false;
  const style = getComputedStyle(node);
  return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length > 0;
}

function text(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function currentDrawer() {
  const sidebar = document.querySelector(".sn-shell > .sn-side");
  const backdrop = document.querySelector(".sn-side-backdrop");
  return { sidebar, backdrop, open: Boolean(sidebar?.classList.contains("mobile-open")) };
}

function recoverDrawer() {
  const { sidebar, backdrop, open } = currentDrawer();
  const main = document.querySelector(".sn-main");
  main?.removeAttribute("inert");

  if (sidebar) {
    sidebar.removeAttribute("inert");
    sidebar.setAttribute("aria-hidden", open ? "false" : "true");
    sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
      node.removeAttribute("inert");
      node.removeAttribute("aria-hidden");
    });
  }

  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.dataset.v183Hidden = open ? "false" : "true";
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) backdrop.removeAttribute("inert");
    else backdrop.setAttribute("inert", "");
  }

  if (!open) {
    document.body.classList.remove(
      "sn-mobile-sidebar-open",
      "sm177-drawer-open",
      "v179-drawer-open",
      "v181-drawer-open",
    );
  }
}

function naraSize(shell) {
  return shell?.dataset.naraSize
    || shell?.getAttribute("data-nara-size")
    || document.documentElement.dataset.naraAssistantSize
    || "small";
}

function recoverNara() {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) return;

  const size = naraSize(shell);
  const full = size === "full";
  layer.dataset.v183Mode = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", full ? "false" : "true");
  }

  const close = shell.querySelector(
    '[data-nara-close-v177],button[title="Tutup"],button[aria-label*="Tutup" i]',
  );
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("aria-hidden");
  }

  if (!full) {
    for (const className of [
      "nara-scroll-lock",
      "nara-fullscreen-open",
      "nara-fullscreen-open-v148",
      "sm177-nara-full",
      "v179-nara-full",
    ]) {
      document.body.classList.remove(className);
      document.documentElement.classList.remove(className);
    }
  }
}

function retryTarget(node) {
  const page = node.closest(
    ".sn-view-pad,.sv124-page,.sn-api-page,.mv176-page,.sn-media-library,.ce-app",
  ) || document;
  const buttons = [...page.querySelectorAll("button")];
  return buttons.find((button) => /^(muat ulang|coba lagi|refresh|ulangi)$/i.test(text(button)))
    || buttons.find((button) => /(muat ulang|coba lagi|refresh|ulangi)/i.test(text(button)))
    || null;
}

function markLoadingStalled(node) {
  if (!visible(node) || node.dataset.v183LoadingStalled === "true") return;
  const label = text(node);
  if (label && !/(memuat|menyiapkan|loading|menghubungkan|menyinkronkan)/i.test(label)) return;

  node.dataset.v183LoadingStalled = "true";
  node.classList.add("v183-loading-stalled");

  if (!node.querySelector(".v183-loading-note")) {
    const note = document.createElement("p");
    note.className = "v183-loading-note";
    note.textContent = "Pemuatan melewati batas waktu. Sesi login dan draf tetap disimpan; coba lagi tanpa keluar dari akun.";
    node.append(note);
  }

  if (!node.querySelector(".v183-loading-retry")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "v183-loading-retry";
    button.textContent = "Coba lagi";
    button.addEventListener("click", () => {
      node.dataset.v183LoadingStalled = "false";
      node.classList.remove("v183-loading-stalled");
      node.querySelector(".v183-loading-note")?.remove();
      button.remove();
      const target = retryTarget(node);
      if (target && !target.disabled) target.click();
      else window.dispatchEvent(new Event("online"));
    });
    node.append(button);
  }
}

function watchLoading() {
  const selector = [
    ".sv124-domain-loading",
    ".sv124-panel-loading",
    ".sn-api-loading",
    ".mv176-loading",
    ".sn-loading",
    ".sn-analytics-loading",
    ".sn-comments-loading",
    "[aria-busy='true']",
  ].join(",");

  const nodes = new Set(document.querySelectorAll(selector));
  document.querySelectorAll(".spin,[class*='spinner' i]").forEach((spinner) => {
    const container = spinner.closest(
      ".sn-view-pad,.sv124-page,.sn-api-page,.mv176-page,.sn-media-library,section,article,div",
    );
    if (container && /(memuat|menyiapkan|loading|menghubungkan|menyinkronkan)/i.test(text(container))) {
      nodes.add(container);
    }
  });

  nodes.forEach((node) => {
    if (loadingTimers.has(node) || node.dataset.v183LoadingStalled === "true") return;
    const timer = window.setTimeout(() => markLoadingStalled(node), 12000);
    loadingTimers.set(node, timer);
  });
}

function restorePageInteraction() {
  const shell = document.querySelector(".sn-shell");
  const main = document.querySelector(".sn-main");
  shell?.removeAttribute("inert");
  main?.removeAttribute("inert");

  if (!document.querySelector(".sn-side.mobile-open")) {
    document.querySelector(".sn-side-backdrop")?.setAttribute("data-v183-hidden", "true");
  }
}

function markRuntime() {
  frame = 0;
  document.documentElement.dataset.studioProductionV183 = RELEASE;
  document.documentElement.dataset.studioSessionPolicyV183 = "persist-until-explicit-logout";
  recoverDrawer();
  recoverNara();
  restorePageInteraction();
  watchLoading();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(markRuntime);
}

document.addEventListener("click", (event) => {
  const navigation = event.target.closest(
    ".sn-side nav button,.sn-side > .sn-new,.sn-account-footer button",
  );
  if (navigation) {
    requestAnimationFrame(() => {
      document.querySelector(".sn-main")?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
      window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    });

    const { sidebar } = currentDrawer();
    if (sidebar?.classList.contains("mobile-open")) {
      window.setTimeout(() => {
        if (!sidebar.classList.contains("mobile-open")) return;
        const close = sidebar.querySelector(".sn-side-close");
        if (close && !close.disabled) close.click();
      }, 60);
    }
  }
}, true);

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => (
    mutation.type === "childList"
    || ["class", "aria-hidden", "aria-busy", "inert", "data-nara-size"].includes(mutation.attributeName)
  ))) schedule();
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

export {
  RELEASE,
  markRuntime,
  markLoadingStalled,
  recoverDrawer,
  recoverNara,
  restorePageInteraction,
};
