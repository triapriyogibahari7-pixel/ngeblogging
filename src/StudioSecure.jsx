import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import StudioNext from "./StudioNext.jsx";
import BackupCenter from "./BackupCenter.jsx";
import "./studio-v9-enhancements.css";
import "./studio-v11-mobile-repair.css";

const EXTRAS_ID = "ngeblogging-settings-extras";
const BACKUP_HOST_ID = "ngeblogging-backup-settings";
const PHONE_QUERY = "(max-width: 760px)";
const SOURCE_NAVIGATION_RELEASE = "studio-source-navigation-v9-20260724";

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
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

function enforceSourceNavigation() {
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;

  shell.dataset.sourceNavigation = SOURCE_NAVIGATION_RELEASE;
  shell.querySelectorAll(":scope > .sn-mobile-nav, :scope > .sn-mobile-sheet-layer").forEach((node) => node.remove());

  const side = shell.querySelector(":scope > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  const bottom = side?.querySelector(":scope > .sn-side-bottom");
  if (nav && bottom) {
    [...bottom.querySelectorAll(":scope > button")].forEach((button) => {
      const label = buttonLabel(button);
      const duplicate = [...nav.querySelectorAll(":scope > button")].some((candidate) => buttonLabel(candidate) === label);
      if (!duplicate) nav.append(button);
    });
    bottom.remove();
  }

  const toggle = shell.querySelector(":scope > .sn-main > .sn-top .sn-icon");
  shell.querySelectorAll(".sn-side-close, [data-sidebar-authority]:not(.sn-icon)").forEach((node) => node.remove());
  if (toggle && side) {
    side.id ||= "ngeblogging-studio-sidebar";
    toggle.dataset.sidebarAuthority = "single";
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
      frame = requestAnimationFrame(enforceSourceNavigation);
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    enforceSourceNavigation();

    const closeAfterSelection = (event) => {
      const button = event.target.closest(".sn-side nav button");
      if (!button || !window.matchMedia(PHONE_QUERY).matches) return;
      requestAnimationFrame(() => {
        const side = document.querySelector(".sn-shell > .sn-side");
        const toggle = document.querySelector(".sn-shell > .sn-main > .sn-top .sn-icon");
        if (side && toggle && !side.classList.contains("collapsed")) toggle.click();
      });
    };
    document.addEventListener("click", closeAfterSelection, true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("click", closeAfterSelection, true);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { headers: { accept: "application/json", "cache-control": "no-cache" } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Health ${response.status}`)))
      .then((health) => {
        if (cancelled) return;
        document.documentElement.dataset.billingReady = String(health.billing === true);
        document.documentElement.dataset.emailRegistrationReady = String(health.emailRegistration === true);
        document.documentElement.dataset.customDomainsReady = String(health.customDomains === true);
        document.documentElement.dataset.naraReady = String(health.nara === true);
        enforceSourceNavigation();
      })
      .catch(() => {
        if (cancelled) return;
        document.documentElement.dataset.billingReady = "false";
        enforceSourceNavigation();
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
