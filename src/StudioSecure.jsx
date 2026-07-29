import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import StudioStableV124 from "./StudioStableV124.jsx";
import BackupCenter from "./BackupCenter.jsx";

const EXTRAS_ID = "ngeblogging-settings-extras";
const BACKUP_HOST_ID = "ngeblogging-backup-settings";

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

export default function StudioSecure(props) {
  const [backupMount, setBackupMount] = useState(null);

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

  return <>
    <StudioStableV124 {...props}/>
    {backupMount ? createPortal(<BackupCenter user={props.user}/>, backupMount) : null}
  </>;
}
