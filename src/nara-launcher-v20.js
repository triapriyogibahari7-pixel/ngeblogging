const RELEASE = "nara-launcher-v20-20260724";
let frame = 0;
let proxy = null;
let activation = 0;

const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.45 4.55L18 9l-4.55 1.45L12 15l-1.45-4.55L6 9l4.55-1.45L12 3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M18.5 14.5l.75 2.25 2.25.75-2.25.75-.75 2.25-.75-2.25-2.25-.75 2.25-.75.75-2.25ZM5 14l.55 1.45L7 16l-1.45.55L5 18l-.55-1.45L3 16l1.45-.55L5 14Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';

function visible(element) {
  if (!element || element.disabled) return false;
  const style = getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function assistantOpen() {
  return Boolean(document.querySelector(".nara-assistant-layer"));
}

function candidates() {
  return [
    document.querySelector(".sn-top-actions .sn-nara-button"),
    document.querySelector(".ce-nara"),
    document.querySelector('.nara-floating-button:not([data-nara-proxy-v18]):not([data-nara-proxy-v19]):not([data-nara-proxy-v20])'),
    [...document.querySelectorAll("button")].find((button) => /buka nara|tanya nara/i.test(button.textContent || "")),
  ].filter(Boolean);
}

function nativeClick(element) {
  if (!element) return false;
  element.disabled = false;
  element.hidden = false;
  element.removeAttribute("aria-hidden");
  try {
    HTMLElement.prototype.click.call(element);
  } catch {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  }
  return true;
}

function closeSidebar() {
  const shell = document.querySelector('.sn-shell[data-v15-sidebar-open="true"]');
  if (!shell) return;
  const toggle = shell.querySelector('.sn-icon[data-sidebar-authority="single-v19"], .sn-icon[data-sidebar-authority="single-v18"], .sn-icon[data-sidebar-authority="single-v17"], .sn-icon.sn-sidebar-edge-owner-v19');
  nativeClick(toggle);
}

function openViaWorkspace(ticket) {
  if (ticket !== activation || assistantOpen()) return;
  const route = document.querySelector('[data-nara-workspace-route="true"]');
  if (route) nativeClick(route);
  window.setTimeout(() => {
    if (ticket !== activation || assistantOpen()) return;
    const workspaceButton = [...document.querySelectorAll(".nw-page button")]
      .find((button) => /buka nara/i.test(button.textContent || ""));
    nativeClick(workspaceButton);
  }, 120);
}

function attemptOpen(ticket, attempt = 0) {
  if (ticket !== activation || assistantOpen()) return;
  const list = candidates();
  const target = list[attempt % Math.max(1, list.length)];
  nativeClick(target);

  if (assistantOpen()) return;
  if (attempt < 7) {
    window.setTimeout(() => attemptOpen(ticket, attempt + 1), 80 + attempt * 45);
  } else {
    openViaWorkspace(ticket);
  }
}

function activateNara() {
  const ticket = ++activation;
  closeSidebar();
  proxy?.setAttribute("aria-busy", "true");
  window.requestAnimationFrame(() => attemptOpen(ticket));
  window.setTimeout(() => proxy?.removeAttribute("aria-busy"), 1100);
}

function ensureProxy() {
  document.querySelectorAll(".nara-floating-proxy-v18,.nara-floating-proxy-v19")
    .forEach((node) => node.remove());

  const hasNara = candidates().length > 0 || Boolean(document.querySelector('[data-nara-workspace-route="true"]'));
  if (!hasNara) {
    proxy?.remove();
    proxy = null;
    return;
  }

  if (!proxy?.isConnected) {
    proxy = document.createElement("button");
    proxy.type = "button";
    proxy.className = "nara-floating-proxy-v20";
    proxy.dataset.naraProxyV20 = "true";
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
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(ensureProxy);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "n") {
    event.preventDefault();
    activateNara();
  }
});

schedule();
