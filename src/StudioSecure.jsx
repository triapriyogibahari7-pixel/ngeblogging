import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import StudioNext from "./StudioNext.jsx";
import BackupCenter from "./BackupCenter.jsx";

const EXTRAS_ID = "ngeblogging-settings-extras";
const BACKUP_HOST_ID = "ngeblogging-backup-settings";

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

export default function StudioSecure(props) {
  const [backupMount, setBackupMount] = useState(null);

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
