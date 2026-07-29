const RELEASE = "ngeblogging-pwa-v147-20260729";
const LEGACY_RELEASE = "ngeblogging-pwa-v145-20260729";
const ROOT = document.getElementById("root") || document.documentElement;
const CONTROLLER_GUARD = "ngeblogging-pwa-controller-v147";
const LEGACY_CONTROLLER_GUARD = "ngeblogging-pwa-controller-v145";
const RECOVERY_QUERY = "ngeblogging_recovery";
const RECOVERY_VALUE = "pwa-v147-studio-interface";
const LEGACY_RECOVERY_VALUE = "pwa-v145-studio-mobile-cache";
const COMPACT_MAX = 760;
const TABLET_MAX = 1180;
const PHONE_MAX = 430;
const HANDHELD_MAX = 600;
let installPrompt = null;
let installButton = null;
let scanFrame = 0;
let controllerRecoveryStarted = false;

function mediaMatches(query) {
  try { return window.matchMedia?.(query)?.matches === true; } catch { return false; }
}

function finitePositive(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function standalone() {
  return mediaMatches("(display-mode: standalone)") || window.navigator.standalone === true;
}

function normalizedScreenDimension(raw, density, fallback) {
  const value = finitePositive(raw, fallback);
  if (value <= 900) return value;
  return density >= 1.25 ? value / density : fallback;
}

function platformHandheldSignal() {
  const platform = `${navigator.userAgentData?.platform || ""} ${navigator.platform || ""}`;
  return /Android|iPhone|iPad|iPod|Linux arm|Mobile/i.test(platform);
}

function viewportMetrics() {
  const layoutWidth = finitePositive(document.documentElement.clientWidth || window.innerWidth, 1);
  const layoutHeight = finitePositive(document.documentElement.clientHeight || window.innerHeight, 1);
  const visualWidth = finitePositive(window.visualViewport?.width, layoutWidth);
  const density = finitePositive(window.devicePixelRatio, 1);
  const screenWidth = normalizedScreenDimension(window.screen?.width, density, layoutWidth);
  const screenHeight = normalizedScreenDimension(window.screen?.height, density, layoutHeight);
  const physicalShortSide = Math.min(screenWidth, screenHeight);
  const physicalLongSide = Math.max(screenWidth, screenHeight);
  const portrait = layoutHeight >= layoutWidth;
  return {
    layoutWidth,
    layoutHeight,
    visualWidth,
    density,
    screenWidth,
    screenHeight,
    physicalShortSide,
    physicalViewportWidth: portrait ? physicalShortSide : physicalLongSide,
    effectiveWidth: Math.min(layoutWidth, visualWidth),
  };
}

function handheldSignal(view) {
  const userAgent = navigator.userAgent || "";
  const mobileUa = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(userAgent)
    || platformHandheldSignal();
  if (mobileUa) return true;

  const coarsePointer = mediaMatches("(pointer: coarse)") || mediaMatches("(any-pointer: coarse)");
  const finePointer = mediaMatches("(any-pointer: fine)");
  const compactPhysicalScreen = view.physicalShortSide <= HANDHELD_MAX && view.density >= 1.1;
  return Number(navigator.maxTouchPoints || 0) > 1
    && coarsePointer
    && (platformHandheldSignal() || !finePointer || compactPhysicalScreen);
}

function responsiveFamily(view, handheld) {
  if (standalone()) return "application";
  if (handheld && view.physicalShortSide <= PHONE_MAX) return "phone";
  if (handheld) return "mobile";
  if (view.effectiveWidth <= COMPACT_MAX) return "compact";
  if (view.effectiveWidth <= TABLET_MAX) return "tablet";
  return "desktop";
}

function viewportProfile() {
  const view = viewportMetrics();
  const handheld = handheldSignal(view);
  const family = responsiveFamily(view, handheld);
  const desktopSitePhone = handheld && view.layoutWidth > Math.max(TABLET_MAX, view.physicalViewportWidth * 1.35);
  let mode = "desktop";
  if (["application", "phone", "mobile", "compact"].includes(family)) mode = "mobile";
  else if (family === "tablet") mode = "tablet";
  else if (view.effectiveWidth <= 1536) mode = "laptop";

  return {
    ...view,
    mode,
    family,
    handheld,
    desktopSitePhone,
  };
}

function deviceMode() {
  return viewportProfile().mode;
}

function syncDeviceMode() {
  const profile = viewportProfile();
  const root = document.documentElement;
  root.dataset.deviceMode = profile.mode;
  root.dataset.deviceFamily = profile.family;
  root.dataset.physicalPhone = String(profile.family === "phone");
  root.dataset.physicalMobile = String(["application", "phone", "mobile", "compact"].includes(profile.family));
  root.dataset.physicalScreenMobile = String(profile.handheld);
  root.dataset.desktopSitePhone = String(profile.desktopSitePhone);
  root.dataset.desktopLayoutRequested = String(profile.desktopSitePhone);
  root.dataset.desktopCompactPhone = "false";
  root.dataset.orientation = mediaMatches("(orientation: portrait)") ? "portrait" : "landscape";
  root.dataset.pwaRuntime = RELEASE;
  root.dataset.pwaLegacyRelease = LEGACY_RELEASE;
  root.style.setProperty("--sn-browser-scale", "1");
  root.style.setProperty("--sn-layout-width", `${profile.layoutWidth}px`);
  root.style.setProperty("--sn-layout-height", `${profile.layoutHeight}px`);
  root.style.setProperty("--sn-visual-width", `${profile.visualWidth}px`);
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
  const authMode = params.get("auth") || "";
  return location.pathname === "/login"
    || location.pathname === "/signup"
    || location.pathname === "/signin"
    || location.pathname.startsWith("/auth/")
    || params.has("code")
    || authMode === "callback"
    || authMode === "recovery"
    || authMode === "session-expired"
    || authMode === "callback-error";
}

function reloadForNewController(reason = "controllerchange") {
  if (controllerRecoveryStarted || authSurface()) return;
  const url = new URL(window.location.href);
  if (url.searchParams.get(RECOVERY_QUERY) === RECOVERY_VALUE) return;
  try {
    if (sessionStorage.getItem(CONTROLLER_GUARD) === RECOVERY_VALUE) return;
    sessionStorage.setItem(CONTROLLER_GUARD, RECOVERY_VALUE);
    sessionStorage.removeItem(LEGACY_CONTROLLER_GUARD);
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
document.documentElement.dataset.pwaLegacyRecovery = LEGACY_RECOVERY_VALUE;
registerServiceWorker();

export { deviceMode };
