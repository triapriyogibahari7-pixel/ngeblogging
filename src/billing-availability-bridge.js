let checkoutReady = false;
let resolved = false;
document.documentElement.dataset.billingReady = "pending";

function labelOf(button) {
  return button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "";
}

function billingButtons() {
  return [...document.querySelectorAll(".sn-side button,.sn-mobile-sheet-layer button,.sn-mobile-nav button")]
    .filter((button) => labelOf(button) === "Pembayaran");
}

function homeButton() {
  return [...document.querySelectorAll(".sn-side nav button,.sn-mobile-nav button")]
    .find((button) => ["Ringkasan", "Home"].includes(labelOf(button)));
}

function scan() {
  const buttons = billingButtons();
  if (!resolved) {
    for (const button of buttons) {
      button.style.display = "none";
      button.setAttribute("aria-hidden", "true");
      button.tabIndex = -1;
    }
    return;
  }

  if (checkoutReady) {
    for (const button of buttons) {
      button.style.removeProperty("display");
      button.hidden = false;
      button.setAttribute("aria-hidden", "false");
      button.tabIndex = 0;
    }
    return;
  }

  const billingOpen = Boolean(document.querySelector(".bv-page")) || buttons.some((button) => button.classList.contains("active"));
  if (billingOpen) homeButton()?.click();
  for (const button of buttons) button.remove();
}

async function resolveAvailability() {
  try {
    const response = await fetch("/api/billing/config", {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Billing readiness unavailable");
    const config = await response.json().catch(() => ({}));
    const paypalReady = Boolean(
      config.paypal
      && config.paypalWebhook
      && String(config.paypalEnvironment || "").toLowerCase() === "live",
    );
    const localReady = Boolean(
      config.localGateway
      && Array.isArray(config.plans)
      && config.plans.some((plan) => plan?.local?.amount && plan?.local?.currency),
    );
    checkoutReady = paypalReady || localReady;
  } catch {
    checkoutReady = false;
  } finally {
    resolved = true;
    document.documentElement.dataset.billingReady = String(checkoutReady);
    scan();
  }
}

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
scan();
resolveAvailability();
