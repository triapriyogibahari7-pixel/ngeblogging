const RELEASE = "ngeblogging-pwa-v140-20260729";
const RECOVERY_QUERY = "ngeblogging_recovery";
const RECOVERY_VALUE = "pwa-v140-sidebar-auth";
const CONTROLLER_GUARD = "ngeblogging-pwa-controller-v140";
const ROOT = document.getElementById("root") || document.documentElement;

let installPrompt = null;
let installButton = null;
let scanFrame = 0;
let recoveryStarted = false;

function viewportMode() {
  const width = Math.max(1, Number(window.innerWidth) || 1);
  if (width <= 760) return "mobile";
  if (width <= 1100) return "tablet";
  if (width <= 1440) return "laptop";
  return "desktop";
}

function syncRuntime() {
  const root = document.documentElement;
  root.dataset.deviceMode = viewportMode();
  root.dataset.orientation = window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
  root.dataset.pwaRuntime = RELEASE;
  root.style.setProperty("--sn-layout-width", `${Math.max(1, window.innerWidth)}px`);
  root.style.setProperty("--sn-layout-height", `${Math.max(1, window.innerHeight)}px`);
}

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function supportedHost() {
  const hostname = location.hostname.toLowerCase();
  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || hostname === "localhost"
    || hostname === "127.0.0.1";
}

function sensitiveAuthCallback() {
  const params = new URLSearchParams(location.search);
  return params.has("code")
    || params.get("auth") === "callback"
    || params.get("auth") === "recovery";
}

function reloadForNewController(reason = "controllerchange") {
  if (recoveryStarted || sensitiveAuthCallback()) return;
  const url = new URL(location.href);
  if (url.searchParams.get(RECOVERY_QUERY) === RECOVERY_VALUE) return;
  try {
    if (sessionStorage.getItem(CONTROLLER_GUARD) === RECOVERY_VALUE) return;
    sessionStorage.setItem(CONTROLLER_GUARD, RECOVERY_VALUE);
  } catch {
    // The URL guard still prevents a reload loop when storage is unavailable.
  }
  recoveryStarted = true;
  url.searchParams.set(RECOVERY_QUERY, RECOVERY_VALUE);
  url.searchParams.set("recovery_reason", reason);
  location.replace(url.href);
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
  if (!supportedHost() || !("serviceWorker" in navigator)) return;
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
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
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
  removeInstallButton();
});
window.addEventListener("resize", syncRuntime, { passive: true });
window.addEventListener("orientationchange", syncRuntime, { passive: true });
window.addEventListener("pageshow", syncRuntime, { passive: true });
window.visualViewport?.addEventListener("resize", syncRuntime, { passive: true });
new MutationObserver(scheduleInstallButton).observe(ROOT, { childList: true, subtree: true });

syncRuntime();
document.documentElement.dataset.installed = String(standalone());
registerServiceWorker();
