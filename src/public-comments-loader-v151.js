const RELEASE = "public-comments-loader-v151-20260729";
const SYSTEM_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "ngeblogging.com",
  "www.ngeblogging.com",
  "studio.ngeblogging.com",
  "api.ngeblogging.com",
]);

function hasPublishedContentPath() {
  return window.location.pathname.split("/").filter(Boolean).length > 0;
}

function isPublicTenant() {
  const host = window.location.hostname.toLowerCase();
  if (SYSTEM_HOSTS.has(host)) return false;
  if (host.endsWith(".workers.dev") || host.endsWith(".pages.dev") || host.endsWith(".netlify.app")) {
    return Boolean(document.querySelector(".ps-site,.ps-theme-home"));
  }
  return host.endsWith(".ngeblogging.com") || !host.endsWith("ngeblogging.com");
}

function ensureStylesheet() {
  if (document.querySelector('link[data-public-comments-v151="style"],link[href*="comments-v93.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/comments-v93.css?v=151";
  link.dataset.publicCommentsV151 = "style";
  document.head.append(link);
}

function ensureScript() {
  if (window.__ngebloggingCommentsV93 || document.querySelector('script[data-public-comments-v151="script"],script[src*="comments-v93.js"]')) return;
  const script = document.createElement("script");
  script.src = "/comments-v93.js?v=151";
  script.defer = true;
  script.dataset.publicCommentsV151 = "script";
  script.dataset.release = RELEASE;
  document.body.append(script);
}

function activatePublicComments() {
  if (!isPublicTenant() || !hasPublishedContentPath()) return;
  ensureStylesheet();
  ensureScript();
  document.documentElement.dataset.publicCommentsLoaderV151 = RELEASE;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", activatePublicComments, { once: true });
} else {
  activatePublicComments();
}
window.addEventListener("pageshow", activatePublicComments, { passive: true });

export { RELEASE, activatePublicComments };
