import React, { useMemo } from "react";
import StudioOnboardingGate from "./StudioOnboardingGate.jsx";
import StudioSecure from "./StudioSecure.jsx";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const RELEASE = "studio-fast-entry-v210-20260802";
const SNAPSHOT_KEYS = [
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

function hasKnownSite() {
  try {
    if (usableSite(window.__ngebloggingActiveSite)) return true;
    if (document.documentElement.dataset.activeSiteId) return true;
    if (localStorage.getItem(ACTIVE_SITE_STORAGE_KEY)) return true;
    return SNAPSHOT_KEYS.some((key) => {
      try { return usableSite(JSON.parse(localStorage.getItem(key) || "null")); }
      catch { return false; }
    });
  } catch {
    return usableSite(window.__ngebloggingActiveSite);
  }
}

export default function StudioFastGate(props) {
  const canResumeImmediately = useMemo(
    () => Boolean(props.user?.id && hasKnownSite()),
    [props.user?.id],
  );

  document.documentElement.dataset.studioEntryRelease = RELEASE;
  if (canResumeImmediately) {
    document.documentElement.dataset.studioEntryMode = "resume-known-site";
    return <StudioSecure {...props}/>;
  }

  document.documentElement.dataset.studioEntryMode = "verify-first-site";
  return <StudioOnboardingGate {...props}/>;
}
