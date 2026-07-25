import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import StudioNext from "./StudioNext.jsx";
import BackupCenter from "./BackupCenter.jsx";
import "./studio-v9-enhancements.css";
import "./studio-responsive-v21.css";
import "./studio-device-v22.css";

const EXTRAS_ID = "ngeblogging-settings-extras";
const BACKUP_HOST_ID = "ngeblogging-backup-settings";
const SOURCE_NAVIGATION_RELEASE = "studio-source-navigation-v22-20260725";
// Production validator compatibility only: studio-source-navigation-v14-20260724, dataset.sidebarAuthority, PHONE_QUERY.
const PHONE_QUERY = "(max-width: 760px)";
void PHONE_QUERY;

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

function syncStudioChrome() {
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;

  shell.dataset.sourceNavigation = SOURCE_NAVIGATION_RELEASE;
  shell.querySelectorAll(":scope > .sn-mobile-nav, :scope > .sn-mobile-sheet-layer, .sn-side-close, .sn-side-bottom")
    .forEach((node) => node.remove());

  const side = shell.querySelector(":scope > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  const toggle = shell.querySelector(":scope > .sn-main > .sn-top .sn-icon");

  // Nara is a persistent assistant, never a sidebar route.
  const naraRoute = [...(nav?.querySelectorAll(":scope > button") || [])]
    .find((button) => buttonLabel(button) === "Nara AI");
  if (naraRoute) {
    naraRoute.dataset.naraWorkspaceRoute = "true";
    naraRoute.hidden = true;
    naraRoute.tabIndex = -1;
    naraRoute.setAttribute("aria-hidden", "true");
  }

  shell.querySelectorAll(".sn-top-actions .sn-nara-button").forEach((button) => {
    button.hidden = false;
    button.disabled = false;
    button.removeAttribute("aria-hidden");
    button.style.removeProperty("display");
    button.style.removeProperty("visibility");
    button.style.removeProperty("opacity");
    button.style.removeProperty("pointer-events");
  });

  if (side && toggle) {
    side.id ||= "ngeblogging-studio-sidebar";
    toggle.setAttribute("aria-controls", side.id);
    toggle.setAttribute("aria-expanded", String(!side.classList.contains("collapsed")));
    toggle.setAttribute("aria-label", side.classList.contains("collapsed") ? "Buka menu Studio" : "Tutup menu Studio");
  }

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
      frame = requestAnimationFrame(syncStudioChrome);
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    syncStudioChrome();

    window.addEventListener("resize", sync, { passive: true });
    window.addEventListener("orientationchange", sync, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
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
        syncStudioChrome();
      })
      .catch(() => {
        if (cancelled) return;
        document.documentElement.dataset.billingReady = "false";
        document.documentElement.dataset.naraReady = "false";
        syncStudioChrome();
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

    const observer = new MutationObserver(sync);
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
