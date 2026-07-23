let checkoutReady = false;
let resolved = false;

async function resolveAvailability() {
  try {
    const response = await fetch("/api/billing/config", { headers: { accept: "application/json" } });
    const config = await response.json().catch(() => ({}));
    const paypalReady = Boolean(config.paypal && config.paypalWebhook && String(config.paypalEnvironment || "").toLowerCase() === "live");
    checkoutReady = paypalReady || Boolean(config.localGateway);
  } catch {
    checkoutReady = false;
  } finally {
    resolved = true;
    scan();
  }
}

function billingButtons() {
  return [...document.querySelectorAll(".sn-side nav button,.sn-mobile-sheet-layer button")]
    .filter((button) => button.querySelector("span")?.textContent?.trim() === "Pembayaran");
}

function scan() {
  if (!resolved) return;
  for (const button of billingButtons()) {
    button.hidden = !checkoutReady;
    button.setAttribute("aria-hidden", String(!checkoutReady));
    button.tabIndex = checkoutReady ? 0 : -1;
    if (!checkoutReady && button.classList.contains("active")) {
      const home = [...document.querySelectorAll(".sn-side nav button")].find((item) => item.querySelector("span")?.textContent?.trim() === "Ringkasan");
      home?.click();
    }
  }
}

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
resolveAvailability();
