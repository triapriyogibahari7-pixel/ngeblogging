const RELEASE = "nara-launcher-v19-20260724";
let scanFrame = 0;
let proxy = null;
let activationTicket = 0;

const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.45 4.55L18 9l-4.55 1.45L12 15l-1.45-4.55L6 9l4.55-1.45L12 3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M18.5 14.5l.75 2.25 2.25.75-2.25.75-.75 2.25-.75-2.25-2.25-.75 2.25-.75.75-2.25ZM5 14l.55 1.45L7 16l-1.45.55L5 18l-.55-1.45L3 16l1.45-.55L5 14Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

function assistantOpen() {
  return Boolean(document.querySelector(".nara-assistant-layer"));
}

function originalLauncher() {
  return document.querySelector('.nara-floating-button:not([data-nara-proxy-v18="true"]):not([data-nara-proxy-v19="true"])');
}

function headerLauncher() {
  return document.querySelector(".sn-top-actions .sn-nara-button:not([disabled])");
}

function editorLauncher() {
  return document.querySelector(".ce-nara:not([disabled])");
}

function availableLauncher() {
  return headerLauncher() || originalLauncher() || editorLauncher();
}

function closeSidebarBeforeNara() {
  const shell = document.querySelector('.sn-shell[data-v15-sidebar-open="true"]');
  const toggle = shell?.querySelector('.sn-icon[data-sidebar-authority="single-v19"], .sn-icon[data-sidebar-authority="single-v18"], .sn-icon.sn-sidebar-edge-owner-v19');
  if (toggle) toggle.click();
}

function clickBestLauncher(ticket, attempt = 0) {
  if (ticket !== activationTicket || assistantOpen()) return;
  const target = attempt === 0
    ? (headerLauncher() || editorLauncher() || originalLauncher())
    : (originalLauncher() || headerLauncher() || editorLauncher());
  target?.click();
  if (!assistantOpen() && attempt < 3) {
    window.setTimeout(() => clickBestLauncher(ticket, attempt + 1), 90 + (attempt * 70));
  }
}

function activateNara() {
  const ticket = ++activationTicket;
  closeSidebarBeforeNara();
  proxy?.setAttribute("aria-busy", "true");
  window.requestAnimationFrame(() => {
    clickBestLauncher(ticket);
    window.setTimeout(() => proxy?.removeAttribute("aria-busy"), 500);
  });
}

function ensureProxy() {
  document.querySelectorAll('.nara-floating-proxy-v18, .nara-floating-proxy-v19[data-release]:not([data-release="nara-launcher-v19-20260724"])')
    .forEach((node) => node.remove());

  const original = originalLauncher();
  const target = availableLauncher();
  if (!target) {
    proxy?.remove();
    proxy = null;
    return;
  }

  if (original) {
    original.dataset.naraOriginalV18 = "true";
    original.dataset.naraOriginalV19 = "true";
    original.type = "button";
    original.disabled = false;
    original.hidden = false;
  }

  if (!proxy?.isConnected) {
    proxy = document.createElement("button");
    proxy.type = "button";
    proxy.className = "nara-floating-proxy-v19";
    proxy.dataset.naraProxyV19 = "true";
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

  const open = assistantOpen();
  proxy.hidden = open;
  proxy.setAttribute("aria-expanded", String(open));
  document.documentElement.dataset.naraLauncherRelease = RELEASE;

  document.querySelectorAll(".sn-top-actions .sn-nara-button, .ce-nara").forEach((button) => {
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
