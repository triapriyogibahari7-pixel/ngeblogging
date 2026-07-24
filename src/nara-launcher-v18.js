const RELEASE = "nara-launcher-v18-20260724";
let scanFrame = 0;
let proxy = null;

const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.45 4.55L18 9l-4.55 1.45L12 15l-1.45-4.55L6 9l4.55-1.45L12 3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M18.5 14.5l.75 2.25 2.25.75-2.25.75-.75 2.25-.75-2.25-2.25-.75 2.25-.75.75-2.25ZM5 14l.55 1.45L7 16l-1.45.55L5 18l-.55-1.45L3 16l1.45-.55L5 14Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

function originalLauncher() {
  return document.querySelector('.nara-floating-button:not([data-nara-proxy-v18="true"])');
}

function closeSidebarBeforeNara() {
  const shell = document.querySelector('.sn-shell[data-v15-sidebar-open="true"]');
  const toggle = shell?.querySelector('.sn-icon[data-sidebar-authority="single-v18"], .sn-icon.sn-sidebar-edge-owner-v18, .sn-icon.sn-sidebar-edge-owner-v17');
  if (toggle) toggle.click();
}

function activateNara() {
  const original = originalLauncher();
  if (!original) return;
  closeSidebarBeforeNara();
  window.requestAnimationFrame(() => original.click());
}

function ensureProxy() {
  const original = originalLauncher();
  if (!original) {
    proxy?.remove();
    proxy = null;
    return;
  }

  original.setAttribute("data-nara-original-v18", "true");
  original.type = "button";
  original.disabled = false;
  original.hidden = false;

  if (!proxy?.isConnected) {
    proxy = document.createElement("button");
    proxy.type = "button";
    proxy.className = "nara-floating-proxy-v18";
    proxy.dataset.naraProxyV18 = "true";
    proxy.dataset.release = RELEASE;
    proxy.setAttribute("aria-label", "Buka Nara AI");
    proxy.setAttribute("title", "Buka Nara AI");
    proxy.innerHTML = ICON;
    proxy.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activateNara();
    });
    document.body.append(proxy);
  }

  const assistantOpen = Boolean(document.querySelector(".nara-assistant-layer"));
  proxy.hidden = assistantOpen;
  proxy.setAttribute("aria-expanded", String(assistantOpen));
  document.documentElement.dataset.naraLauncherRelease = RELEASE;

  document.querySelectorAll(".sn-top-actions .sn-nara-button").forEach((button) => {
    button.type = "button";
    button.disabled = false;
    button.hidden = false;
    button.removeAttribute("aria-hidden");
  });
}

function schedule() {
  cancelAnimationFrame(scanFrame);
  scanFrame = requestAnimationFrame(ensureProxy);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
schedule();
