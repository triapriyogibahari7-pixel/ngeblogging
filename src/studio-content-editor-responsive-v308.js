import "./studio-content-editor-responsive-v308.css";
import "./studio-content-editor-post-page-polish-v309.css";
import "./studio-content-editor-desktop-site-v310.css";
import "./studio-content-editor-final-v316.js";
import "./studio-final-v317.css";

export const STUDIO_CONTENT_EDITOR_RELEASE_V308 = "studio-content-editor-responsive-v308-20260806";
export const STUDIO_CONTENT_EDITOR_POLISH_RELEASE_V309 = "studio-content-editor-post-page-polish-v309-20260806";
export const STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310 = "studio-content-editor-desktop-site-v310-20260806";
export const STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316 = "studio-content-editor-final-v316-20260806";
export const STUDIO_FINAL_RESPONSIVE_RELEASE_V317 = "studio-final-responsive-v317-20260806";

if (typeof document !== "undefined") {
  document.documentElement.dataset.studioContentEditorV308 = STUDIO_CONTENT_EDITOR_RELEASE_V308;
  document.documentElement.dataset.studioContentEditorPolishV309 = STUDIO_CONTENT_EDITOR_POLISH_RELEASE_V309;
  document.documentElement.dataset.studioContentEditorDesktopSiteV310 = STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310;
  document.documentElement.dataset.studioContentEditorFinalV316 = STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316;
  document.documentElement.dataset.studioFinalResponsiveV317 = STUDIO_FINAL_RESPONSIVE_RELEASE_V317;
}
