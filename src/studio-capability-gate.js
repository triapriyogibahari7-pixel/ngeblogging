const state = {
  billingActive: false,
  imageGeneration: false,
  loaded: false,
};

function buttonByLabel(root, label) {
  return [...root.querySelectorAll("button")].find((button) => button.textContent.trim() === label) || null;
}

function apply() {
  document.documentElement.dataset.billingActive = String(state.billingActive);
  document.documentElement.dataset.naraImagesActive = String(state.imageGeneration);

  document.querySelectorAll(".sn-side nav button,.sn-mobile-sheet-layer button").forEach((button) => {
    if (button.textContent.trim() === "Pembayaran") button.hidden = !state.billingActive;
  });

  if (!state.billingActive && document.querySelector(".bv-page")) {
    buttonByLabel(document, "Ringkasan")?.click();
  }

  document.querySelectorAll(".nw-tabs button").forEach((button) => {
    if (button.textContent.trim() === "Images") button.hidden = !state.imageGeneration;
  });

  if (!state.imageGeneration && document.querySelector(".nw-image-studio")) {
    buttonByLabel(document.querySelector(".nw-tabs") || document, "Projects")?.click();
  }
}

async function loadCapabilities() {
  try {
    const [healthResponse, billingResponse] = await Promise.all([
      fetch("/api/health", { cache: "no-store", credentials: "same-origin" }),
      fetch("/api/billing/config", { cache: "no-store", credentials: "same-origin" }),
    ]);
    const health = healthResponse.ok ? await healthResponse.json() : {};
    const billing = billingResponse.ok ? await billingResponse.json() : {};
    const livePayPal = Boolean(billing.paypal && billing.paypalWebhook && String(billing.paypalEnvironment).toLowerCase() === "live");
    state.billingActive = Boolean(livePayPal || billing.localGateway);
    state.imageGeneration = Boolean(health.imageGeneration);
  } catch {
    state.billingActive = false;
    state.imageGeneration = false;
  } finally {
    state.loaded = true;
    apply();
  }
}

const observer = new MutationObserver(apply);
observer.observe(document.documentElement, { childList: true, subtree: true });
loadCapabilities();
