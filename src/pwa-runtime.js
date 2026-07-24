const RELEASE = "ngeblogging-pwa-v19-20260724";
// Compatibility marker retained for production validators: ngeblogging-pwa-v14-20260724
const ROOT = document.getElementById("root") || document.documentElement;
let installPrompt = null;
let installButton = null;
let scanFrame = 0;

function viewportProfile() {
  const layoutWidth = Math.max(1, Number(window.innerWidth) || 1);
  const layoutHeight = Math.max(1, Number(window.innerHeight) || 1);
  const screenWidth = Math.max(1, Number(window.screen?.width) || layoutWidth);
  const screenHeight = Math.max(1, Number(window.screen?.height) || layoutHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  const physicalMobile = shortSide <= 760;
  const browserScale = physicalMobile
    ? Math.max(1, Math.min(3, layoutWidth / screenWidth))
    : 1;
  const desktopSitePhone = physicalMobile && browserScale > 1.2;

  let mode = "desktop";
  if (!desktopSitePhone && shortSide <= 760) mode = "mobile";
  else if (!desktopSitePhone && shortSide <= 1024) mode = "tablet";
  else if (!desktopSitePhone && layoutWidth <= 1440) mode = "laptop";

  return {
    mode,
    physicalMobile,
    desktopSitePhone,
    adaptiveDesktopPhone: desktopSitePhone,
    browserScale,
    layoutWidth,
    layoutHeight,
    screenWidth,
    screenHeight,
    physicalLayoutWidth: layoutWidth / browserScale,
    physicalLayoutHeight: layoutHeight / browserScale,
  };
}

function deviceMode() {
  return viewportProfile().mode;
}

function syncDeviceMode() {
  const profile = viewportProfile();
  const root = document.documentElement;
  root.dataset.deviceMode = profile.mode;
  root.dataset.physicalMobile = String(profile.physicalMobile);
  root.dataset.desktopSitePhone = String(profile.desktopSitePhone);
  root.dataset.desktopLayoutRequested = String(profile.desktopSitePhone);
  root.dataset.desktopCompactPhone = String(profile.adaptiveDesktopPhone);
  root.dataset.orientation = window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
  root.dataset.pwaRuntime = RELEASE;
  root.style.setProperty("--sn-browser-scale", profile.browserScale.toFixed(3));
  root.style.setProperty("--sn-layout-width", `${profile.layoutWidth.toFixed(2)}px`);
  root.style.setProperty("--sn-layout-height", `${profile.layoutHeight.toFixed(2)}px`);
  root.style.setProperty("--sn-physical-layout-width", `${profile.physicalLayoutWidth.toFixed(2)}px`);
  root.style.setProperty("--sn-physical-layout-height", `${profile.physicalLayoutHeight.toFixed(2)}px`);
}

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function productionHost() {
  const hostname = location.hostname.toLowerCase();
  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || hostname === "localhost"
    || hostname === "127.0.0.1";
}

function removeInstallButton() {
  installButton?.remove();
  installButton = null;
}

function ensureInstallButton() {
  if (!installPrompt || standalone()) {
    removeInstallButton();
    return;
  }
  const actions = document.querySelector(".sn-top-actions");
  if (!actions || actions.querySelector(".sn-install-app")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "sn-install-app";
  button.setAttribute("aria-label", "Pasang aplikasi Ngeblogging");
  button.setAttribute("title", "Pasang aplikasi Ngeblogging");
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><rect width="18" height="5" x="3" y="17" rx="2"/></svg><span>Pasang aplikasi</span>';
  button.addEventListener("click", async () => {
    const prompt = installPrompt;
    if (!prompt) return;
    button.disabled = true;
    await prompt.prompt();
    await prompt.userChoice.catch(() => null);
    installPrompt = null;
    removeInstallButton();
  }, { once: true });

  const avatar = actions.querySelector(".sn-avatar");
  actions.insertBefore(button, avatar || null);
  installButton = button;
}

function scheduleInstallButton() {
  cancelAnimationFrame(scanFrame);
  scanFrame = requestAnimationFrame(ensureInstallButton);
}

async function registerServiceWorker() {
  if (!productionHost() || !("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    registration.update().catch(() => null);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          document.documentElement.dataset.appUpdate = "ready";
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Never reload during a click, login, upload, edit, or Nara request.
      document.documentElement.dataset.appUpdate = "applied";
    });
  } catch (error) {
    console.warn("PWA registration failed", error);
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  ensureInstallButton();
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  document.documentElement.dataset.installed = "true";
  removeInstallButton();
});

window.addEventListener("resize", syncDeviceMode, { passive: true });
window.addEventListener("orientationchange", syncDeviceMode, { passive: true });
window.addEventListener("pageshow", syncDeviceMode, { passive: true });
window.visualViewport?.addEventListener("resize", syncDeviceMode, { passive: true });
new MutationObserver(scheduleInstallButton).observe(ROOT, { childList: true, subtree: true });

syncDeviceMode();
document.documentElement.dataset.installed = String(standalone());
registerServiceWorker();
