let checkoutReady = false;
let resolving = false;
let retryTimer = 0;
const root = document.documentElement;
root.dataset.billingReady = "pending";

function labelOf(button) {
  return button.querySelector("span")?.textContent?.trim() || button.textContent?.replace(/\s+/g, " " ).trim() || "";
}

function managedButtons() {
  return [...document.querySelectorAll(".sn-side button,.sn-mobile-sheet-layer button,.sn-mobile-nav button,.nara-context-bar button,.nara-upgrade-modal button,.nara-upgrade-card button")]
    .filter((button) => labelOf(button) === "Pembayaran" || /^(upgrade pro|tingkatkan|berlangganan|checkout)/i.test(labelOf(button)));
}

function scan() {
  for (const button of managedButtons()) {
    // Navigation is available even when checkout is unavailable. BillingView gates checkout.
    if (button.hidden || button.getAttribute("aria-hidden") === "true" || button.style.display === "none") {
      button.style.removeProperty("display");
      button.hidden = false;
      button.disabled = false;
      button.removeAttribute("aria-hidden");
      button.tabIndex = 0;
    }
  }
}

async function resolveAvailability() {
  if (resolving) return;
  resolving = true;
  clearTimeout(retryTimer);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("/api/billing/config", {
      cache: "no-store", signal: controller.signal, headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Billing readiness unavailable");
    const config = await response.json();
    const paypalReady = Boolean(config.paypal && config.paypalWebhook && String(config.paypalEnvironment || "").toLowerCase() === "live");
    const localReady = Boolean(config.localGateway && Array.isArray(config.plans) && config.plans.some((plan) => Number(plan?.local?.amount) > 0 && plan?.local?.currency));
    checkoutReady = paypalReady || localReady;
    root.dataset.billingReady = String(checkoutReady);
  } catch {
    checkoutReady = false;
    root.dataset.billingReady = "unavailable";
    retryTimer = setTimeout(resolveAvailability, 30000);
  } finally {
    clearTimeout(timer);
    resolving = false;
    scan();
  }
}

const observer = new MutationObserver(scan);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("online", resolveAvailability);
window.addEventListener("pageshow", resolveAvailability);
window.addEventListener("ngeblogging:billing-refresh", resolveAvailability);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") resolveAvailability();
});
scan();
resolveAvailability();
