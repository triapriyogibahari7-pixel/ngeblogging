const state = {
  billingActive: false,
  naraActive: false,
  imageGeneration: false,
  analyticsActive: false,
  integrationsActive: false,
  loaded: false,
};

function buttonByLabel(root, label) {
  if (!root) return null;
  return [...root.querySelectorAll("button")].find((button) => button.textContent.trim() === label) || null;
}

function hideByLabel(selector, label, hidden) {
  document.querySelectorAll(selector).forEach((button) => {
    if (button.textContent.trim() === label) button.hidden = hidden;
  });
}

function redirectUnavailableView() {
  const unavailable = (!state.billingActive && document.querySelector(".bv-page"))
    || (!state.naraActive && document.querySelector(".nw-page"))
    || (!state.analyticsActive && document.querySelector(".sn-info-grid"));
  if (unavailable) buttonByLabel(document, "Ringkasan")?.click();
}

function apply() {
  const root = document.documentElement;
  root.dataset.billingActive = String(state.billingActive);
  root.dataset.naraActive = String(state.naraActive);
  root.dataset.naraImagesActive = String(state.imageGeneration);
  root.dataset.analyticsActive = String(state.analyticsActive);
  root.dataset.integrationsActive = String(state.integrationsActive);

  hideByLabel(".sn-side nav button,.sn-mobile-sheet-layer button", "Pembayaran", !state.billingActive);
  hideByLabel(".sn-side nav button,.sn-mobile-sheet-layer button", "Nara AI", !state.naraActive);
  hideByLabel(".sn-side nav button,.sn-mobile-sheet-layer button", "Analitik", !state.analyticsActive);

  document.querySelectorAll(".sn-nara-button,.nara-floating-button").forEach((button) => { button.hidden = !state.naraActive; });
  document.querySelectorAll(".sn-home-grid>aside").forEach((card) => { card.hidden = !state.naraActive; });
  document.querySelectorAll(".sn-home-grid").forEach((grid) => grid.classList.toggle("nara-unavailable", !state.naraActive));

  document.querySelectorAll(".nw-tabs button").forEach((button) => {
    const label = button.textContent.trim();
    if (label === "Images") button.hidden = !state.imageGeneration;
    if (label === "Plugins") button.hidden = !state.integrationsActive;
  });

  if (!state.imageGeneration && document.querySelector(".nw-image-studio")) buttonByLabel(document.querySelector(".nw-tabs"), "Projects")?.click();
  if (!state.integrationsActive && document.querySelector(".nw-plugins")) buttonByLabel(document.querySelector(".nw-tabs"), "Projects")?.click();
  redirectUnavailableView();
}

async function loadCapabilities() {
  apply();
  try {
    const [healthResponse, billingResponse] = await Promise.all([
      fetch("/api/health", { cache: "no-store", credentials: "same-origin" }),
      fetch("/api/billing/config", { cache: "no-store", credentials: "same-origin" }),
    ]);
    const health = healthResponse.ok ? await healthResponse.json() : {};
    const billing = billingResponse.ok ? await billingResponse.json() : {};
    const livePayPal = Boolean(billing.paypal && billing.paypalWebhook && String(billing.paypalEnvironment).toLowerCase() === "live");
    state.billingActive = Boolean(health.billing && (livePayPal || billing.localGateway));
    state.naraActive = Boolean(health.nara);
    state.imageGeneration = Boolean(health.imageGeneration);
    state.analyticsActive = Boolean(health.analytics);
    state.integrationsActive = Boolean(health.integrations);
  } catch {
    state.billingActive = false;
    state.naraActive = false;
    state.imageGeneration = false;
    state.analyticsActive = false;
    state.integrationsActive = false;
  } finally {
    state.loaded = true;
    apply();
  }
}

const observer = new MutationObserver(apply);
observer.observe(document.documentElement, { childList: true, subtree: true });
loadCapabilities();
