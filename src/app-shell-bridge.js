let installPrompt = null;
let installButton = null;
let registration = null;

function deviceMode() {
  const width = window.innerWidth;
  if (width <= 600) return "mobile";
  if (width <= 1024) return "tablet";
  if (width <= 1440) return "laptop";
  return "desktop";
}

function syncDeviceMode() {
  document.documentElement.dataset.deviceMode = deviceMode();
  document.documentElement.dataset.orientation = window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function supportedHost() {
  const hostname = location.hostname.toLowerCase();
  return hostname === "ngeblogging.com" || hostname === "www.ngeblogging.com" || hostname.endsWith(".workers.dev") || ["localhost", "127.0.0.1"].includes(hostname);
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
        if (worker.state === "installed" && navigator.serviceWorker.controller) document.documentElement.dataset.appUpdate = "ready";
      });
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
window.matchMedia("(orientation: portrait)").addEventListener?.("change", syncDeviceMode);

const observer = new MutationObserver(() => ensureInstallButton());
observer.observe(document.documentElement, { childList: true, subtree: true });

syncDeviceMode();
setNetworkState();
document.documentElement.dataset.installed = String(isStandalone());
registerServiceWorker();
