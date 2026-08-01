import React, { useMemo } from "react";
import StudioOnboardingGate from "./StudioOnboardingGate.jsx";
import StudioSecure from "./StudioSecure.jsx";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const RELEASE = "studio-fast-entry-v189-20260801";
const SNAPSHOT_KEYS = [
  "ngeblogging-active-site-snapshot-v186",
  "ngeblogging-active-site-snapshot-v185",
  "ngeblogging-active-site-snapshot-v183",
];

function hasKnownSite() {
  try {
    if (window.__ngebloggingActiveSite?.id) return true;
    if (document.documentElement.dataset.activeSiteId) return true;
    if (localStorage.getItem(ACTIVE_SITE_STORAGE_KEY)) return true;
    return SNAPSHOT_KEYS.some((key) => {
      try { return Boolean(JSON.parse(localStorage.getItem(key) || "null")?.id); }
      catch { return false; }
    });
  } catch {
    return Boolean(window.__ngebloggingActiveSite?.id);
  }
}

export default function StudioFastGate(props) {
  const canResumeImmediately = useMemo(
    () => Boolean(props.user?.id && hasKnownSite()),
    [props.user?.id],
  );

  if (canResumeImmediately) {
    document.documentElement.dataset.studioEntryRelease = RELEASE;
    document.documentElement.dataset.studioEntryMode = "resume-known-site";
    return <StudioSecure {...props}/>;
  }

  document.documentElement.dataset.studioEntryRelease = RELEASE;
  document.documentElement.dataset.studioEntryMode = "verify-first-site";
  return <StudioOnboardingGate {...props}/>;
}