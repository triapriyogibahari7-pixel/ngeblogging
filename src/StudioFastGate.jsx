import React, { useMemo } from "react";
import StudioOnboardingGate from "./StudioOnboardingGate.jsx";
import StudioSecure from "./StudioSecure.jsx";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const RELEASE = "studio-fast-entry-v292-20260805";
const SNAPSHOT_KEYS = [
  "ngeblogging-active-site-snapshot-v292",
  "ngeblogging-active-site-snapshot-v209",
  "ngeblogging-active-site-snapshot-v208",
  "ngeblogging-active-site-snapshot-v205",
  "ngeblogging-active-site-snapshot-v198",
  "ngeblogging-active-site-snapshot-v195",
  "ngeblogging-active-site-snapshot-v192",
  "ngeblogging-active-site-snapshot-v191",
  "ngeblogging-active-site-snapshot-v190",
  "ngeblogging-active-site-snapshot-v186",
  "ngeblogging-active-site-snapshot-v185",
  "ngeblogging-active-site-snapshot-v183",
];

function usableSite(value) {
  return Boolean(value?.id && (value?.slug || value?.name));
}

function hasKnownSite(userId) {
  try {
    if (usableSite(window.__ngebloggingActiveSite)) return true;
    if (document.documentElement.dataset.activeSiteId) return true;
    if (localStorage.getItem(ACTIVE_SITE_STORAGE_KEY)) return true;
    return SNAPSHOT_KEYS.some((key) => {
      try {
        const snapshot = JSON.parse(localStorage.getItem(key) || "null");
        if (!usableSite(snapshot)) return false;
        return !snapshot.__userId || !userId || snapshot.__userId === userId;
      } catch { return false; }
    });
  } catch {
    return usableSite(window.__ngebloggingActiveSite);
  }
}

export default function StudioFastGate(props) {
  const canResumeImmediately = useMemo(
    () => Boolean(props.user?.id && hasKnownSite(props.user.id)),
    [props.user?.id],
  );

  document.documentElement.dataset.studioEntryRelease = RELEASE;
  if (canResumeImmediately) {
    document.documentElement.dataset.studioEntryMode = "resume-known-site-v292";
    return <StudioSecure {...props}/>;
  }

  document.documentElement.dataset.studioEntryMode = "verify-first-site-v292";
  return <StudioOnboardingGate {...props}/>;
}
