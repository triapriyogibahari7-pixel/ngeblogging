import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import StudioNext from "./StudioNext.jsx";
import BackupCenter from "./BackupCenter.jsx";

export default function StudioSecure(props) {
  const [backupMount,setBackupMount] = useState(null);

  useEffect(() => {
    let ownedHost = null;
    const sync = () => {
      const settingsGrid = document.querySelector(".sn-settings-grid");
      if (!settingsGrid) {
        setBackupMount(null);
        if (ownedHost?.isConnected) ownedHost.remove();
        ownedHost = null;
        return;
      }
      let host = document.getElementById("ngeblogging-backup-settings");
      if (!host) {
        host = document.createElement("div");
        host.id = "ngeblogging-backup-settings";
        host.className = "sn-backup-host";
        settingsGrid.insertAdjacentElement("afterend",host);
        ownedHost = host;
      }
      setBackupMount((current) => current === host ? current : host);
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true});
    sync();
    return () => {
      observer.disconnect();
      if (ownedHost?.isConnected) ownedHost.remove();
    };
  },[]);

  return <><StudioNext {...props}/>{backupMount ? createPortal(<BackupCenter user={props.user}/>,backupMount) : null}</>;
}
