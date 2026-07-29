import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import StudioNext from "./StudioNext.jsx";
import BackupCenter from "./BackupCenter.jsx";
import "./studio-v9-enhancements.css";
import "./studio-responsive-v23.css";
import "./sidebar-account-footer-v85.css";
import "./sidebar-home-actions-v90.css";
import "./studio-flow-integrity-v111.css";
import "./studio-flow-integrity-v111.js";
import "./studio-domain-single-authority-v112.css";
import "./studio-domain-single-authority-v112.js";
import "./nara-controls-v135.js";

const EXTRAS_ID = "ngeblogging-settings-extras";
const BACKUP_HOST_ID = "ngeblogging-backup-settings";
const SOURCE_NAVIGATION_RELEASE = "studio-source-navigation-v135-20260729";
const ACCOUNT_FOOTER_RELEASE = "sidebar-home-actions-v135-20260729";

function ensureExtrasContainer() {
  const saveButton = document.querySelector(".sn-save-settings");
  if (!saveButton) return null;

  let extras = document.getElementById(EXTRAS_ID);
  if (!extras) {
    extras = document.createElement("div");
    extras.id = EXTRAS_ID;
    extras.className = "sn-settings-extras";
    saveButton.insertAdjacentElement("afterend", extras);
  }
  return extras;
}

function buttonLabel(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function hideDuplicateNaraNavigation(shell) {
  const nav = shell.querySelector(":scope > .sn-side > nav");
  [...(nav?.querySelectorAll(":scope > button") || [])]
    .filter((button) => buttonLabel(button) === "Nara AI")
    .forEach((button) => {
      button.hidden = true;
      button.disabled = true;
      button.tabIndex = -1;
      button.setAttribute("aria-hidden", "true");
      button.style.setProperty("display", "none", "important");
    });

  document.querySelectorAll([
    ".nara-plugin-trigger-v24",
    ".nara-plugin-trigger-v29",
    ".nara-plugin-panel-v24",
    ".nara-plugin-panel-v29",
  ].join(",")).forEach((node) => node.remove());
}

function revealAccountButton(button, className, actionName) {
  if (!button) return false;
  button.classList.add(className);
  button.dataset.accountAction = actionName;
  button.hidden = false;
  button.disabled = false;
  button.tabIndex = 0;
  button.removeAttribute("aria-hidden");
  button.removeAttribute("inert");
  button.style.removeProperty("display");
  button.style.removeProperty("visibility");
  button.style.removeProperty("opacity");
  return true;
}

function syncAccountFooter(shell) {
  const nav = shell.querySelector(":scope > .sn-side > nav");
  const footer = shell.querySelector(":scope > .sn-side > .sn-account-footer");
  const buttons = [
    ...(nav?.querySelectorAll(":scope > button") || []),
    ...(footer?.querySelectorAll(":scope > button") || []),
  ];
  const settingsButton = buttons.find((button) => buttonLabel(button) === "Pengaturan");
  const logoutButton = buttons.find((button) => buttonLabel(button) === "Keluar");

  const settingsReady = revealAccountButton(settingsButton, "sn-account-settings-v135", "settings");
  const logoutReady = revealAccountButton(logoutButton, "sn-account-logout-v135", "logout");
  shell.dataset.accountSettingsReady = String(settingsReady);
  shell.dataset.accountLogoutReady = String(logoutReady);
}

function syncReadinessChrome() {
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;

  shell.dataset.sourceNavigation = SOURCE_NAVIGATION_RELEASE;
  shell.dataset.accountFooterRelease = ACCOUNT_FOOTER_RELEASE;
  shell.dataset.stableLayout = "v135";

  // Do not remove .sn-mobile-nav, .sn-mobile-sheet-layer, .sn-side-close,
  // backdrops, or React-owned sidebar nodes. Removing them caused the mobile
  // navigation to disappear and left an empty page area.
  hideDuplicateNaraNavigation(shell);
  syncAccountFooter(shell);

  // Nara is opened through the single floating mini button. The duplicate
  // top-bar and editor shortcuts stay hidden without touching the assistant.
  shell.querySelectorAll(".sn-top-actions .sn-nara-button, .ce-nara").forEach((button) => {
    button.hidden = true;
    button.disabled = true;
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
  });

  const billingReady = document.documentElement.dataset.billingReady === "true";
  if (!billingReady) {
    shell.querySelectorAll("button").forEach((button) => {
      if (buttonLabel(button) !== "Pembayaran") return;
      button.hidden = true;
      button.disabled = true;
      button.setAttribute("aria-hidden", "true");
    });
  }
}

export default function StudioSecure(props) {
  const [backupMount, setBackupMount] = useState(null);

  useLayoutEffect(() => {
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncReadinessChrome);
    };

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) sync();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    syncReadinessChrome();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", {
      headers: { accept: "application/json", "cache-control": "no-cache" },
      cache: "no-store",
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Health ${response.status}`)))
      .then((health) => {
        if (cancelled) return;
        document.documentElement.dataset.billingReady = String(health.billing === true);
        document.documentElement.dataset.emailRegistrationReady = String(health.emailRegistration === true);
        document.documentElement.dataset.customDomainsReady = String(health.customDomains === true);
        document.documentElement.dataset.naraReady = String(health.nara === true);
        document.documentElement.dataset.naraImageReady = String(health.imageGeneration === true);
        syncReadinessChrome();
      })
      .catch(() => {
        if (cancelled) return;
        document.documentElement.dataset.billingReady = "false";
        document.documentElement.dataset.naraReady = "false";
        syncReadinessChrome();
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let ownedHost = null;

    const sync = () => {
      const extras = ensureExtrasContainer();
      if (!extras) {
        setBackupMount(null);
        if (ownedHost?.isConnected) ownedHost.remove();
        ownedHost = null;
        return;
      }

      let host = document.getElementById(BACKUP_HOST_ID);
      if (!host) {
        host = document.createElement("div");
        host.id = BACKUP_HOST_ID;
        host.className = "sn-backup-host";
        extras.append(host);
        ownedHost = host;
      } else if (host.parentElement !== extras) {
        extras.append(host);
      }

      setBackupMount((current) => current === host ? current : host);
    };

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) sync();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    sync();

    return () => {
      observer.disconnect();
      if (ownedHost?.isConnected) ownedHost.remove();
      const extras = document.getElementById(EXTRAS_ID);
      if (extras && !extras.children.length) extras.remove();
    };
  }, []);

  return <>
    <StudioNext {...props}/>
    {backupMount ? createPortal(<BackupCenter user={props.user}/>, backupMount) : null}
  </>;
}
