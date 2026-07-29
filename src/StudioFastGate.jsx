import React, { useMemo } from "react";
import StudioOnboardingGate from "./StudioOnboardingGate.jsx";
import StudioSecure from "./StudioSecure.jsx";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const RELEASE = "studio-fast-entry-v136-20260729";

function hasKnownSite() {
  try {
    if (window.__ngebloggingActiveSite?.id) return true;
    if (document.documentElement.dataset.activeSiteId) return true;
    return Boolean(localStorage.getItem(ACTIVE_SITE_STORAGE_KEY));
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
