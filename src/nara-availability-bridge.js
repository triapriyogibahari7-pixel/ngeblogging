const RELEASE = "nara-capability-bridge-v10-20260724";
let availability = "pending";
let billingReady = false;
let imageGenerationReady = false;
let retryTimer = 0;
let frame = 0;

document.documentElement.dataset.naraReady = availability;
document.documentElement.dataset.naraBillingReady = "false";
document.documentElement.dataset.naraImageReady = "false";
document.documentElement.dataset.naraCapabilityRelease = RELEASE;

function labelOf(node) {
  return node?.querySelector?.("span")?.textContent?.trim()
    || node?.textContent?.replace(/\s+/g, " ").trim()
    || "";
}

function assistantLaunchers() {
  return [...document.querySelectorAll(
    ".nara-floating-button,.sn-top-actions .sn-nara-button,.sn-home-grid button",
  )].filter((button) => {
    const label = labelOf(button);
    return button.classList.contains("nara-floating-button")
      || label.includes("Tanya Nara")
      || label === "Buka Nara";
  });
}

function reveal(node) {
  node.hidden = false;
  node.removeAttribute("aria-hidden");
  node.style.removeProperty("display");
  node.style.removeProperty("visibility");
  node.style.removeProperty("pointer-events");
  node.style.removeProperty("opacity");
  if ("disabled" in node) node.disabled = false;
  if ("tabIndex" in node && node.tabIndex < 0) node.tabIndex = 0;
}

function preserveAssistantCapabilities() {
  document.documentElement.dataset.naraBillingReady = String(billingReady);
  document.documentElement.dataset.naraImageReady = String(imageGenerationReady);

  // Capabilities remain present in the interface. Readiness controls which
  // provider answers a request; it must never delete models, intelligence
  // levels, camera, image, file, voice, memory, plugin, or QR controls.
  document.querySelectorAll(".nara-select option,.nara-attachment-menu button,.nara-composer input,.nara-quick-prompts button").forEach((node) => {
    node.hidden = false;
    node.removeAttribute("aria-hidden");
    if ("disabled" in node) node.disabled = false;
    node.style.removeProperty("display");
    node.style.removeProperty("visibility");
    node.style.removeProperty("pointer-events");
  });

  document.querySelectorAll(".nara-attachment-menu").forEach((node) => {
    node.dataset.imageProviderReady = String(imageGenerationReady);
  });
}

function scan() {
  document.documentElement.dataset.naraReady = availability;
  document.documentElement.dataset.naraCapabilityRelease = RELEASE;

  assistantLaunchers().forEach((button) => {
    reveal(button);
    button.dataset.naraLauncher = "active";
    button.setAttribute("aria-label", "Buka Nara AI");
    button.setAttribute("title", availability === "ready" ? "Buka Nara AI" : "Buka Nara AI — koneksi akan dicoba otomatis");
  });

  preserveAssistantCapabilities();
}

function scheduleScan() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

function scheduleRetry(delay = 3000) {
  clearTimeout(retryTimer);
  retryTimer = window.setTimeout(resolveAvailability, delay);
}

async function resolveAvailability() {
  clearTimeout(retryTimer);
  try {
    const response = await fetch(`/api/health?nara=${Date.now()}`, {
      cache: "no-store",
      headers: { accept: "application/json", "cache-control": "no-cache" },
    });
    if (!response.ok) throw new Error(`Health ${response.status}`);
    const health = await response.json().catch(() => ({}));
    availability = health.nara === false ? "degraded" : "ready";
    billingReady = health.billing === true;
    imageGenerationReady = health.imageGeneration === true;
  } catch {
    availability = "degraded";
    billingReady = false;
    imageGenerationReady = false;
    scheduleRetry();
  } finally {
    scan();
  }
}

new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("online", resolveAvailability);
window.addEventListener("pageshow", resolveAvailability);
document.addEventListener("visibilitychange", () => { if (!document.hidden) resolveAvailability(); });
scan();
resolveAvailability();
