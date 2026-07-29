import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import StudioStableV124 from "./StudioStableV124.jsx";
import AnalyticsPanelV125 from "./AnalyticsPanelV125.jsx";
import MembersPanelV125 from "./MembersPanelV125.jsx";
import BackupCenter from "./BackupCenter.jsx";

const EXTRAS_ID = "ngeblogging-settings-extras";
const BACKUP_HOST_ID = "ngeblogging-backup-settings";
const OPERATIONAL_HOST_ID = "ngeblogging-operational-surface-v125";

function ensureExtrasContainer() {
  const saveButton = document.querySelector(".sv124-save-settings");
  if (!saveButton) return null;

  let extras = document.getElementById(EXTRAS_ID);
  if (!extras) {
    extras = document.createElement("div");
    extras.id = EXTRAS_ID;
    extras.className = "sv124-settings-extras";
    saveButton.insertAdjacentElement("afterend", extras);
  }
  return extras;
}

function currentOperationalRoute() {
  const label = document.querySelector(".sv124-side nav button.active span")?.textContent?.trim();
  if (label === "Analitik") return "analytics";
  if (label === "Anggota") return "members";
  return "";
}

function legacyOperationalPage(route) {
  const expected = route === "analytics" ? "Analitik" : route === "members" ? "Anggota & tim" : "";
  if (!expected) return null;
  return [...document.querySelectorAll(".sv124-main > .sv124-page")]
    .find((page) => page.querySelector(":scope > .sv124-page-title h1")?.textContent?.trim() === expected) || null;
}

export default function StudioSecure(props) {
  const [backupMount, setBackupMount] = useState(null);
  const [operationalMount, setOperationalMount] = useState(null);
  const [operationalRoute, setOperationalRoute] = useState("");
  const [activeSite, setActiveSite] = useState(() => window.__ngebloggingActiveSite || null);

  useEffect(() => {
    const update = (event) => setActiveSite(event?.detail || window.__ngebloggingActiveSite || null);
    window.addEventListener("ngeblogging:active-site-change", update);
    const timer = window.setInterval(() => {
      const next = window.__ngebloggingActiveSite || null;
      setActiveSite((current) => current?.id === next?.id ? current : next);
    }, 1000);
    return () => {
      window.removeEventListener("ngeblogging:active-site-change", update);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", {
      headers: { accept: "application/json", "cache-control": "no-cache" },
      cache: "no-store",
    })
      .then((response) => response.ok
        ? response.json()
        : Promise.reject(new Error(`Health ${response.status}`)))
      .then((health) => {
        if (cancelled) return;
        document.documentElement.dataset.billingReady = String(health.billing === true);
        document.documentElement.dataset.emailRegistrationReady = String(health.emailRegistration === true);
        document.documentElement.dataset.customDomainsReady = String(health.customDomains === true);
        document.documentElement.dataset.naraReady = String(health.nara === true);
        document.documentElement.dataset.naraImageReady = String(health.imageGeneration === true);
      })
      .catch(() => {
        if (cancelled) return;
        document.documentElement.dataset.billingReady = "false";
        document.documentElement.dataset.naraReady = "false";
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let ownedHost = null;
    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
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
          host.className = "sv124-backup-host";
          extras.append(host);
          ownedHost = host;
        } else if (host.parentElement !== extras) {
          extras.append(host);
        }

        setBackupMount((current) => current === host ? current : host);
      });
    };

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) sync();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    sync();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (ownedHost?.isConnected) ownedHost.remove();
      const extras = document.getElementById(EXTRAS_ID);
      if (extras && !extras.children.length) extras.remove();
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let ownedHost = null;
    let hiddenPage = null;

    const clear = () => {
      if (hiddenPage?.isConnected) hiddenPage.style.removeProperty("display");
      hiddenPage = null;
      if (ownedHost?.isConnected) ownedHost.remove();
      ownedHost = null;
      setOperationalMount(null);
      setOperationalRoute("");
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const main = document.querySelector(".sv124-main");
        const route = currentOperationalRoute();
        if (!main || !route) {
          clear();
          return;
        }

        const page = legacyOperationalPage(route);
        if (!page) return;
        if (hiddenPage && hiddenPage !== page) hiddenPage.style.removeProperty("display");
        hiddenPage = page;
        page.style.setProperty("display", "none", "important");

        let host = document.getElementById(OPERATIONAL_HOST_ID);
        if (!host) {
          host = document.createElement("div");
          host.id = OPERATIONAL_HOST_ID;
          host.className = "sv125-operational-host";
          const top = main.querySelector(":scope > .sv124-top");
          top?.insertAdjacentElement("afterend", host);
          if (!top) main.prepend(host);
          ownedHost = host;
        }
        if (host.parentElement !== main) {
          const top = main.querySelector(":scope > .sv124-top");
          top?.insertAdjacentElement("afterend", host);
          if (!top) main.prepend(host);
        }
        setOperationalRoute(route);
        setOperationalMount((current) => current === host ? current : host);
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    document.addEventListener("click", sync, true);
    sync();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("click", sync, true);
      clear();
    };
  }, []);

  return <>
    <div data-studio-shell="v125" data-studio-release="locked-react-v125" style={{ display: "contents" }}>
      <StudioStableV124 {...props}/>
    </div>
    {backupMount ? createPortal(<BackupCenter user={props.user}/>, backupMount) : null}
    {operationalMount && operationalRoute === "analytics" ? createPortal(<AnalyticsPanelV125 site={activeSite}/>, operationalMount) : null}
    {operationalMount && operationalRoute === "members" ? createPortal(<MembersPanelV125 site={activeSite}/>, operationalMount) : null}
  </>;
}
