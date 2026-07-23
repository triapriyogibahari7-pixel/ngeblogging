import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import StudioNext from "./StudioNext.jsx";
import BackupCenter from "./BackupCenter.jsx";
import FaviconSettings from "./FaviconSettings.jsx";

const MOBILE_QUERY = "(max-width: 1100px)";

export default function StudioSecure(props) {
  const [backupMount,setBackupMount] = useState(null);
  const [faviconMount,setFaviconMount] = useState(null);
  const [mobileSidebarOpen,setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    let ownedBackupHost = null;
    let ownedFaviconHost = null;
    const sync = () => {
      const settingsGrid = document.querySelector(".sn-settings-grid");
      if (!settingsGrid) {
        setBackupMount(null);
        setFaviconMount(null);
        if (ownedBackupHost?.isConnected) ownedBackupHost.remove();
        if (ownedFaviconHost?.isConnected) ownedFaviconHost.remove();
        ownedBackupHost = null;
        ownedFaviconHost = null;
        return;
      }

      let faviconHost = document.getElementById("ngeblogging-favicon-settings");
      if (!faviconHost) {
        faviconHost = document.createElement("div");
        faviconHost.id = "ngeblogging-favicon-settings";
        faviconHost.className = "sn-favicon-host";
        settingsGrid.insertAdjacentElement("afterend",faviconHost);
        ownedFaviconHost = faviconHost;
      }

      let backupHost = document.getElementById("ngeblogging-backup-settings");
      if (!backupHost) {
        backupHost = document.createElement("div");
        backupHost.id = "ngeblogging-backup-settings";
        backupHost.className = "sn-backup-host";
        faviconHost.insertAdjacentElement("afterend",backupHost);
        ownedBackupHost = backupHost;
      } else if (backupHost.previousElementSibling !== faviconHost) {
        faviconHost.insertAdjacentElement("afterend",backupHost);
      }

      setFaviconMount((current) => current === faviconHost ? current : faviconHost);
      setBackupMount((current) => current === backupHost ? current : backupHost);
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true});
    sync();
    return () => {
      observer.disconnect();
      if (ownedBackupHost?.isConnected) ownedBackupHost.remove();
      if (ownedFaviconHost?.isConnected) ownedFaviconHost.remove();
    };
  },[]);

  useLayoutEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    let initialized = false;
    let previousNarrow = media.matches;

    const elements = () => ({
      side: document.querySelector(".sn-side"),
      toggle: document.querySelector(".sn-icon"),
    });

    const syncAttributes = () => {
      const { side, toggle } = elements();
      if (!side || !toggle) {
        document.body.classList.remove("sn-mobile-menu-open");
        setMobileSidebarOpen(false);
        return;
      }
      side.id = "studio-navigation";
      toggle.setAttribute("aria-controls","studio-navigation");
      const isOpen = !side.classList.contains("collapsed");
      const mobileOpen = media.matches && isOpen;
      toggle.setAttribute("aria-expanded",String(isOpen));
      toggle.setAttribute("aria-label",isOpen ? "Tutup sidebar navigasi" : "Buka sidebar navigasi");
      side.setAttribute("aria-hidden",String(media.matches && !isOpen));
      document.body.classList.toggle("sn-mobile-menu-open",mobileOpen);
      setMobileSidebarOpen(mobileOpen);
    };

    const normalizeMode = (force = false) => {
      const { side, toggle } = elements();
      if (!side || !toggle) return;
      const narrow = media.matches;
      const isOpen = !side.classList.contains("collapsed");
      const modeChanged = force || narrow !== previousNarrow;
      previousNarrow = narrow;
      if (modeChanged && narrow && isOpen) {
        toggle.click();
        return;
      }
      if (modeChanged && !narrow && !isOpen) {
        toggle.click();
        return;
      }
      syncAttributes();
    };

    const observer = new MutationObserver(() => {
      if (!initialized) {
        initialized = true;
        normalizeMode(true);
      } else syncAttributes();
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});

    const onClick = (event) => {
      if (!media.matches) return;
      const menuAction = event.target.closest(".sn-side nav button,.sn-side-bottom button,.sn-new");
      if (!menuAction) return;
      window.setTimeout(() => {
        const { side, toggle } = elements();
        if (side && toggle && !side.classList.contains("collapsed")) toggle.click();
      },0);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || !media.matches) return;
      const { side, toggle } = elements();
      if (side && toggle && !side.classList.contains("collapsed")) toggle.click();
    };
    const onMediaChange = () => normalizeMode(true);

    document.addEventListener("click",onClick);
    document.addEventListener("keydown",onKeyDown);
    media.addEventListener?.("change",onMediaChange);
    normalizeMode(true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click",onClick);
      document.removeEventListener("keydown",onKeyDown);
      media.removeEventListener?.("change",onMediaChange);
      document.body.classList.remove("sn-mobile-menu-open");
    };
  },[]);

  const closeMobileSidebar = () => {
    const side = document.querySelector(".sn-side");
    const toggle = document.querySelector(".sn-icon");
    if (side && toggle && !side.classList.contains("collapsed")) toggle.click();
  };

  return <>
    <StudioNext {...props}/>
    {mobileSidebarOpen ? createPortal(<button className="sn-side-backdrop" onClick={closeMobileSidebar} aria-label="Tutup sidebar navigasi"/>,document.body) : null}
    {faviconMount ? createPortal(<FaviconSettings user={props.user}/>,faviconMount) : null}
    {backupMount ? createPortal(<BackupCenter user={props.user}/>,backupMount) : null}
  </>;
}
