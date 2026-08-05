import "./studio-native-controls-v290.css";

export const STUDIO_NATIVE_CONTROLS_RELEASE_V290 = "studio-native-controls-v290-20260805";
export const STUDIO_AUTH_SIDEBAR_COMPAT_V291 = "studio-auth-sidebar-v291-20260805";
export const STUDIO_NATIVE_CAPTURE_RETIRED_V298 = "studio-native-capture-retired-v298-20260805";
export const STUDIO_ADD_SITE_COMPAT_V303 = "studio-add-site-free-subdomain-v303-20260805";
export const STUDIO_SITE_SWITCHER_COMPAT_V304 = "studio-real-site-switcher-v304-20260805";
export const STUDIO_MEMBERS_COMPAT_V304 = "studio-members-real-invite-v304-20260805";

/*
 * v298 retires the old document-capture n owner from v290. The old handler
 * called the hidden React toggle from a capture listener and then scheduled
 * several DOM normalization passes. That worked as a recovery bridge, but it
 * also made taps feel heavy on physical mobile browsers and could race later
 * shell authorities.
 *
 * The visual v290 stylesheet stays loaded as compatibility history. Interaction
 * ownership now lives in exactly one lightweight v298 runtime.
 */
if (typeof document !== "undefined") {
  document.documentElement.dataset.studioNativeControlsV290 = STUDIO_NATIVE_CONTROLS_RELEASE_V290;
  document.documentElement.dataset.studioAuthSidebarV291 = STUDIO_AUTH_SIDEBAR_COMPAT_V291;
  document.documentElement.dataset.studioNativeCaptureV298 = "retired";
  document.documentElement.dataset.studioAddSiteCompatV303 = STUDIO_ADD_SITE_COMPAT_V303;
  document.documentElement.dataset.studioSiteSwitcherV304 = STUDIO_SITE_SWITCHER_COMPAT_V304;
  document.documentElement.dataset.studioMembersV304 = STUDIO_MEMBERS_COMPAT_V304;
}

/*
 * Keep only product authorities that still own real functions:
 * - v293: editor word/code limits and Theme layout integration
 * - v296: exactly 100 real theme catalog entries
 * - v298: six-mode shell, one n bridge, profile dropdown and Nara geometry
 * - v303: dedicated free *.ngeblogging.com site creation flow
 * - v304: fresh real-site switcher + owner/admin member invitation manager
 *
 * v295/v297 JavaScript global click normalizers are deliberately not executed;
 * their CSS is imported by v298 so completed visual work is preserved without
 * replaying document-wide normalization after every click.
 */
if (typeof window !== "undefined") {
  import("./studio-final-authority-v293.js")
    .then(() => import("./studio-theme-catalog-v296.js"))
    .then(() => import("./studio-shell-authority-v298.js"))
    .then(() => import("./studio-add-site-v303.js"))
    .then(() => import("./studio-site-switcher-v304.js"))
    .then(() => import("./studio-members-v304.js"))
    .catch((error) => console.error("Studio authority chain failed to load", error));
}
