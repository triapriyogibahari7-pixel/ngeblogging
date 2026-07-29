import React from "react";
import { createRoot } from "react-dom/client";
import ApiKeysPanel from "./ApiKeysPanel";
import "./api-keys-studio-bridge.css";

const RELEASE = "api-keys-studio-v135-20260729";
const HOST_ID = "ngeblogging-api-keys-v135";
const BUTTON_ID = "ngeblogging-api-keys-nav-v135";
const ACTIVE_CLASS = "sn-api-keys-active-v135";
let mountedHost = null;
let root = null;
let frame = 0;
let toastTimer = 0;

function labelOf(button) {
  return button?.querySelector(":scope > span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function keyIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m11.5 11.5 7-7"/><path d="m15 8 2 2"/><path d="m17 6 2 2"/></svg><span>API Keys</span>';
}

function toast(message) {
  if (!message) return;
  let node = document.querySelector(".sn-api-toast-v135");
  if (!(node instanceof HTMLElement)) {
    node = document.createElement("div");
    node.className = "sn-api-toast-v135";
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    document.body.append(node);
  }
  node.textContent = String(message);
  node.dataset.visible = "true";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (!node?.isConnected) return;
    node.dataset.visible = "false";
  }, 3600);
}

function deactivate(shell) {
  if (!(shell instanceof HTMLElement)) return;
  shell.classList.remove(ACTIVE_CLASS);
  shell.dataset.apiKeysRoute = "inactive";
  const button = document.getElementById(BUTTON_ID);
  button?.classList.remove("active");
  button?.setAttribute("aria-current", "false");
  const host = document.getElementById(HOST_ID);
  if (host instanceof HTMLElement) host.hidden = true;
}

function activate(shell) {
  if (!(shell instanceof HTMLElement)) return;
  shell.querySelectorAll(":scope > .sn-side nav button.active").forEach((button) => {
    if (button.id !== BUTTON_ID) button.classList.remove("active");
  });
  shell.classList.add(ACTIVE_CLASS);
  shell.dataset.apiKeysRoute = RELEASE;
  const button = document.getElementById(BUTTON_ID);
  button?.classList.add("active");
  button?.setAttribute("aria-current", "page");
  const host = document.getElementById(HOST_ID);
  if (host instanceof HTMLElement) {
    host.hidden = false;
    host.scrollIntoView({ block: "start" });
  }
}

function ensureButton(shell) {
  const nav = shell.querySelector(":scope > .sn-side > nav");
  if (!(nav instanceof HTMLElement)) return null;

  let button = document.getElementById(BUTTON_ID);
  if (!(button instanceof HTMLButtonElement)) {
    button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = "sn-api-keys-nav-v135";
    button.title = "API Keys";
    button.setAttribute("aria-label", "API Keys");
    button.setAttribute("aria-current", "false");
    button.dataset.apiKeysNav = RELEASE;
    button.innerHTML = keyIcon();
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      activate(shell);
    });
  }

  const directButtons = [...nav.querySelectorAll(":scope > button")];
  const domain = directButtons.find((candidate) => labelOf(candidate) === "Domain") || null;
  if (domain) {
    if (button.parentElement !== nav || domain.nextElementSibling !== button) {
      nav.insertBefore(button, domain.nextElementSibling);
    }
  } else if (button.parentElement !== nav) {
    nav.append(button);
  }

  button.hidden = false;
  button.disabled = false;
  button.removeAttribute("aria-hidden");
  button.style.removeProperty("display");
  button.style.removeProperty("visibility");
  button.style.removeProperty("opacity");
  return button;
}

function ensureHost(shell) {
  const main = shell.querySelector(":scope > .sn-main");
  if (!(main instanceof HTMLElement)) return null;

  let host = document.getElementById(HOST_ID);
  if (!(host instanceof HTMLElement)) {
    host = document.createElement("section");
    host.id = HOST_ID;
    host.className = "sn-api-keys-host-v135";
    host.dataset.apiKeysHost = RELEASE;
    host.hidden = !shell.classList.contains(ACTIVE_CLASS);
  }

  if (host.parentElement !== main) {
    const top = main.querySelector(":scope > .sn-top");
    top?.insertAdjacentElement("afterend", host);
    if (!top) main.prepend(host);
  }

  if (mountedHost !== host) {
    root?.unmount();
    root = createRoot(host);
    root.render(<ApiKeysPanel setToast={toast}/>);
    mountedHost = host;
  }

  host.hidden = !shell.classList.contains(ACTIVE_CLASS);
  return host;
}

function routeExitTarget(target, shell) {
  if (!(target instanceof Element)) return false;
  const button = target.closest("button,a");
  if (!(button instanceof Element) || button.id === BUTTON_ID) return false;
  const area = button.closest(".sn-side nav,.sn-account-footer,.sn-new,.sn-top");
  return area instanceof Element && shell.contains(area);
}

function synchronize() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const shell = document.querySelector(".sn-shell");
    if (!(shell instanceof HTMLElement)) return;
    ensureButton(shell);
    ensureHost(shell);
    shell.dataset.apiKeysBridge = RELEASE;
  });
}

document.addEventListener("click", (event) => {
  const shell = document.querySelector(".sn-shell");
  if (!(shell instanceof HTMLElement) || !shell.classList.contains(ACTIVE_CLASS)) return;
  if (routeExitTarget(event.target, shell)) deactivate(shell);
}, true);

new MutationObserver(synchronize).observe(document.body, {
  childList: true,
  subtree: true,
});
window.addEventListener("pageshow", synchronize, { passive: true });
window.addEventListener("ngeblogging:active-site-change", () => {
  const shell = document.querySelector(".sn-shell");
  if (shell instanceof HTMLElement) deactivate(shell);
  synchronize();
});
synchronize();
