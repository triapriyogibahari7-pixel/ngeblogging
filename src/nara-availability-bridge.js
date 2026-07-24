let availability = "pending";
let billingReady = false;
let imageGenerationReady = false;
let retryTimer = 0;
document.documentElement.dataset.naraReady = availability;
document.documentElement.dataset.naraBillingReady = "false";
document.documentElement.dataset.naraImageReady = "false";

function labelOf(node) {
  return node?.querySelector?.("span")?.textContent?.trim() || node?.textContent?.replace(/\s+/g, " ").trim() || "";
}

function naraControls() {
  return [...document.querySelectorAll(".sn-side button,.sn-top-actions button,.sn-home-grid button")]
    .filter((button) => {
      const label = labelOf(button);
      return label === "Nara AI" || label.includes("Tanya Nara") || label === "Buka Nara";
    });
}

function homeButton() {
  return [...document.querySelectorAll(".sn-side nav button")]
    .find((button) => labelOf(button) === "Ringkasan");
}

function conceal(node) {
  node.style.display = "none";
  node.hidden = true;
  if ("disabled" in node) node.disabled = true;
  node.setAttribute("aria-hidden", "true");
  if ("tabIndex" in node) node.tabIndex = -1;
}

function reveal(node) {
  node.style.removeProperty("display");
  node.hidden = false;
  if ("disabled" in node) node.disabled = false;
  node.setAttribute("aria-hidden", "false");
  if ("tabIndex" in node) node.tabIndex = 0;
}

function removeInactiveOptions(select, allowedValues, fallback) {
  [...select.options].forEach((option) => {
    if (!allowedValues.has(option.value)) option.remove();
  });
  if (!allowedValues.has(select.value)) {
    select.value = fallback;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function enforceActiveNaraCapabilities() {
  document.documentElement.dataset.naraBillingReady = String(billingReady);
  document.documentElement.dataset.naraImageReady = String(imageGenerationReady);

  if (!billingReady) {
    document.querySelectorAll(".nara-upgrade-card,.nara-context-bar button").forEach(conceal);
    document.querySelectorAll('.nara-select.intelligence select').forEach((select) => removeInactiveOptions(select, new Set(["light", "standard"]), "standard"));
    document.querySelectorAll('.nara-select.model select').forEach((select) => removeInactiveOptions(select, new Set(["nara-mini"]), "nara-mini"));
    document.querySelectorAll(".nara-select option").forEach((option) => {
      option.textContent = option.textContent.replace(/\s*·\s*Pro\s*$/i, "");
    });
  }

  if (!imageGenerationReady) {
    document.querySelectorAll(".nara-attachment-menu button").forEach((button) => {
      const label = labelOf(button);
      if (label.startsWith("Kamera") || label.startsWith("Foto")) conceal(button);
    });
    document.querySelectorAll('.nara-composer input[accept^="image/"]').forEach((input) => {
      input.disabled = true;
    });
    document.querySelectorAll(".nara-quick-prompts button").forEach((button) => {
      if (labelOf(button) === "Jelaskan gambar") button.textContent = "Susun outline";
    });
  }
}

function scan() {
  const controls = naraControls();
  if (availability === "unavailable") {
    controls.forEach(conceal);
    if (document.querySelector(".nw-page") || controls.some((button) => button.classList.contains("active"))) homeButton()?.click();
    return;
  }
  controls.forEach(reveal);
  enforceActiveNaraCapabilities();
}

function scheduleRetry(delay = 2500) {
  clearTimeout(retryTimer);
  retryTimer = window.setTimeout(resolveAvailability, delay);
}

async function resolveAvailability() {
  clearTimeout(retryTimer);
  try {
    const response = await fetch(`/api/health?nara=${Date.now()}`, { cache: "no-store", headers: { accept: "application/json", "cache-control": "no-cache" } });
    if (!response.ok) throw new Error("Nara readiness unavailable");
    const health = await response.json().catch(() => ({}));
    availability = health.nara === false ? "unavailable" : "ready";
    billingReady = health.billing === true;
    imageGenerationReady = health.imageGeneration === true;
  } catch {
    availability = "unknown";
    billingReady = false;
    imageGenerationReady = false;
    scheduleRetry(3000);
  } finally {
    document.documentElement.dataset.naraReady = availability;
    scan();
  }
}

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("online", resolveAvailability);
document.addEventListener("visibilitychange", () => { if (!document.hidden) resolveAvailability(); });
scan();
resolveAvailability();
