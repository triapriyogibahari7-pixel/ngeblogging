let installPrompt = null;
let installButton = null;
let registration = null;

function mobileUserAgent() {
  if (navigator.userAgentData?.mobile === true) return true;
  return /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "");
}

function coarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(any-pointer: coarse)").matches;
}

function physicalShortSide() {
  const values = [window.screen?.width, window.screen?.height]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : window.innerWidth;
}

function deviceMode() {
  const width = window.innerWidth;
  const phoneLike = mobileUserAgent() || width <= 760 || (coarsePointer() && physicalShortSide() <= 760);
  if (phoneLike) return "mobile";
  if (width <= 1024) return "tablet";
  if (width <= 1440) return "laptop";
  return "desktop";
}

function syncDeviceMode() {
  const mode = deviceMode();
  const previous = document.documentElement.dataset.deviceMode;
  document.documentElement.dataset.deviceMode = mode;
  document.documentElement.dataset.orientation = window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
  document.documentElement.dataset.pointer = coarsePointer() ? "coarse" : "fine";
  if (previous && previous !== mode) {
    window.dispatchEvent(new CustomEvent("ngeblogging:device-mode", { detail: { mode, previous } }));
  }
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function supportedHost() {
  const hostname = location.hostname.toLowerCase();
  if (["localhost", "127.0.0.1"].includes(hostname)) return true;
  return hostname === "ngeblogging.com" || hostname === "www.ngeblogging.com" || hostname.endsWith(".ngeblogging.com");
}

function setNetworkState() {
  document.documentElement.dataset.network = navigator.onLine ? "online" : "offline";
  document.querySelectorAll(".sn-cloud").forEach((node) => {
    node.title = navigator.onLine ? "Perangkat terhubung ke jaringan" : "Perangkat sedang offline; perubahan cloud menunggu koneksi";
  });
}

function ensureInstallButton() {
  if (!installPrompt || isStandalone()) return;
  const actions = document.querySelector(".sn-top-actions");
  if (!actions) return;
  if (actions.querySelector(".sn-install-app")) return;
  installButton = document.createElement("button");
  installButton.type = "button";
  installButton.className = "sn-install-app";
  installButton.setAttribute("aria-label", "Pasang aplikasi Ngeblogging");
  installButton.setAttribute("title", "Pasang aplikasi Ngeblogging");
  installButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><rect width="18" height="5" x="3" y="17" rx="2"/></svg><span>Pasang aplikasi</span>`;
  installButton.addEventListener("click", async () => {
    const prompt = installPrompt;
    if (!prompt) return;
    installButton.disabled = true;
    await prompt.prompt();
    await prompt.userChoice.catch(() => null);
    installPrompt = null;
    installButton.remove();
    installButton = null;
  });
  const avatar = actions.querySelector(".sn-avatar");
  actions.insertBefore(installButton, avatar || null);
}

async function registerServiceWorker() {
  if (!supportedHost() || !("serviceWorker" in navigator) || location.protocol !== "https:" && location.hostname !== "localhost") return;
  try {
    registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    registration.update().catch(() => null);
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          document.documentElement.dataset.appUpdate = "ready";
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Do not reload immediately. A forced reload can cancel login, editor,
      // sidebar, attachment, or Nara clicks. The new worker controls the next
      // navigation naturally, while the current interaction remains intact.
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
  installButton?.remove();
  installButton = null;
  document.documentElement.dataset.installed = "true";
});

window.addEventListener("online", setNetworkState);
window.addEventListener("offline", setNetworkState);
window.addEventListener("resize", syncDeviceMode, { passive: true });
window.addEventListener("orientationchange", syncDeviceMode, { passive: true });
window.matchMedia("(orientation: portrait)").addEventListener?.("change", syncDeviceMode);
window.matchMedia("(pointer: coarse)").addEventListener?.("change", syncDeviceMode);

const observer = new MutationObserver(() => ensureInstallButton());
observer.observe(document.getElementById("root") || document.documentElement, { childList: true, subtree: true });

syncDeviceMode();
setNetworkState();
document.documentElement.dataset.installed = String(isStandalone());
registerServiceWorker();
