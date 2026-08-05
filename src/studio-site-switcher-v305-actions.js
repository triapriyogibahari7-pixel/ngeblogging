import "./studio-site-switcher-v305-actions.css";

export const STUDIO_SITE_SWITCHER_ACTIONS_RELEASE_V305 = "studio-site-switcher-actions-v305-20260805";

function openCurrentSiteFromManageButton(event) {
  const button = event.target?.closest?.(".sn-site-switcher-v305-row .site-actions button.current");
  if (!button) return;
  const row = button.closest(".sn-site-switcher-v305-row");
  const siteId = String(row?.dataset?.siteId || "").trim();
  if (!siteId) return;

  const target = new URL("/studio", window.location.origin);
  target.searchParams.set("site", siteId);
  target.searchParams.set("site_switch", "v305");
  target.searchParams.set("manage", "1");
  window.location.assign(target.href);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.documentElement.dataset.studioSiteSwitcherActionsV305 = STUDIO_SITE_SWITCHER_ACTIONS_RELEASE_V305;
  window.addEventListener("click", openCurrentSiteFromManageButton, false);
}
