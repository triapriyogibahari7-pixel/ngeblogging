const RELEASE = "production-entry-browser-v154-20260730";
const CONTROLLER_GUARD = "ngeblogging-pwa-controller-v154";
const LEGACY_GUARDS = [
  "ngeblogging-pwa-controller-v153",
  "ngeblogging-pwa-controller-v151",
];
const RECOVERY_VALUE = "production-entry-v154";

function systemHost() {
  const hostname = window.location.hostname.toLowerCase();
  return hostname === "ngeblogging.com" || hostname === "www.ngeblogging.com";
}

function authSurface(url = new URL(window.location.href)) {
  const mode = url.searchParams.get("auth") || "";
  return ["/login", "/signin", "/signup"].includes(url.pathname)
    || url.pathname.startsWith("/auth/")
    || url.searchParams.has("code")
    || ["signin", "signup", "callback", "recovery", "session-expired", "callback-error"].includes(mode);
}

function clearLegacyGuards() {
  try {
    for (const key of LEGACY_GUARDS) sessionStorage.removeItem(key);
  } catch {
    // Storage browser yang dibatasi tidak boleh memblokir pemulihan halaman.
  }
}

function reloadOnce(reason) {
  const url = new URL(window.location.href);
  if (authSurface(url) || url.searchParams.get("ngeblogging_release") === RECOVERY_VALUE) return;
  try {
    if (sessionStorage.getItem(CONTROLLER_GUARD) === RECOVERY_VALUE) return;
    sessionStorage.setItem(CONTROLLER_GUARD, RECOVERY_VALUE);
  } catch {
    // Query URL tetap menjadi guard ketika sessionStorage tidak tersedia.
  }
  url.searchParams.set("ngeblogging_release", RECOVERY_VALUE);
  url.searchParams.set("recovery_reason", reason || RELEASE);
  window.location.replace(url.href);
}

async function verifyProductionEntry() {
  if (!systemHost()) return;
  try {
    const response = await fetch(`/release-v154.json?audit=${Date.now()}`, {
      cache: "no-store",
      headers: { accept: "application/json", "cache-control": "no-cache" },
    });
    const payload = response.ok ? await response.json() : null;
    document.documentElement.dataset.productionEntryV154 = payload?.release === "2026.07.30-production-entry-v154"
      ? "verified"
      : "unverified";
  } catch {
    document.documentElement.dataset.productionEntryV154 = "network-deferred";
  }
}

if (typeof window !== "undefined" && systemHost()) {
  clearLegacyGuards();
  document.documentElement.dataset.productionEntryBrowser = RELEASE;

  navigator.serviceWorker?.addEventListener("message", (event) => {
    const version = String(event.data?.version || "");
    const release = String(event.data?.release || "");
    if (event.data?.type === "NGE_BLOGGING_FORCE_RELOAD_V77"
      && (version.includes("v154") || release.includes("v154"))) {
      reloadOnce(event.data.reason || "service-worker-v154");
    }
  });

  window.addEventListener("pageshow", verifyProductionEntry, { passive: true });
  verifyProductionEntry();
}

export { RELEASE, authSurface, reloadOnce, verifyProductionEntry };
