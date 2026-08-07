import "./studio-content-editor-responsive-v308.css";
import "./studio-content-editor-post-page-polish-v309.css";
import "./studio-content-editor-desktop-site-v310.css";
import "./studio-content-editor-final-v316.js";
import "./studio-final-v317.css";
import "./studio-hotfix-v318.css";
import "./studio-screenshot-regression-v319.js";
import "./studio-theme-domain-v321.js";
import "./studio-production-polish-v323.js";
import "./studio-theme-domain-final-v325.js";
import "./studio-theme-code-device-v330.js";

// v332-v336 remain in Git as layout-history backups, but their runtimes all
// enforced a single-map/hide-secondary policy. v337 intentionally replaces that
// policy: the full reference map stays first and the former right-hand
// Editorial/Majalah surface is preserved as a full-width row below it.
// backup v337: import "./studio-theme-layout-single-v332.js";
// backup v337: import "./studio-theme-layout-single-v334.js";
// backup v337: import "./studio-theme-layout-single-v335.js";
// backup v337: import "./studio-theme-layout-one-v336.js";
import "./studio-theme-layout-below-v337.js";
// v338 is intentionally compact-only: application, handphone, mobile,
// perangkat kecil and tablet use a real mobile-width map instead of the 720px
// internal desktop canvas. Laptop/desktop/computer keep their large geometry.
import "./studio-theme-layout-mobile-v338.js";

export const STUDIO_CONTENT_EDITOR_RELEASE_V308 = "studio-content-editor-responsive-v308-20260806";
export const STUDIO_CONTENT_EDITOR_POLISH_RELEASE_V309 = "studio-content-editor-post-page-polish-v309-20260806";
export const STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310 = "studio-content-editor-desktop-site-v310-20260806";
export const STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316 = "studio-content-editor-final-v316-20260806";
export const STUDIO_FINAL_RESPONSIVE_RELEASE_V317 = "studio-final-responsive-v317-20260806";
export const STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318 = "studio-screenshot-hotfix-v318-20260806";
export const STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319 = "studio-screenshot-regression-v319-20260806";
export const STUDIO_THEME_DOMAIN_RELEASE_V321 = "studio-theme-domain-v321-20260806";
export const STUDIO_PRODUCTION_POLISH_RELEASE_V323 = "studio-production-polish-v323-20260806";
export const STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325 = "studio-theme-domain-final-v325-20260806";
export const STUDIO_THEME_CODE_DEVICE_RELEASE_V330 = "studio-theme-code-device-v330-20260806";
export const STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332 = "studio-theme-layout-single-v332-20260807";
export const STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334 = "studio-theme-layout-single-v334-20260807";
export const STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V335 = "studio-theme-layout-single-v335-20260807";
export const STUDIO_THEME_LAYOUT_ONE_RELEASE_V336 = "studio-theme-layout-one-v336-20260807";
export const STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337 = "studio-theme-layout-below-v337-20260807";
export const STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338 = "studio-theme-layout-mobile-v338-20260807";

if (typeof document !== "undefined") {
  document.documentElement.dataset.studioContentEditorV308 = STUDIO_CONTENT_EDITOR_RELEASE_V308;
  document.documentElement.dataset.studioContentEditorPolishV309 = STUDIO_CONTENT_EDITOR_POLISH_RELEASE_V309;
  document.documentElement.dataset.studioContentEditorDesktopSiteV310 = STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310;
  document.documentElement.dataset.studioContentEditorFinalV316 = STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316;
  document.documentElement.dataset.studioFinalResponsiveV317 = STUDIO_FINAL_RESPONSIVE_RELEASE_V317;
  document.documentElement.dataset.studioScreenshotHotfixV318 = STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318;
  document.documentElement.dataset.studioScreenshotRegressionV319 = STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319;
  document.documentElement.dataset.studioThemeDomainV321 = STUDIO_THEME_DOMAIN_RELEASE_V321;
  document.documentElement.dataset.studioProductionPolishV323 = STUDIO_PRODUCTION_POLISH_RELEASE_V323;
  document.documentElement.dataset.studioThemeDomainFinalV325 = STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325;
  document.documentElement.dataset.studioThemeCodeDeviceV330 = STUDIO_THEME_CODE_DEVICE_RELEASE_V330;
  document.documentElement.dataset.studioThemeLayoutSingleV332 = STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332;
  document.documentElement.dataset.studioThemeLayoutSingleV334 = STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334;
  document.documentElement.dataset.studioThemeLayoutSingleV335 = STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V335;
  document.documentElement.dataset.studioThemeLayoutOneV336 = STUDIO_THEME_LAYOUT_ONE_RELEASE_V336;
  document.documentElement.dataset.studioThemeLayoutBelowV337 = STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337;
  document.documentElement.dataset.studioThemeLayoutMobileV338 = STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338;
}
