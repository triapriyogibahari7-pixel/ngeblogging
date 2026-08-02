import React, { useMemo } from "react";
import StudioOnboardingGate from "./StudioOnboardingGate.jsx";
import StudioSecure from "./StudioSecure.jsx";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const RELEASE = "studio-fast-entry-v208-20260802";
const SNAPSHOT_KEYS = [
  "ngeblogging-active-site-snapshot-v195",
  "ngeblogging-active-site-snapshot-v192",
  "ngeblogging-active-site-snapshot-v190",
  "ngeblogging-active-site-snapshot-v186",
  "ngeblogging-active-site-snapshot-v185",
  "ngeblogging-active-site-snapshot-v183",
];

function snapshotHasSite(key, userId) {
  try {
    const snapshot = JSON.parse(localStorage.getItem(key) || "null");
    if (!snapshot?.id) return false;
    if (snapshot.__userId && userId && snapshot.__userId !== userId) return false;
    return true;
  } catch {
    return false;
  }
}

function hasKnownSite(userId) {
  try {
    if (window.__ngebloggingActiveSite?.id) return true;
    if (document.documentElement.dataset.activeSiteId) return true;
    if (localStorage.getItem(ACTIVE_SITE_STORAGE_KEY)) return true;
    return SNAPSHOT_KEYS.some((key) => snapshotHasSite(key, userId));
  } catch {
    return Boolean(window.__ngebloggingActiveSite?.id);
  }
}

export default function StudioFastGate(props) {
  const canResumeImmediately = useMemo(
    () => Boolean(props.user?.id && hasKnownSite(props.user.id)),
    [props.user?.id],
  );

  document.documentElement.dataset.studioEntryRelease = RELEASE;
  if (canResumeImmediately) {
    document.documentElement.dataset.studioEntryMode = "resume-known-site-v208";
    return <StudioSecure {...props}/>;
  }

  document.documentElement.dataset.studioEntryMode = "verify-first-site-v208";
  return <StudioOnboardingGate {...props}/>;
}