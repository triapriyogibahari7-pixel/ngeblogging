import "./studio-content-editor-responsive-v308.css";
import "./studio-content-editor-post-page-polish-v309.css";
import "./studio-content-editor-desktop-site-v310.css";

export const STUDIO_CONTENT_EDITOR_RELEASE_V308 = "studio-content-editor-responsive-v308-20260806";
export const STUDIO_CONTENT_EDITOR_POLISH_RELEASE_V309 = "studio-content-editor-post-page-polish-v309-20260806";
export const STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310 = "studio-content-editor-desktop-site-v310-20260806";

if (typeof document !== "undefined") {
  document.documentElement.dataset.studioContentEditorV308 = STUDIO_CONTENT_EDITOR_RELEASE_V308;
  document.documentElement.dataset.studioContentEditorPolishV309 = STUDIO_CONTENT_EDITOR_POLISH_RELEASE_V309;
  document.documentElement.dataset.studioContentEditorDesktopSiteV310 = STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310;
}
