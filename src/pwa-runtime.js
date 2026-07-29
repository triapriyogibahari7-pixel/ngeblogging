const RELEASE = "ngeblogging-pwa-v141-20260729";
const ROOT = document.getElementById("root") || document.documentElement;
const CONTROLLER_GUARD = "ngeblogging-pwa-controller-v141";
const RECOVERY_QUERY = "ngeblogging_recovery";
const RECOVERY_VALUE = "pwa-v141-studio-mobile-auth";
let installPrompt = null;
let installButton = null;
let scanFrame = 0;
let controllerRecoveryStarted = false;

function mediaMatches(query) {
  try { return window.matchMedia?.(query)?.matches === true; } catch { return false; }
}

function handheldSignal() {
  const userAgent = navigator.userAgent || "";
  const mobileUa = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(userAgent);
  const coarsePointer = mediaMatches("(pointer: coarse)") || mediaMatches("(any-pointer: coarse)");
  const finePointer = mediaMatches("(any-pointer: fine)");
  return mobileUa || (Number(navigator.maxTouchPoints || 0) > 1 && coarsePointer && !finePointer);
}

function viewportProfile() {
  const layoutWidth = Math.max(1, Number(document.documentElement.clientWidth || window.innerWidth) || 1);
  const layoutHeight = Math.max(1, Number(document.documentElement.clientHeight || window.innerHeight) || 1);
  const visualWidth = Math.max(1, Number(window.visualViewport?.width) || layoutWidth);
  const screenWidth = Math.max(1, Number(window.screen?.width) || layoutWidth);
  const screenHeight = Math.max(1, Number(window.screen?.height) || layoutHeight);
  const handheld = handheldSignal();
  const effectiveWidth = Math.min(layoutWidth, visualWidth);
  const desktopSitePhone = handheld && layoutWidth > 820;

  let mode = "desktop";
  if (handheld || effectiveWidth <= 820) mode = "mobile";
  else if (layoutWidth <= 1100) mode = "tablet";
  else if (layoutWidth <= 1440) mode = "laptop";

  return {
    mode,
    handheld,
    desktopSitePhone,
    layoutWidth,
    layoutHeight,
    visualWidth,
    screenWidth,
    screenHeight,
  };
}

function deviceMode() {
  return viewportProfile().mode;
}

function syncDeviceMode() {
  const profile = viewportProfile();
  const root = document.documentElement;
  root.dataset.deviceMode = profile.mode;
  root.dataset.physicalPhone = String(profile.handheld);
  root.dataset.physicalMobile = String(profile.mode === "mobile");
  root.dataset.physicalScreenMobile = String(profile.handheld);
  root.dataset.desktopSitePhone = String(profile.desktopSitePhone);
  root.dataset.desktopLayoutRequested = String(profile.desktopSitePhone);
  root.dataset.desktopCompactPhone = "false";
  root.dataset.orientation = mediaMatches("(orientation: portrait)") ? "portrait" : "landscape";
  root.dataset.pwaRuntime = RELEASE;
  root.style.setProperty("--sn-browser-scale", "1");
  root.style.setProperty("--sn-layout-width", `${profile.layoutWidth}px`);
  root.style.setProperty("--sn-layout-height", `${profile.layoutHeight}px`);
  root.style.setProperty("--sn-visual-width", `${profile.visualWidth}px`);
}

function standalone() {
  return mediaMatches("(display-mode: standalone)") || window.navigator.standalone === true;
}

function productionHost() {
  const hostname = location.hostname.toLowerCase();
  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || hostname === "localhost"
    || hostname === "127.0.0.1";
}

function authSurface() {
  const params = new URLSearchParams(window.location.search);
  return location.pathname === "/login"
    || location.pathname === "/signup"
    || location.pathname.startsWith("/auth/")
    || params.has("code")
    || params.get("auth") === "callback"
    || params.get("auth") === "recovery";
}

function reloadForNewController(reason = "controllerchange") {
  if (controllerRecoveryStarted || authSurface()) return;
  const url = new URL(window.location.href);
  if (url.searchParams.get(RECOVERY_QUERY) === RECOVERY_VALUE) return;
  try {
    if (sessionStorage.getItem(CONTROLLER_GUARD) === RECOVERY_VALUE) return;
    sessionStorage.setItem(CONTROLLER_GUARD, RECOVERY_VALUE);
  } catch {
    // Query guard tetap mencegah loop ketika storage browser dibatasi.
  }
  controllerRecoveryStarted = true;
  url.searchParams.set(RECOVERY_QUERY, RECOVERY_VALUE);
  url.searchParams.set("recovery_reason", reason);
  window.location.replace(url.href);
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
  if (scanFrame) cancelAnimationFrame(scanFrame);
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
      document.documentElement.dataset.appUpdate = "applied";
      reloadForNewController("controllerchange");
    });
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "NGE_BLOGGING_FORCE_RELOAD_V77") {
        reloadForNewController(event.data.reason || "service-worker-message");
      }
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
  document.documentElement.dataset.installed = String(standalone());
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

export { deviceMode };
