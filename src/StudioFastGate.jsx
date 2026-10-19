import React, { useMemo } from "react";
import StudioOnboardingGate from "./StudioOnboardingGate.jsx";
import StudioSecure from "./StudioSecure.jsx";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const RELEASE = "studio-fast-entry-v311-20260806";
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

function siteBelongsToUser(value, userId) {
  if (!usableSite(value)) return false;
  if (!userId) return true;
  return Boolean(value.__userId && value.__userId === userId);
}

function snapshotForUser(userId) {
  for (const key of SNAPSHOT_KEYS) {
    try {
      const snapshot = JSON.parse(localStorage.getItem(key) || "null");
      if (siteBelongsToUser(snapshot, userId)) return snapshot;
    } catch {
      // Ignore corrupt or old snapshots and verify the account against cloud data.
    }
  }
  return null;
}

function hasKnownSite(userId) {
  try {
    const live = window.__ngebloggingActiveSite;
    if (siteBelongsToUser(live, userId)) return true;

    // A naked active-site id is not enough to resume Studio for a newly signed-in
    // account. It can belong to a previous account on the same browser. Only a
    // user-scoped snapshot may authorize the fast path.
    const snapshot = snapshotForUser(userId);
    if (!snapshot) return false;
    const preferredId = document.documentElement.dataset.activeSiteId
      || localStorage.getItem(ACTIVE_SITE_STORAGE_KEY)
      || "";
    return !preferredId || String(snapshot.id) === String(preferredId);
  } catch {
    return siteBelongsToUser(window.__ngebloggingActiveSite, userId);
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
